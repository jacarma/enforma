# Enforma.Submit Component Design

**Date:** 2026-03-14
**Status:** Approved

## Problem

The submit button in `HeroDemo.tsx` is a plain unstyled `<button>` while the rest of the form uses MUI components. It renders with browser-default styling, looking out of place in a polished MUI form.

## Solution

Add `Enforma.Submit` as a first-class component following the existing registry dispatch pattern, with a MUI adapter that renders `<Button variant="contained" type="submit">`.

## Design

### Types (`packages/enforma/src/components/types.ts`)

```ts
export type SubmitDisabledFn = (
  scopeValues: FormValues,
  allValues: FormValues,
  meta: { formValid: boolean },
) => boolean;

export type SubmitProps = {
  children?: ReactNode;
  disabled?: boolean | SubmitDisabledFn;
};

export type ResolvedSubmitProps = {
  children: ReactNode;
  disabled: boolean | undefined;
  formValid: boolean;
};
```

`SubmitProps.disabled` uses a dedicated function type (not the generic `Reactive<boolean>`) because it receives a third `meta` argument with `{ formValid: boolean }`. This lets users write `disabled={(_, __, { formValid }) => !formValid}` if they want to disable on invalid, without baking that behaviour in.

`ResolvedSubmitProps.formValid` is passed to the adapter so it can use it for styling (e.g. different color when invalid) independently of `disabled`.

`Submit: ResolvedSubmitProps` is added to `ComponentPropsMap`.

### Dispatch (`packages/enforma/src/components/fields.tsx`)

`SubmitDispatch` cannot use `useReactiveProp` (wrong signature). It resolves `disabled` and `formValid` together in a single `useSyncExternalStore` call, using the same ref-cache pattern used elsewhere in the library to avoid unnecessary re-renders.

- `children` defaults to `'Submit'` so `<Enforma.Submit />` works with no props.
- `formValid` comes from `store.isValid()`.
- `disabled` is either a plain boolean or called as `fn(scopeValues, allValues, { formValid })`.

`Submit` is exported as `memo(SubmitDispatch, stablePropsEqual)` and added to the `Enforma` default export object.

### MUI Adapter (`packages/enforma-mui/src/components/Submit.tsx`)

```tsx
export function Submit({ children, disabled }: ResolvedSubmitProps) {
  return (
    <Button type="submit" variant="contained" disabled={disabled}>
      {children}
    </Button>
  );
}
```

Uses MUI primary color via `variant="contained"` — respects whatever MUI theme the user configures. `formValid` is available in props for custom adapter overrides.

### Wiring

- `SubmitProps`, `ResolvedSubmitProps`, `SubmitDisabledFn` exported from `packages/enforma/src/index.ts`
- `Submit` component registered in `packages/enforma-mui/src/index.ts`
- `HeroDemo.tsx` updated: `<button type="submit">` → `<Enforma.Submit />`
- `index.astro` hero code snippet updated to show `<Enforma.Submit />`

## Usage Examples

```tsx
// Minimal
<Enforma.Submit />

// Custom label
<Enforma.Submit>Save changes</Enforma.Submit>

// Auto-disable when invalid (opt-in)
<Enforma.Submit disabled={(_, __, { formValid }) => !formValid} />

// Always disabled
<Enforma.Submit disabled={true} />
```

## Out of Scope

- No automatic disabling on invalid — users must opt in via `disabled` prop
- No loading/submitting state (can be added later)
- No variant prop on `SubmitProps` — adapter handles styling
