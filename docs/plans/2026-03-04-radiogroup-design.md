# RadioGroup — Design

**Date:** 2026-03-04

## Summary

Implement `RadioGroup` as a single-selection field component backed by a datasource, following the existing Select dispatch + adapter pattern. Options are pre-rendered in the dispatch layer and passed as `children` to the adapter.

---

## Types (`packages/enforma/src/components/types.ts`)

```ts
export type RadioGroupProps = CommonProps & {
  dataSource?: DataSourceProp<unknown>;
  children?: ReactNode;
  row?: Reactive<boolean>;
};

export type ResolvedRadioGroupProps = ResolvedCommonProps & {
  value: unknown;
  setValue: (value: unknown) => void;
  children: ReactNode;        // pre-rendered RadioGroupOption elements
  row: boolean;               // defaults to false
  isLoading: boolean;
  dataSourceError: Error | null;
};

export type ResolvedRadioGroupOptionProps = {
  value: unknown;
  label: string;
};
```

Add `RadioGroup: ResolvedRadioGroupProps` and `RadioGroupOption: ResolvedRadioGroupOptionProps` to `ComponentPropsMap`.

---

## Slot Component (`packages/enforma/src/components/RadioGroupOption.tsx`)

Renders null — used as a child template to configure label/value field mapping, identical to `SelectOption`.

```ts
export type RadioGroupOptionProps = {
  label: string | ((item: unknown) => string);
  value: string | ((item: unknown) => unknown);
};

export function RadioGroupOption(_: RadioGroupOptionProps): null { return null; }
```

---

## Dispatch (`packages/enforma/src/components/fields.tsx`)

`RadioGroupDispatch` mirrors `SelectDispatch`:
1. Calls `useFieldProps<FieldResolved<unknown>>(props)` — resolves common props + `row` (as a reactive boolean, defaulting to `false`)
2. Calls `useDataSource(props.dataSource, { bind: props.bind })` — resolves items, isLoading, error
3. Calls `buildSelectOptions(items, props.children)` — reuses existing helper
4. Looks up `getComponent('RadioGroupOption')` and pre-renders one element per option
5. Calls `dispatchComponent('RadioGroup', { ...resolved, children, row, isLoading, dataSourceError })`

`row` is resolved as a reactive prop via `useFieldProps` and defaults to `false` before dispatch.

Exported as:
```ts
export const RadioGroup = Object.assign(memo(RadioGroupDispatch, stablePropsEqual), {
  Option: RadioGroupOption,
});
```

---

## MUI Adapters (`packages/enforma-mui/src/components/`)

### `RadioGroupOption.tsx`

Renders a single `<FormControlLabel>` + MUI `<Radio>`:

```tsx
export function RadioGroupOption({ value, label }: ResolvedRadioGroupOptionProps) {
  return <FormControlLabel value={value} control={<Radio />} label={label} />;
}
```

### `RadioGroup.tsx`

```tsx
import { RadioGroup as MuiRadioGroup } from '@mui/material'; // aliased to avoid collision

export function RadioGroup({ value, setValue, label, disabled, error, showError, onBlur, children, row, isLoading, dataSourceError }: ResolvedRadioGroupProps) {
  // CircularProgress spinner when isLoading
  // FormLabel for group label
  // MuiRadioGroup value={value ?? ''} onChange={e => setValue(e.target.value)} row={row}
  // FormHelperText for dataSourceError?.message ?? error when showError
}
```

Both components registered in `enforma-mui/src/index.ts` and exported.

---

## Demo (`apps/demo/src/App.tsx`)

- One `RadioGroup` with inline `RadioGroup.Option` children (static options)
- One `RadioGroup` with a datasource + field-name mapping template
- At least one reactive `disabled` example (toggled by a Checkbox)

---

## Tests (`packages/enforma-mui/src/components/RadioGroup.test.tsx`)

- Renders options from inline children
- Renders options from a static datasource
- Selecting an option calls `setValue` with the correct value
- `row` prop is forwarded to the MUI `RadioGroup`
- Shows error message when `showError` is true
- Disabled state disables all radio inputs
