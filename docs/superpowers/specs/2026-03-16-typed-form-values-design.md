# Typed Form Values Design

**Date:** 2026-03-16
**Status:** Approved

## Problem

`FormValues = Record<string, unknown>` flows through the entire library. Users get `unknown` in `onSubmit` and `onChange` callbacks. TypeScript provides no help at the form boundary.

## Goals

- Type `onSubmit` and `onChange` at the `Form` boundary
- Type `SubmitDisabledFn` and the `submitDisabled` helper

## Non-Goals

- Typing reactive props (`disabled`, `hidden`, `validate`, etc.) — YAGNI until TypeScript/React provides a propagation mechanism for `children: ReactNode`
- Full dot-path inference for `bind` strings
- Runtime validation or schema integration

---

## `LooseValues<T>` utility type

Intermediate form state is not guaranteed to match `TValues`. Date fields store partial strings during typing; any field may be `undefined` or `null` before the user interacts with it. `LooseValues<T>` represents what the store actually holds:

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

The `Array` branch must come before the general `object` branch since arrays extend object. The array branch also handles `Date[]` explicitly — without it, `LooseValues<Date>` would recurse into Date's own keys. For primitive arrays (e.g., `string[]`), the leaf branch produces `(string | null | undefined)[]` — intentionally loose.

`null` is included in leaf branches because `store.setField` accepts `unknown`, so `null` is a legal store value.

`LooseValues<T>` is used wherever the form might be in an intermediate state. `TValues` is used only where validity is guaranteed by the `isValid` discriminant.

---

## `OnChangeArg<TValues>` discriminated union

```ts
type OnChangeArg<TValues extends FormValues = FormValues> =
  | { values: TValues; isValid: true; errors: Record<string, string | null> }
  | { values: LooseValues<TValues>; isValid: false; errors: Record<string, string | null> };
```

A single object argument is used (not positional) because TypeScript discriminated union narrowing requires both the discriminant and the narrowed value to be properties of the same object. Checking `isValid` narrows `values` automatically.

**Narrowing caveat:** When `Form` is used without a type parameter (default `TValues = FormValues`), `TValues` and `LooseValues<TValues>` are structurally equivalent. The discriminant still works, but `values` narrowing provides no additional precision. The typed benefit only materializes when a concrete `TValues` is provided.

**`errors` field:** `errors: Record<string, string | null>` preserves `store.getErrors()` behavior where `null` means "field registered but no error". Filtering nulls would change the shape relative to what validators produce.

`ValidationState` (the existing `{ isValid: boolean; errors: Record<string, string | null> }` export) is **removed** — its role is subsumed by `OnChangeArg`.

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

Seeds the store once on mount. **Not reactive** — subsequent prop changes are not synced into the store (existing behavior, unchanged). Do not add a `useEffect` sync.

### `onChange`

**Breaking change:** Signature changes from `(values: FormValues, state: ValidationState) => void` (two positional args) to `(arg: OnChangeArg<TValues>) => void` (single object arg).

Fires on every store change:

```ts
onChange={({ values, isValid }) => {
  localStorage.setItem('draft', JSON.stringify(values));  // autosave, always fires
  if (isValid) setToolbarState(values);                   // values: TValues ✓
}}
```

### `onSubmit`

**Breaking change:** No longer internally gated on `store.isValid()`. Fires on every submit click where the button is not disabled.

**Breaking change:** Signature changes from `(values: FormValues) => void` (one positional arg) to `(arg: OnChangeArg<TValues>) => void` (single object arg).

`store.setSubmitted()` is still called on every submit click — this marks fields as submitted so validation errors become visible. The sequence:

1. `store.setSubmitted()` — runs all validators, marks as submitted, triggers `notifySubscribers()` internally → **`onChange` fires here** as a side-effect
2. `handleSubmit` constructs `OnChangeArg` and calls `onSubmit`

`handleSubmit` must NOT call `notifySubscribers()` again — `setSubmitted()` already did it.

"Button not disabled" is enforced by the browser — a `<button type="submit" disabled>` prevents the `submit` event from firing. No additional guard needed in `handleSubmit`.

```ts
onSubmit={({ values, isValid }) => {
  if (!isValid) return;
  save(values);  // values: TValues ✓
}}
```

### Implementation notes

- Update `onChangeRef` and `onSubmitRef` to `((arg: OnChangeArg<TValues>) => void) | undefined`
- Remove the unused `ValidationState` import
- The store lazy-init closure captures `TValues` from the outer generic scope — no structural change needed
- `onChange` and `onSubmit` each independently construct their `OnChangeArg`; same store state, distinct object references

**Subscriber lambda (before/after):**

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

Same construction in `handleSubmit` for `onSubmit`.

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

`scopeValues` and `allValues` collapse to a single `values` arg — `Submit` is always at the form root so the distinction was redundant. Two positional args instead of three.

```ts
type SubmitProps<TValues extends FormValues = FormValues> = {
  children?: ReactNode;
  disabled?: boolean | SubmitDisabledFn<TValues>;
};
```

`ResolvedSubmitProps` is **unchanged** — it still carries `formValid: boolean` for adapter components.

**`Submit` component stays non-generic.** `SubmitDispatch` uses `SubmitProps` with default `TValues = FormValues`. Users call `submitDisabled<PersonForm>(fn)` to get a typed function; TypeScript accepts assignment of `SubmitDisabledFn<PersonForm>` to `SubmitDisabledFn<FormValues>` — verified with `tsc`.

**`SubmitDispatch` call site:** Change `d(scopeValues, allValues, { formValid })` to `d(allValues, { formValid })`. Remove `scopeValues`, `raw`, and `prefix` from the snapshot closure and `prefix` from the `useScope()` destructure — only `store` and `allValues` are needed. No cast required: `allValues` (`Record<string, unknown>`) is structurally assignable to `LooseValues<FormValues>`.

```ts
function submitDisabled<TValues extends FormValues = FormValues>(
  fn: SubmitDisabledFn<TValues>,
): SubmitDisabledFn<TValues>
```

`TValues` appears in both parameter and return — `no-unnecessary-type-parameters` does not fire (verified against repo lint config).

---

## Internal store

`FormStore` remains `Record<string, unknown>` internally. `TValues` is a compile-time boundary only.

---

## Summary of changes

| Location | Change |
|---|---|
| `types.ts` | Add `LooseValues<T>` utility type |
| `types.ts` | Add `OnChangeArg<TValues>` discriminated union type |
| `types.ts` | Remove `ValidationState` (subsumed by `OnChangeArg`) |
| `types.ts` | `SubmitDisabledFn` → `SubmitDisabledFn<TValues>`, collapses to two positional args |
| `types.ts` | `SubmitProps` → `SubmitProps<TValues>` |
| `Form.tsx` | `Form` → `Form<TValues>`; `onChange`/`onSubmit` use `OnChangeArg<TValues>`; remove `isValid()` gate on `onSubmit`; update ref type annotations; remove `ValidationState` import |
| `helpers.ts` | `submitDisabled` → `submitDisabled<TValues>` |
| `components/helpers.test.ts` | Update both `SubmitDisabledFn` usages from `(_, __, { formValid })` to `(_, { formValid })` |
| `components/fields.tsx` | Update `SubmitDispatch` call site to `d(allValues, { formValid })`; remove `prefix`/`raw`/`scopeValues` from closure and `prefix` from `useScope()` destructure |
| `index.ts` | Export `LooseValues`, `OnChangeArg`; remove `ValidationState` export |
