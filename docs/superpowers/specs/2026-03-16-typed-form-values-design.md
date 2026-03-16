# Typed Form Values Design

**Date:** 2026-03-16
**Status:** Approved

## Problem

`FormValues = Record<string, unknown>` flows through the entire library. Users get `unknown` in `onSubmit`, `onChange`, reactive prop functions, and `validate` callbacks. TypeScript provides no help inside or at the boundary of a form.

## Goals

- Type `onSubmit` and `onChange` at the `Form` boundary
- Provide generic infrastructure for typed reactive props and `validate` (auto-propagation deferred to a future TypeScript/React mechanism)
- No factory pattern, no per-field generic annotation required for common cases

## Non-Goals

- Full dot-path inference for `bind` strings
- Automatic type propagation into `children: ReactNode` (deferred)
- Runtime validation or schema integration

---

## `LooseValues<T>` utility type

Intermediate form state is not guaranteed to match `TValues`. Date fields store partial strings during typing; any field may be `undefined` before the user interacts with it. `LooseValues<T>` represents what the store actually holds:

```ts
type LooseValues<T> = {
  [K in keyof T]?: T[K] extends Date
    ? Date | string | null | undefined
    : T[K] extends (infer U)[]
    ? (U extends Date ? Date | string | null | undefined : LooseValues<U>)[]
    : T[K] extends object
    ? LooseValues<T[K]>
    : T[K] | null | undefined;
};
```

The `Array` branch must come before the general `object` branch since arrays extend object. Without it, array fields recurse incorrectly over numeric index keys. The array branch also handles `Date[]` explicitly — without it, `LooseValues<Date>` would recurse into the Date object's own keys instead of producing `Date | string | null | undefined`. For primitive arrays (e.g., `string[]`), `LooseValues<string>` falls to the leaf branch and produces `(string | null | undefined)[]` — intentionally loose, consistent with the philosophy that `LooseValues<T>` widens all values.

`null` is included in leaf branches because `store.setField` accepts `unknown`, meaning `null` is a legal store value today. Omitting `null` would make `store.getSnapshot() as LooseValues<TValues>` silently incorrect at runtime for null-valued fields.

`LooseValues<T>` is used wherever the form might be in an intermediate state. `TValues` is used only where validity is guaranteed by the discriminant.

---

## `Reactive<T, TScope, TAllValues>`

```ts
// Before
type Reactive<T> = T | ((scopeValues: FormValues, allValues: FormValues) => T);

// After
type Reactive<
  T,
  TScope extends FormValues = FormValues,
  TAllValues extends FormValues = FormValues,
> = T | ((scopeValues: TScope, allValues: TAllValues) => T);
```

Both `TScope` and `TAllValues` default to `FormValues` independently. Defaulting `TAllValues` to `TScope` would be misleading for scoped fields — a user providing only `TScope = Address` would incorrectly get `allValues: Address` instead of the full form type. Using `FormValues` as the default for both means untyped usage is unchanged and annotated usage is explicit.

Default type params preserve existing behavior. The generic slots exist so future TypeScript/React propagation mechanisms can wire up `TScope` and `TAllValues` from the surrounding `Form` or `Scope` context without any API change.

---

## `CommonProps<TScope, TAllValues>`

```ts
type CommonProps<
  TScope extends FormValues = FormValues,
  TAllValues extends FormValues = FormValues,
> = {
  bind: string;
  label?: Reactive<string, TScope, TAllValues>;
  disabled?: Reactive<boolean, TScope, TAllValues>;
  placeholder?: Reactive<string, TScope, TAllValues>;
  id?: string;
  description?: Reactive<string, TScope, TAllValues>;
  validate?: (value: unknown, scopeValues: TScope, allValues: TAllValues) => string | null;
  messages?: Partial<Record<string, string>>;
  required?: Reactive<boolean, TScope, TAllValues>;
  hidden?: Reactive<boolean, TScope, TAllValues>;
  removed?: Reactive<boolean, TScope, TAllValues>;
};
```

All field prop types that extend `CommonProps` gain the same two type params with the same defaults: `TextInputProps`, `TextareaProps`, `SelectProps`, `CheckboxProps`, `SwitchProps`, `NumberInputProps`, `DatePickerProps`, `TimePickerProps`, `DateTimePickerProps`, `RadioGroupProps`, `AutocompleteProps`, `ExclusiveToggleProps`. `FieldsetProps` also gains `TScope`/`TAllValues` on its `hidden` and `removed` props (it does not extend `CommonProps` but uses `Reactive<boolean>` directly).

`CalculatedProps<T>` and `OutputProps` use `Reactive` on their own props (`value`, `hidden`, `removed`, `label`, `description`, `disabled`). These also gain `TScope`/`TAllValues` params following the same pattern, so users can annotate reactive callbacks in calculated and output fields consistently. `useReactiveProp` (used internally by `CalculatedDispatch`) is an internal hook — its signature does not change as part of this work; the generic infrastructure on `CalculatedProps` is sufficient for annotation purposes.

Similarly, `useFieldValidation` in `useField.ts` keeps its internal `validate` parameter typed as `(value: unknown, scopeValues: FormValues, allValues: FormValues) => string | null`. This is safe because `TScope extends FormValues` and `TAllValues extends FormValues`, so a function typed for a narrower scope is assignable where `FormValues` is expected.

### `ToComponentProps` and `useFieldProps`

`ToComponentProps<R>` must thread `TScope`/`TAllValues` into the inner `Reactive<...>` calls within its mapped type — not just on the outer signature:

```ts
// Before
type ToComponentProps<R extends { value: unknown; setValue: (v: never) => void }> =
  CommonProps & {
    [K in Exclude<keyof R, keyof ResolvedCommonProps>]?: Reactive<NonNullable<R[K]>>;
  };

// After
type ToComponentProps<
  R extends { value: unknown; setValue: (v: never) => void },
  TScope extends FormValues = FormValues,
  TAllValues extends FormValues = FormValues,
> = CommonProps<TScope, TAllValues> & {
  [K in Exclude<keyof R, keyof ResolvedCommonProps>]?: Reactive<NonNullable<R[K]>, TScope, TAllValues>;
};
```

`useFieldProps<R, TScope, TAllValues>` gains the same type params, accepting `ToComponentProps<R, TScope, TAllValues>`. This ensures custom field components built with `useFieldProps` can receive typed `scopeValues`/`allValues` when explicitly annotated.

### Manual annotation (today)

TypeScript cannot thread types through `children: ReactNode`, so `TScope`/`TAllValues` do not flow automatically from `Form<TValues>` to inner field components. Users who want typed reactive props annotate manually — the annotation overrides the `FormValues` default:

```tsx
<TextInput
  bind="name"
  disabled={(scope: PersonForm) => scope.age < 18}   // scope typed, no per-field generic needed
  validate={(value, scope: PersonForm) => ...}
/>
```

When TypeScript or React provides a mechanism to propagate types through `children: ReactNode`, the library wires `TScope`/`TAllValues` automatically — no API change needed.

---

## `OnChangeArg<TValues>` discriminated union

```ts
type OnChangeArg<TValues extends FormValues = FormValues> =
  | { values: TValues; isValid: true; errors: Record<string, string | null> }
  | { values: LooseValues<TValues>; isValid: false; errors: Record<string, string | null> };
```

A single object argument is used (not positional) specifically because TypeScript discriminated union narrowing requires both the discriminant and the narrowed value to be properties of the same object. Checking `isValid` then narrows `values` automatically.

**Narrowing caveat:** When `Form` is used without a type parameter (`Form` with default `TValues = FormValues`), `TValues` and `LooseValues<TValues>` are structurally equivalent. The discriminant `isValid` still works, but the `values: TValues` narrowing in the `true` branch provides no additional precision. The typed narrowing benefit only materializes when a concrete `TValues` is provided. This caveat applies equally to `onSubmit`.

**`errors` field:** `errors: Record<string, string | null>` preserves the current `store.getErrors()` behavior where `null` means "field registered but no error". This is intentional — filtering nulls would change the shape relative to what validators produce.

`ValidationState` (the existing `{ isValid: boolean; errors: Record<string, string | null> }` export) is **removed** — its role is subsumed by `OnChangeArg`. Callers that currently destructure `state.isValid` or `state.errors` from `onChange` will migrate to destructuring from the single object arg.

---

## `Form<TValues>`

```ts
type FormProps<TValues extends FormValues = FormValues> = {
  values?: TValues;
  onChange?: (arg: OnChangeArg<TValues>) => void;
  onSubmit?: (arg: OnChangeArg<TValues>) => void;
  showErrors?: boolean;
  messages?: Partial<Record<string, string>>;
  children: ReactNode;
  'aria-label'?: string;
  dataSources?: Record<string, DataSourceDefinition<unknown>>;
};

export function Form<TValues extends FormValues = FormValues>(
  props: FormProps<TValues>,
): JSX.Element
```

### `values` prop

`values?: TValues` seeds the store once on mount. It is **not reactive** — subsequent changes to the prop after mount are not synced into the store (existing behavior, unchanged). Implementers must not add a `useEffect` sync. Users who need to reset the form must unmount and remount it.

### `onChange`

**Breaking change:** The signature changes from `(values: FormValues, state: ValidationState) => void` (two positional args) to `(arg: OnChangeArg<TValues>) => void` (single object arg). Existing handlers using `(values, state)` must migrate to `({ values, isValid, errors })`.

Fires on every store change. The discriminated union enables typed narrowing:

```ts
onChange={({ values, isValid, errors }) => {
  // autosave — always fires
  localStorage.setItem('draft', JSON.stringify(values));

  // toolbar save — only act when valid
  if (isValid) {
    setToolbarState(values);  // values: TValues ✓
  }
}}
```

### `onSubmit`

**Breaking change:** The library no longer internally gates `onSubmit` on `store.isValid()`. `onSubmit` fires on every submit click where the button is not disabled. Same discriminated union object arg as `onChange`.

**Breaking change:** `onSubmit` changes from `(values: FormValues) => void` (one positional arg) to `(arg: OnChangeArg<TValues>) => void` (single object arg).

`store.setSubmitted()` is still called on every submit click — this marks all fields as submitted so validation errors become visible regardless of validity. The sequence on submit click is:

1. Call `store.setSubmitted()` (runs all validators, marks as submitted, triggers error display)
2. Call `onSubmit({ values, isValid, errors })`

"Button not disabled" is enforced by the browser: if the `<button type="submit">` element is rendered with `disabled`, the browser prevents the form's `submit` event from firing entirely, so `handleSubmit` is never reached. No additional guard is needed in `handleSubmit` — the native form submission mechanism handles it.

The developer is now fully responsible for deciding what to do when `isValid` is false:

```ts
onSubmit={({ values, isValid }) => {
  if (!isValid) return;  // or scroll to error, show toast, etc.
  save(values);  // values: TValues ✓
}}
```

Removing the internal gate gives developers full control (e.g., allow draft-saving even when the form is invalid).

**Implementation note:** The internal `onChangeRef` and `onSubmitRef` refs in `Form.tsx` must be updated to type `((arg: OnChangeArg<TValues>) => void) | undefined` to match the new signatures. The existing `ValidationState` import in `Form.tsx` becomes unused and must be removed.

**Implementation note — constructing `OnChangeArg`:** Both `onChange` and `onSubmit` construct the arg from `store.getSnapshot()` (which returns `FormValues`) using an intentional `as` cast. The store remains untyped internally; the cast is the compile-time boundary. The subscriber lambda in `Form.tsx` changes as follows:

```ts
// Before
store.subscribe(() => {
  onChangeRef.current?.(store.getSnapshot(), {
    isValid: store.isValid(),
    errors: store.getErrors(),
  });
});

// After
store.subscribe(() => {
  const snapshot = store.getSnapshot();
  const isValid = store.isValid();
  const errors = store.getErrors();
  const arg: OnChangeArg<TValues> = isValid
    ? { values: snapshot as TValues, isValid: true, errors }
    : { values: snapshot as LooseValues<TValues>, isValid: false, errors };
  onChangeRef.current?.(arg);
});
```

The same construction is used inside `handleSubmit` to build the arg for `onSubmit`.

**Implementation note — `onChangeRef` closure:** The store lazy-init block captures `onChangeRef` in a closure. With generic `Form<TValues>`, this works without change — the closure is defined inside the generic function body and captures `TValues` from the outer scope via standard TypeScript generics.

**Implementation note — object identity:** `onChange` and `onSubmit` each independently construct an `OnChangeArg` object. When a submit fires, both fire for the same store state but produce distinct object references. This is expected — do not attempt to share the arg object between them.

**Implementation note — ordering:** The precise call sequence in `handleSubmit` is:

1. `store.setSubmitted()` — runs all validators, marks as submitted, calls `notifySubscribers()` internally
2. `notifySubscribers()` triggers the subscriber lambda → **`onChange` fires here** with the post-submit state
3. Back in `handleSubmit`, construct the `OnChangeArg` and call `onSubmit`

`onChange` fires as a side-effect of step 1, not as an explicit call. `handleSubmit` must NOT call `notifySubscribers()` a second time — `setSubmitted()` already did it. The subscriber lambda and `handleSubmit` each independently construct their own `OnChangeArg` from the current store state at the time they run.

---

## `SubmitDisabledFn<TValues>` and `SubmitProps<TValues>`

```ts
// Before
type SubmitDisabledFn = (
  scopeValues: FormValues,
  allValues: FormValues,
  meta: { formValid: boolean },
) => boolean;

// After
type SubmitDisabledFn<TValues extends FormValues = FormValues> = (
  values: LooseValues<TValues>,
  meta: { formValid: boolean },
) => boolean;
```

`scopeValues` and `allValues` are collapsed to a single `values` arg — `Submit` is always at the form root so the distinction was redundant. The function now takes two positional args instead of three. `values` is `LooseValues<TValues>` since this function runs reactively at any validity state.

`SubmitProps` gains the type param:

```ts
type SubmitProps<TValues extends FormValues = FormValues> = {
  children?: ReactNode;
  disabled?: boolean | SubmitDisabledFn<TValues>;
};
```

`ResolvedSubmitProps` is **unchanged** — it still carries `formValid: boolean` for adapter components to use in their rendering decisions. The removal of the internal validity gate affects `Form.tsx` behavior only, not what the `Submit` adapter component receives.

**How `TValues` reaches `Submit`:** `Submit = memo(SubmitDispatch)` is NOT made generic. `SubmitDispatch` uses `SubmitProps` with the default `TValues = FormValues`. The `TValues` type param on `SubmitProps`/`SubmitDisabledFn` exists for the user-side use case: `submitDisabled<PersonForm>(fn)` returns a `SubmitDisabledFn<PersonForm>`. TypeScript accepts assignment of `SubmitDisabledFn<PersonForm>` to `SubmitDisabledFn<FormValues>` — verified with `tsc` against the repo config. No cast is needed at the JSX call site.

**Call site cast in `SubmitDispatch`:** No explicit cast is needed. Inside `SubmitDispatch`, `d` is typed as `SubmitDisabledFn<FormValues>` (the default), expecting `LooseValues<FormValues>`. `allValues` from `store.getSnapshot()` is `FormValues = Record<string, unknown>`, which is structurally assignable to `LooseValues<FormValues>` (the mapped type produces `{ [k: string]?: unknown | null | undefined }`, which `Record<string, unknown>` satisfies). TypeScript accepts the call without a cast.

The `submitDisabled` helper in `helpers.ts` gains the same generic:

```ts
function submitDisabled<TValues extends FormValues = FormValues>(
  fn: SubmitDisabledFn<TValues>,
): SubmitDisabledFn<TValues>
```

`TValues` appears in both the parameter and return position, so `no-unnecessary-type-parameters` does not fire — verified against the repo's lint config.

---

## `Scope`

`Scope` is **not changed** in this implementation. The repo's `typescript-eslint` strict config enables `no-unnecessary-type-parameters`, which flags phantom type params on both `type` aliases and function signatures where the params do not appear in the signature in a constraining way. Adding `<TScope, TAllValues>` to `Scope` would trigger this rule since neither param is referenced in the props type or body.

`ScopeProps` and the `Scope` function signature stay as-is:

```ts
type ScopeProps = {
  bind: string;
  children: ReactNode;
};

export function Scope({ bind, children }: ScopeProps): JSX.Element
```

The future TypeScript/React propagation mechanism will introduce real usage of the type params at that time, at which point the generics can be added without triggering lint. Until then, the `Reactive<T, TScope, TAllValues>` generic infrastructure on all prop types is the readiness layer — `Scope` itself does not need to change now.

Today, users annotate reactive props manually when inside a scope:

```tsx
<Scope bind="address">
  <TextInput
    bind="city"
    validate={(value, scope: Address, all: PersonForm) => ...}
  />
</Scope>
```

---

## Internal store

`FormStore` remains `Record<string, unknown>` internally. `TValues` is a compile-time boundary only — the store does not enforce or validate types at runtime. Runtime type safety is the responsibility of the developer's `validate` callbacks or an external schema library.

---

## Summary of changes

| Location | Change |
|---|---|
| `types.ts` | `Reactive<T>` → `Reactive<T, TScope, TAllValues>` (both default `FormValues`) |
| `types.ts` | `CommonProps` → `CommonProps<TScope, TAllValues>` |
| `types.ts` | Field prop types gain `<TScope, TAllValues>`: `TextInputProps`, `TextareaProps`, `SelectProps`, `CheckboxProps`, `SwitchProps`, `NumberInputProps`, `DatePickerProps`, `TimePickerProps`, `DateTimePickerProps`, `RadioGroupProps`, `AutocompleteProps`, `ExclusiveToggleProps` |
| `types.ts` | `FieldsetProps` — `hidden`/`removed` updated to `Reactive<boolean, TScope, TAllValues>` |
| `types.ts` | `CalculatedProps<T>` and `OutputProps` — all `Reactive<...>` props updated with `TScope`/`TAllValues` |
| `types.ts` | `ToComponentProps` → `ToComponentProps<R, TScope, TAllValues>` |
| `types.ts` | `SubmitDisabledFn` → `SubmitDisabledFn<TValues>`, collapses to two positional args, drops `scopeValues` |
| `types.ts` | `SubmitProps` → `SubmitProps<TValues>` |
| `types.ts` | Add `LooseValues<T>` utility type |
| `types.ts` | Add `OnChangeArg<TValues>` discriminated union type |
| `types.ts` | Remove `ValidationState` (subsumed by `OnChangeArg`) |
| `Form.tsx` | `Form` → `Form<TValues>`; `onChange` and `onSubmit` use `OnChangeArg<TValues>`; remove internal `isValid()` gate on `onSubmit`; update `onChangeRef`/`onSubmitRef` type annotations |
| `Scope.tsx` | No change — `no-unnecessary-type-parameters` lint rule prevents phantom type params; generics deferred until a real propagation mechanism exists |
| `hooks/useField.ts` | `useFieldProps` → `useFieldProps<R, TScope, TAllValues>` |
| `helpers.ts` | `submitDisabled` → `submitDisabled<TValues>` |
| `components/helpers.test.ts` | Update both `SubmitDisabledFn` usages from `(_, __, { formValid }) => !formValid` to `(_, { formValid }) => !formValid`; the `submitDisabled` helper still infers the type without an explicit `SubmitDisabledFn` import, satisfying the existing test invariant; the inferred type of `_` becomes `LooseValues<FormValues>` (structurally equivalent to `Record<string, unknown>`) — no runtime impact, but the discarded `_` parameter type changes at the type level |
| `components/fields.tsx` | Update `SubmitDisabledFn` call site in `SubmitDispatch` from `d(scopeValues, allValues, { formValid })` to `d(allValues, { formValid })`; remove `scopeValues`, `raw`, and `prefix` from the snapshot closure (all three are only used to compute `scopeValues`); also remove `prefix` from the `useScope()` destructure at the top of `SubmitDispatch` (only `store` is still needed); `allValues` must be kept |
| `components/fields.tsx` | `FieldsetDispatch` — no change for same reason as `Scope`; phantom type params deferred |
| `Form.tsx` | Remove unused `ValidationState` import |
| `index.ts` | Add `LooseValues` and `OnChangeArg` to the named type exports block; remove `ValidationState`; `SubmitDisabledFn` and `SubmitProps` are already exported and require no re-export changes — their signatures change in `types.ts` only; all other already-exported types are the same |
