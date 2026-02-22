# Demo Variant Switcher Design

**Goal:** Add a UI control to the demo app that lets users switch all forms between the three MUI visual styles (`classic`, `outlined`, `standard`) at runtime.

## Approach

Use React state to track the active variant. On each change, call `registerComponents` with the matching bundle from `enforma-mui`. The state change triggers a re-render and all `Form` instances pick up the new `FormWrap` from the registry automatically. Form values are preserved across switches.

## Changes

**`apps/demo/src/App.tsx`**

- Remove the module-level `registerComponents(classic)` call.
- Import all three bundles: `classic`, `outlined`, `standard` from `enforma-mui`.
- Add `useState<'classic' | 'outlined' | 'standard'>('classic')` in `App`.
- Initialize the registry on first render by calling `registerComponents(classic)` before returning JSX (or via a ref-guarded call).
- Render a `<select>` at the top of the page with three options:
  - `classic` → label "Classic"
  - `outlined` → label "MUI Outline"
  - `standard` → label "MUI Default"
- On `onChange`, call `registerComponents` with the matching bundle and update state.

## Labels

| Value | Label |
|-------|-------|
| `classic` | Classic |
| `outlined` | MUI Outline |
| `standard` | MUI Default |

## What does NOT change

- No new files.
- No changes to `enforma` core or `enforma-mui`.
- No key-based re-mounting; form values survive variant switches.
