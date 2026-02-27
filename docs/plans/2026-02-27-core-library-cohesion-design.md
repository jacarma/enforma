# Core Library Cohesion Design

**Date:** 2026-02-27

## Summary

Two changes to make the library more cohesive:

1. **SelectOption registry pattern** — Mirror the List pattern: `SelectDispatch` dispatches to a registered `SelectOption` component per option, collecting pre-rendered nodes passed as `children` to `Select`. Replaces the flat `options` array prop.
2. **Rename `ListWrap` → `List`** — The MUI adapter's list wrapper component and registry key are renamed to `List` for clarity.

Items 1 and 2 from the TODO (moving `ListItemSlot` and `SelectOption` to core) were already completed in recent commits.

---

## SelectOption Registry Pattern

### Motivation

`List` pre-renders each `<ListItem>` via the registry and passes collected `ReactNode[]` to the `ListWrap` adapter. `Select` should follow the same pattern: pre-render each option via a registered `SelectOption` component and pass them as `children` to `Select`, rather than a flat `{ value, label }[]` array.

This gives adapters full control over option rendering (e.g. `<MenuItem>` for MUI, `<option>` for a native HTML adapter) without needing to know the options format.

### Core changes (`packages/enforma`)

**`types.ts`:**
- Add `ResolvedSelectOptionProps = { value: unknown; label: string }`
- Add `SelectOption: ResolvedSelectOptionProps` to `ComponentPropsMap`
- In `ResolvedSelectProps`: remove `options: { value: unknown; label: string }[]`, add `children: ReactNode`

**`fields.tsx`:**
- `SelectDispatch` keeps `buildSelectOptions` to resolve `{ value, label }[]` from dataSource + slot props
- After resolving, dispatches `dispatchComponent('SelectOption', { value, label })` for each option
- Passes collected nodes as `children` to `dispatchComponent('Select', { ...resolved, children, isLoading, dataSourceError })`

### MUI adapter changes (`packages/enforma-mui`)

- Add `SelectOption` component: renders `<MenuItem value={value as string}>{label}</MenuItem>`
- `Select` component: remove `options.map(...)`, render `{children}` inside `<MuiSelect>`
- Register `SelectOption` in all presets (`classic`, `outlined`, `standard`)

---

## Rename `ListWrap` → `List`

### Motivation

The MUI list wrapper component is called `ListWrap` to avoid confusion with core's `List` orchestrator during development. This distinction is unnecessary — the registry key and component name should simply be `List`.

### Core changes (`packages/enforma`)

**`types.ts`:**
- Rename `ListWrap: ResolvedListProps` → `List: ResolvedListProps` in `ComponentPropsMap`

**`List.tsx`:**
- Change `dispatchComponent('ListWrap', ...)` → `dispatchComponent('List', ...)`

### MUI adapter changes (`packages/enforma-mui`)

- Rename `ListWrap.tsx` → `List.tsx`
- Rename export `ListWrap` → `List`
- Update all preset objects: `ListWrap` → `List`
- Update type/component exports in `index.ts`

---

## Cleanup

- Mark all 4 core library TODO items as done in `docs/TODO.md`
