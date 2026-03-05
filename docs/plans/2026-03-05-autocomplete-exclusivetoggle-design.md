# Autocomplete + ExclusiveToggle Design

**Date:** 2026-03-05

## Summary

Add two new components (Autocomplete, ExclusiveToggle) and refactor all list-based components (Select, RadioGroup) to pass both a flat `options` array and pre-rendered `children` to adapters. Each adapter chooses whichever fits its native API.

## Motivation

MUI Autocomplete expects an options array, not pre-rendered children. Rather than special-casing Autocomplete, we unify the pattern: every list-based dispatch passes both representations. Adapters ignore what they don't need.

---

## Unified List Props (Refactor)

All list-based resolved types gain an `options` field alongside the existing `children`:

```typescript
options: { value: unknown; label: string }[];  // flat data — new
children: ReactNode;                            // pre-rendered — existing
```

The dispatch already calls `buildSelectOptions` to produce the flat array before rendering children. Passing it costs nothing extra.

**`ResolvedSelectProps`** gains `options`. Existing MUI Select adapter ignores it — no functional change.

**`ResolvedRadioGroupProps`** gains `options`. Existing MUI RadioGroup adapter ignores it — no functional change.

---

## Autocomplete

### User-facing API

Identical shape to `Select`:

```tsx
// Inline options
<Enforma.Autocomplete bind="country" label="Country">
  <Enforma.Autocomplete.Option value="au" label="Australia" />
  <Enforma.Autocomplete.Option value="nz" label="New Zealand" />
</Enforma.Autocomplete>

// Datasource with template mapping
<Enforma.Autocomplete bind="country" label="Country" dataSource="countries">
  <Enforma.Autocomplete.Option label="name" value="code" />
</Enforma.Autocomplete>

// Static array datasource
<Enforma.Autocomplete bind="country" label="Country" dataSource={options} />
```

Constrained: value must match an option. Typing filters the list; committing an unrecognized input does not save it.

### Props type

```typescript
type AutocompleteProps = CommonProps & {
  dataSource?: DataSourceProp<unknown>;
  children?: ReactNode;
};
```

### Resolved props

```typescript
type ResolvedAutocompleteProps = ResolvedCommonProps & {
  options: { value: unknown; label: string }[];  // MUI adapter uses this
  children: ReactNode;                           // other adapters may use this
  displayValue: string;                          // label for current value
  isLoading: boolean;
  dataSourceError: Error | null;
};

type ResolvedAutocompleteOptionProps = {
  value: unknown;
  label: string;
};
```

### Dispatch

Same flow as `SelectDispatch`:
1. `useFieldProps` — resolves field state
2. `useDataSource` — loads items
3. `buildSelectOptions(items, props.children)` — normalizes to `{ value, label }[]`
4. Render `AutocompleteOption` children from options
5. Compute `displayValue` (matched option label or empty string)
6. Dispatch with both `options` and `children`

### MUI adapter

Uses `MuiAutocomplete` with the flat `options` array. The `value` prop is the matching option object (`{ value, label }`) or `null`; on change, extracts `.value` and calls `setValue`. Ignores `children`. Filtering is client-side via MUI's default `filterOptions`.

---

## ExclusiveToggle

### User-facing API

Same shape as `RadioGroup`, without `row` (toggle groups are always horizontal):

```tsx
// Inline options
<Enforma.ExclusiveToggle bind="size" label="Size">
  <Enforma.ExclusiveToggle.Option value="s" label="S" />
  <Enforma.ExclusiveToggle.Option value="m" label="M" />
  <Enforma.ExclusiveToggle.Option value="l" label="L" />
</Enforma.ExclusiveToggle>

// Datasource
<Enforma.ExclusiveToggle bind="plan" label="Plan" dataSource="plans">
  <Enforma.ExclusiveToggle.Option label="name" value="id" />
</Enforma.ExclusiveToggle>
```

### Props type

```typescript
type ExclusiveToggleProps = CommonProps & {
  dataSource?: DataSourceProp<unknown>;
  children?: ReactNode;
};
```

### Resolved props

```typescript
type ResolvedExclusiveToggleProps = ResolvedCommonProps & {
  options: { value: unknown; label: string }[];  // available
  children: ReactNode;                           // MUI adapter uses this
  isLoading: boolean;
  dataSourceError: Error | null;
};

type ResolvedExclusiveToggleOptionProps = {
  value: unknown;
  label: string;
};
```

### Dispatch

Same flow as `RadioGroupDispatch`, no `row` prop.

### MUI adapter

Uses `MuiToggleButtonGroup` (exclusive mode) with pre-rendered `ToggleButton` children. Ignores `options`.

---

## Files

| File | Change |
|------|--------|
| `packages/enforma/src/components/types.ts` | Add `options` to `ResolvedSelectProps`, `ResolvedRadioGroupProps`; add 4 new resolved types |
| `packages/enforma/src/components/fields.tsx` | Add `options` to Select/RadioGroup dispatch; add `AutocompleteDispatch`, `ExclusiveToggleDispatch` |
| `packages/enforma/src/components/AutocompleteOption.tsx` | New null marker component |
| `packages/enforma/src/components/ExclusiveToggleOption.tsx` | New null marker component |
| `packages/enforma/src/components/registry.ts` | Register 4 new component keys |
| `packages/enforma/src/index.ts` | Export new types and components |
| `packages/enforma-mui/src/components/Autocomplete.tsx` | New MUI adapter (uses `options`) |
| `packages/enforma-mui/src/components/AutocompleteOption.tsx` | New (passthrough, unused by MUI adapter) |
| `packages/enforma-mui/src/components/ExclusiveToggle.tsx` | New MUI adapter (uses `children`) |
| `packages/enforma-mui/src/components/ExclusiveToggleOption.tsx` | New ToggleButton adapter |
| `packages/enforma-mui/src/index.ts` | Register 4 new components in bundle |
| `apps/demo/src/App.tsx` | Add examples for both components |
| `packages/enforma-mui/src/components/Autocomplete.test.tsx` | New tests |
| `packages/enforma-mui/src/components/AutocompleteOption.test.tsx` | New tests |
| `packages/enforma-mui/src/components/ExclusiveToggle.test.tsx` | New tests |
| `packages/enforma-mui/src/components/ExclusiveToggleOption.test.tsx` | New tests |
