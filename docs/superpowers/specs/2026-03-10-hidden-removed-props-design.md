# Design: `hidden` and `removed` Reactive Props

**Date:** 2026-03-10

## Summary

Add two new reactive props to all Enforma components that control whether a component is visible and whether it participates in the form model.

- `hidden` — visually conceals the component; the bound value is preserved in the store; validation is skipped.
- `removed` — fully removes the component from the tree; the bound value is deleted from the store; validation is skipped.

The framework analogy is Vue's `v-show` (`hidden`) vs `v-if` (`removed`).

---

## Props

Both props are `Reactive<boolean>` — they accept a static boolean or a function `(scopeValues, allValues) => boolean`, consistent with all other reactive props in Enforma.

```ts
hidden?: Reactive<boolean>;
removed?: Reactive<boolean>;
```

**Added to:** `CommonProps`, `CalculatedProps`, `OutputProps`, `FieldsetProps`, and `ListProps`.

### Behaviour when `hidden=true`
- Component renders `null` (no DOM output).
- The bound value is kept in the store unchanged.
- Validators are not registered / are deregistered. Hidden fields never block form submission.
- Value survives a hide/show cycle — when `hidden` returns to `false`, the previously stored value reappears.

### Behaviour when `removed=true`
- Component renders `null`.
- The bound value is **deleted** from the store (`store.deleteField(fullPath)`).
- Validators are not registered / are deregistered.
- When `removed` returns to `false`, the component re-mounts fresh with no value (or `initialValues` default).
- If both `hidden` and `removed` are true, `removed` takes precedence.

---

## Implementation

### `FormStore.deleteField(path: string)`

New method on `FormStore` that removes a key from the values tree by deleting the final object key at the given dotted path (e.g. `"address.city"` removes the `city` key from the `address` object). Does not splice arrays — `deleteField("items")` removes the entire `items` key from its parent object, which is the expected usage for List. Notifies subscribers after deletion. Must handle missing paths gracefully (no-op, no error).

### `useVisibility` hook

New hook, co-located in `hooks/useField.ts`:

```ts
function useVisibility(
  bind: string | undefined,
  hidden: Reactive<boolean> | undefined,
  removed: Reactive<boolean> | undefined,
): { isHidden: boolean; isRemoved: boolean }
```

`fullPath` is derived as `joinPath(prefix, bind)` when `bind` is defined, or `undefined` when `bind` is undefined. No deletion is attempted when `fullPath` is undefined.

**Responsibilities:**
1. Resolves `hidden` and `removed` via the existing `useReactiveProp` pattern (subscribes to the store).
2. Runs a `useEffect` that calls `store.deleteField(fullPath)` when `removed` transitions to `true`.
3. Runs a cleanup effect that **re-evaluates `removed` from the current store snapshot** on unmount — this handles the race condition where a parent component (e.g. a Fieldset without `bind`) unmounts a child before the child can re-render with its own `removed=true` state (see Edge Cases). This cleanup applies equally to all callers of `useVisibility` (Fieldset, List, Calculated, and dispatch functions).
4. Returns `{ isHidden: boolean, isRemoved: boolean }` (both default to `false`).

`removed` is stored in a ref (updated every render) so the cleanup effect can read the latest value without including it in the dependency array — avoiding unnecessary effect re-registration on every reactive change.

### Integration into `useFieldProps`

`useFieldProps` calls `useVisibility` internally. It:
- Passes `isHidden || isRemoved` to `useFieldValidation` as a `skip` flag — when true, the validator is not registered (or is deregistered).
- Includes `hidden: boolean` and `removed: boolean` in the returned resolved object so custom component authors can check them.

`hidden` and `removed` are added to `ResolvedCommonProps`. **Note for adapter authors:** these props must be stripped before spreading resolved props onto DOM elements to avoid React unknown-prop warnings (e.g. `const { hidden, removed, ...domProps } = resolved`).

### Dispatch functions

Each dispatch function (TextInputDispatch, SelectDispatch, etc.) already calls `useFieldProps`. After all hooks are called (React rules of hooks require unconditional hook calls), the dispatch returns `null` if `hidden || removed`:

```tsx
const resolved = useFieldProps<ResolvedTextInputProps>(props);
if (resolved.hidden || resolved.removed) return null;
// ... render
```

**`ResolvedFieldsetProps` and `ResolvedListProps`** do not include `hidden` or `removed` — those adapters never render when the prop is true (the dispatch returns `null` first), so there is nothing for the adapter to inspect.

### Non-field components (Fieldset, List, Calculated, Output)

These do not use `useFieldProps`. Their dispatch functions call `useVisibility` directly:

- **Fieldset** — passes its `bind` (if present) so the whole nested scope is deleted on `removed`. If no `bind`, deletion relies on children handling their own cleanup (see Edge Cases).
- **List** — passes its `bind`; `removed=true` deletes the entire array from the store.
- **Calculated** — passes its optional `bind`. When `removed=true`, `useVisibility` returns `isRemoved=true`, the dispatch returns `null`, and the existing `useEffect` that writes the computed value to the store is skipped (it guards on `bind != null` already). If `bind` is present, `store.deleteField` removes the last written value.
- **Output** — passes `bind: undefined`; `removed` and `hidden` just suppress rendering, no store cleanup.

### Custom components

Custom component authors using `useFieldProps` receive `hidden` and `removed` in the resolved props and are responsible for the conditional return:

```tsx
function MyField(props: MyFieldProps) {
  const resolved = useFieldProps<MyFieldResolved>(props);
  if (resolved.hidden || resolved.removed) return null;
  return <div>{resolved.value}</div>;
}
```

The store cleanup for `removed` happens inside `useFieldProps` (via `useVisibility`) regardless of the early return, because all hooks run before the conditional.

---

## Edge Cases

### Fieldset with `bind` + children both have `removed=true`

When a Fieldset with `bind` is removed, `store.deleteField(fieldsetBind)` removes the entire nested object. Child fields also run their own `useVisibility` cleanup effects, which attempt to delete their own paths — these are no-ops since the parent key no longer exists. `deleteField` must handle missing paths gracefully (no-op, no error).

### Fieldset (no bind) + children share the same `removed` expression

**Problem:** React renders parent-first. When Fieldset renders with `removed=true` and returns `null`, children are unmounted before they can re-render with their own `removed=true`. Their cleanup effects run with stale `isRemoved=false`, so `store.deleteField` is never called for the children's values.

**Fix:** The cleanup effect in `useVisibility` re-evaluates the `removed` expression from the **current store snapshot** at unmount time:

```ts
useEffect(() => {
  return () => {
    if (!fullPath || removedProp === undefined) return;
    const allValues = store.getSnapshot(); // current, not stale
    const scopeValues = resolveScope(store, prefix);
    const currentRemoved = typeof removedProp === 'function'
      ? removedProp(scopeValues, allValues)
      : removedProp;
    if (currentRemoved) store.deleteField(fullPath);
  };
}, [store, fullPath, prefix]);
```

Because `store.getSnapshot()` always returns the latest values, the child correctly sees `removed=true` at unmount time even though it never re-rendered.

### `removed` → `false` after being `true`

The field re-mounts and behaves like a first mount. If the form's `initialValues` included a value for this field's bind path, that value will **not** be present (it was deleted from the store when `removed` became true). The field starts empty. This is intentional — `removed` is a runtime condition, not a reset mechanism.

### `removed` without `bind`

No store deletion attempted. Component just returns `null`.

### `hidden` and `removed` both `true`

`removed` takes precedence — the value is deleted from the store.

### `store.isValid()` with hidden/removed fields

Since validators are deregistered when `hidden` or `removed` is true, `store.isValid()` naturally excludes those fields. No special handling needed.

---

## Scope

All field components (via `CommonProps`): TextInput, Textarea, Select, Checkbox, Switch, NumberInput, DatePicker, TimePicker, DateTimePicker, RadioGroup, Autocomplete, ExclusiveToggle.

Also: Calculated, Output, Fieldset, List.

---

## Testing

- `FormStore.deleteField`: nested path deletion, array path deletion, notifies subscribers.
- `useVisibility`: resolves reactive props correctly; deletes from store when `removed=true`; no deletion when `hidden=true`; cleanup on unmount re-evaluates from store.
- `useFieldProps`: validator not registered when `hidden=true`; validator deregistered when `removed=true`; `hidden`/`removed` present in returned resolved props.
- Integration — field component:
  - Value survives `hidden` toggle (set value → hide → unhide → value present).
  - Value deleted when `removed=true`.
  - Form `isValid()` not blocked by hidden or removed fields with failing validators.
- Integration — Fieldset (no bind) + children with same `removed` expression:
  - When expression becomes `true`: all children's store values are deleted.
  - When expression becomes `false`: children re-mount with no value.
