# Calculated Component Design

**Date:** 2026-03-08

## Summary

Add a `Calculated` component that derives a value from the rest of the form. When a `bind` prop is present, the computed value is synced back into the form store. When `bind` is absent, the component is display-only.

## Props

### User-facing: `CalculatedProps<T>`

```typescript
type CalculatedProps<T = unknown> = {
  bind?: string
  value: Reactive<T>           // required — computation function or static value
  label?: Reactive<string>
  description?: Reactive<string>
  disabled?: Reactive<boolean>
}
```

### Adapter-facing: `ResolvedCalculatedProps`

```typescript
type ResolvedCalculatedProps = {
  value: unknown
  label: string | undefined
  description: string | undefined
  disabled: boolean | undefined
}
```

No `setValue`, `error`, `showError`, or `onBlur` — the field is read-only.

## Component Registry

`ComponentPropsMap` gets a new entry:

```typescript
Calculated: ResolvedCalculatedProps
```

## Dispatch Component

Lives in `packages/enforma/src/components/fields.tsx`. Responsibilities:

1. Resolve `value` via `useReactiveProp`
2. Resolve `label`, `description`, `disabled` via `useReactiveProp`
3. If `bind` is present, write the resolved value into the store via `useEffect` whenever it changes
4. Look up the registered adapter via `getComponent('Calculated')` and render it

```typescript
function Calculated<T = unknown>({ bind, value, label, description, disabled }: CalculatedProps<T>) {
  const resolvedValue = useReactiveProp(value)
  const resolvedLabel = useReactiveProp(label)
  const resolvedDescription = useReactiveProp(description)
  const resolvedDisabled = useReactiveProp(disabled)

  const [, setValue] = useFormValue<T>(bind ?? '')
  useEffect(() => {
    if (bind != null) setValue(resolvedValue)
  }, [resolvedValue, bind])

  const Component = getComponent('Calculated')
  if (!Component) return null
  return (
    <Component
      value={resolvedValue}
      label={resolvedLabel}
      description={resolvedDescription}
      disabled={resolvedDisabled}
    />
  )
}
```

## MUI Adapter

Lives in `packages/enforma-mui/src/components/Calculated.tsx`. Renders as a read-only `TextField` matching the layout of all other form fields:

```typescript
export function Calculated({ value, label, description, disabled }: ResolvedCalculatedProps) {
  return (
    <ComponentWrap>
      <TextField
        value={value != null ? String(value) : ''}
        label={label}
        helperText={description}
        disabled={disabled}
        slotProps={{ input: { readOnly: true } }}
        fullWidth
      />
    </ComponentWrap>
  )
}
```

- `value` is coerced to string via `String(value)` for display
- `readOnly` prevents editing while keeping the same visual style as other fields

## Files to Change

| File | Change |
|------|--------|
| `packages/enforma/src/components/types.ts` | Add `CalculatedProps<T>`, `ResolvedCalculatedProps`, `ComponentPropsMap.Calculated` |
| `packages/enforma/src/components/fields.tsx` | Add `Calculated` dispatch component |
| `packages/enforma/src/index.ts` | Export `Calculated` |
| `packages/enforma-mui/src/components/Calculated.tsx` | New file — MUI adapter |
| `packages/enforma-mui/src/index.ts` | Add `Calculated` to default export |
| `apps/demo/src/App.tsx` | Add usage example |
