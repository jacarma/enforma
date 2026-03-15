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

### Changes

**`packages/enforma/src/components/Form.tsx`**

- Change `FormProps`:
  - `values?: FormValues` (was required)
  - `onChange?: (values: FormValues, state: ValidationState) => void` (was required)
- When `values` is absent, initialize the form store with `{}`.
- When `onChange` is absent, skip calling it on changes.
- Controlled mode (values provided) continues to work exactly as before.

**READMEs**

- Drop `values={{}}` from both the root README example and the enforma package README example — it's no longer needed for the common case.

### Behavior contract

| `values` | `onChange` | Behavior |
|----------|------------|----------|
| provided | provided   | Controlled — store initialized from `values`, changes reported via `onChange` |
| omitted  | omitted    | Uncontrolled — store initialized to `{}`, changes not reported externally |
| provided | omitted    | Controlled init, changes not reported (valid for read-only initial state scenarios) |
| omitted  | provided   | Uncontrolled init, changes reported via `onChange` |

### Non-goals

- No `defaultValues` prop. Uncontrolled always initializes to `{}`.
- No two-way sync if `values` prop changes after mount (existing behavior, no change).

---

## 3. `submitDisabled` Helper

### Problem

To avoid a TypeScript inline type error on the `disabled` prop of `Submit`, users must explicitly import and annotate with `SubmitDisabledFn`. The inline function `(_, __, { formValid }) => !formValid` does not infer correctly without the annotation due to TypeScript contextual typing limitations with `boolean | FnType` unions.

### Changes

**`packages/enforma/src/components/types.ts`**

Add a helper function alongside the existing type:

```typescript
export function submitDisabled(fn: SubmitDisabledFn): SubmitDisabledFn {
  return fn;
}
```

**`packages/enforma/src/index.ts`**

Export `submitDisabled` as a named export.

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

- **Item 2:** Manual review of READMEs — no automated tests.
- **Item 3:** Unit tests for `Form` with no props (uncontrolled), with only `values`, with only `onChange`, and with both. Ensure existing tests pass unchanged.
- **Item 5:** A TypeScript type test (using `expectType` or `tsd`) verifying the inline function infers without explicit annotation. Also a unit test confirming the helper returns the function unchanged.
