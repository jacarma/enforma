# Checkbox & Switch — Design

**Date:** 2026-03-02

## Summary

Implement `Checkbox` and `Switch` boolean field components following the existing dispatch + adapter pattern. Both share the same props shape; `SwitchProps` is a direct alias of `CheckboxProps`.

## Types (`packages/enforma/src/components/types.ts`)

Add `labelPlacement` to `CheckboxProps` and `ResolvedCheckboxProps`. Alias Switch types:

```ts
export type CheckboxProps = CommonProps & {
  labelPlacement?: Reactive<'end' | 'start' | 'top' | 'bottom'>;
};

export type ResolvedCheckboxProps = Omit<ResolvedCommonProps, 'value' | 'setValue'> & {
  value: boolean | undefined;
  setValue: (value: boolean) => void;
  labelPlacement?: 'end' | 'start' | 'top' | 'bottom';
};

export type SwitchProps = CheckboxProps;
export type ResolvedSwitchProps = ResolvedCheckboxProps;
```

## Dispatch Components (`packages/enforma/src/components/fields.tsx`)

`Checkbox` dispatch already exists — update its generic type to `ResolvedCheckboxProps` (now includes `labelPlacement`). Add `Switch`:

```ts
export const Switch = memo(
  (props: SwitchProps) => dispatchComponent('Switch', useFieldProps<ResolvedSwitchProps>(props)),
  stablePropsEqual,
);
```

## Registry (`packages/enforma/src/components/registry.ts`)

Add `Switch: ResolvedSwitchProps` to `ComponentPropsMap`. `Checkbox` is already present.

## MUI Adapters (`packages/enforma-mui/src/components/`)

- `Checkbox.tsx` — `FormControlLabel` + MUI `Checkbox`, `checked={value ?? false}`, toggle via `setValue(!value)`
- `Switch.tsx` — same structure, MUI `Switch` instead of `Checkbox`

Both support all three MUI variants (classic / outlined / standard) and pass `labelPlacement` to `FormControlLabel`.

## Demo (`apps/demo`)

Add both components to the demo form. Include at least one reactive `disabled` example and one validation example.

## Tests

Unit tests per component covering: toggle on click, disabled state, label render, `labelPlacement` prop.
