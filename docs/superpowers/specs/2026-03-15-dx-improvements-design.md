# DX Improvements — Design Spec

**Date:** 2026-03-15
**Status:** Approved

## Summary

Three targeted DX improvements based on user testing feedback:

1. README restructure — de-emphasize adapter architecture for new users
2. Uncontrolled form mode — make `values` and `onChange` optional in `FormProps`
3. `submitDisabled` helper — improve TypeScript inference for the `disabled` prop on `Submit`

---

## 1. README Restructure

### Problem

The "UI-agnostic / adapter-based" messaging is prominent in both READMEs. New users assume they need to write an adapter before they can use the library. The adapter architecture is a power-user concern.

### Changes

**`packages/enforma/README.md`**

- Remove adapter-focused language from "Why Enforma" ("Enforma is a facade over your component library. Swap MUI for shadcn, or build your own components"). Replace with outcome-focused language that doesn't imply the user needs to know about adapters.
- Keep the existing Setup section (it already correctly leads with enforma-mui).
- Rename "Custom components" section to "Advanced" and add a note that it's for power users building their own integrations.

**Root `README.md`**

- Reframe "Why Enforma" to remove adapter-architecture framing.
- Move "Publishing an adapter" out of the main `Extending Enforma` section — either into an "Advanced" subsection or just link to the adapter guide.
- The root README example is missing the `registerComponents` call. Add a brief note pointing to Setup, or add the call to the example.

### Non-goals

- No new docs pages.
- No changes to the enforma-mui README.

---

## 2. Uncontrolled Form Mode

### Problem

`values` and `onChange` are required in `FormProps`, but many forms don't need controlled state. Omitting either causes a TypeScript error. The README example also passes `values={{}}` unnecessarily.

### Breaking change assessment

Making required props optional is always a backward-compatible, additive change — existing call sites that already pass both props are unaffected. `FormProps` itself is not exported, but `Form` is exported; any consumer already passing `values` and `onChange` continues to compile and behave identically.

### Changes

**`packages/enforma/src/components/Form.tsx`**

- Change `FormProps`:
  - `values?: FormValues` (was required)
  - `onChange?: (values: FormValues, state: ValidationState) => void` (was required)
- When `values` is absent, initialize the form store with `{}`.
- When `onChange` is absent, skip calling it on changes.
- Controlled mode (values provided) continues to work exactly as before.

**READMEs**

- Drop `values={{}}` from both the root README example and the enforma package README example — it's no longer needed for the common case. Note: the root README example is also being updated in Item 1 (adding a `registerComponents` note). Both changes apply to the same example block and should be made together.

### Behavior contract

| `values` | `onChange` | Behavior |
|----------|------------|----------|
| provided | provided   | Controlled — store initialized from `values`, changes reported via `onChange` |
| omitted  | omitted    | Uncontrolled — store initialized to `{}`, changes not reported externally. `onSubmit` receives only fields that have been set. |
| provided | omitted    | Controlled init, changes not reported. If `values` changes on re-render it will **not** sync to the store after mount — this is pre-existing behavior for all cases where `values` is provided and is unchanged by this feature. |
| omitted  | provided   | Uncontrolled init (`{}`), changes reported via `onChange` |

### Implementation notes

- Pass `values ?? {}` to `new FormStore(...)`.
- `onChangeRef` must be explicitly typed to accommodate both defined and undefined across renders: `useRef<((values: FormValues, state: ValidationState) => void) | undefined>(onChange)`. Without the explicit type annotation, TypeScript infers the ref type from the initial value — if `onChange` is `undefined` on first render, the inferred type is `useRef<undefined>`, and assigning a defined `onChange` on a later render would be a type error. Guard the subscription call: `onChangeRef.current?.(values, state)`.
- The existing pattern `onChangeRef.current = onChange` runs on every render. Toggling `onChange` between defined and undefined across renders is **not supported** — consumers must not change this prop after mount. This matches existing behavior (it was required before).
- `onSubmit` fires in all four modes **when the form is valid** (existing `store.isValid()` gate is unchanged). An uncontrolled form with no user interaction and no validation rules will pass validation and submit `{}`. `onSubmit` optionality is unchanged and orthogonal to this feature.

### Non-goals

- No `defaultValues` prop. Uncontrolled always initializes to `{}`. The `defaultValues` convention (react-hook-form/formik) is deferred — it can be added non-breakingly later.
- No two-way sync if `values` prop changes after mount (existing behavior, unchanged).
- No dev-mode warning for the `values provided / onChange omitted` combination. The behavior is intentional and documented.

---

## 3. `submitDisabled` Helper

### Problem

To avoid a TypeScript inline type error on the `disabled` prop of `Submit`, users must explicitly import and annotate with `SubmitDisabledFn`. The inline function `(_, __, { formValid }) => !formValid` does not infer correctly without the annotation due to TypeScript contextual typing limitations with `boolean | FnType` unions.

### Changes

**`packages/enforma/src/components/helpers.ts`** (new file)

`types.ts` is types-only (all exports are `type` or `interface`) and must not contain runtime values — this convention is being established here. Add a new `helpers.ts` for runtime value exports:

```typescript
import type { SubmitDisabledFn } from './types';

export function submitDisabled(fn: SubmitDisabledFn): SubmitDisabledFn {
  return fn;
}
```

**`packages/enforma/src/index.ts`**

Add `export { submitDisabled } from './components/helpers'` (no existing import from `helpers.ts`). No naming collision with the existing `SubmitDisabledFn` type export — one is a value, one is a type.

`submitDisabled` is intentionally a named export only — it is **not** added to the `Enforma` default namespace object, which contains only form components (`Form`, `TextInput`, etc.).

**`packages/enforma/README.md`**

Document `submitDisabled` in the Usage section with an example:

```tsx
import Enforma, { submitDisabled } from 'enforma';

<Enforma.Submit disabled={submitDisabled((_, __, { formValid }) => !formValid)}>
  Place order
</Enforma.Submit>
```

### Why a helper instead of a type change

- No breaking changes to `SubmitProps` or `SubmitDisabledFn`.
- The helper is a zero-cost identity function — no runtime overhead.
- Users who already import `SubmitDisabledFn` are unaffected.
- The helper is self-documenting at the call site.

---

## Testing

- **Item 1 (README):** Manual review — no automated tests.
- **Item 2 (uncontrolled mode):** Unit tests for `Form` covering all four `values`/`onChange` combinations. Explicit cases:
  - No `onChange`: store subscription must not throw and must not call `onChange` (verify the `?.` guard is exercised, not just that no exception escapes)
  - No `values`: store initializes to `{}`
  - `onSubmit` fires correctly in all four modes
  - All existing tests pass unchanged
- **Item 3 (`submitDisabled`):** Unit test confirming the helper returns the function unchanged. TypeScript type test (using vitest's `expectTypeOf` or a `// @ts-expect-error`-free assertion) verifying `(_, __, { formValid }) => !formValid` infers correctly as the `disabled` prop without an explicit `SubmitDisabledFn` annotation.
