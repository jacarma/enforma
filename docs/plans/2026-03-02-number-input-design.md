# NumberInput Design

Date: 2026-03-02

## Scope

Add `NumberInput` to enforma and enforma-mui: a numeric field that stores a `number | undefined`
value, uses IMask's Number mask for display formatting, and integrates cleanly with the existing
validation system.

Spinner is explicitly out of scope for this iteration.

---

## What already exists (no changes needed)

Reading the source revealed the core architecture is already in place:

- `onChange(values, ValidationState)` — `Form` already passes `{ isValid, errors }` as a second
  argument on every change.
- Eager validators — `FormStore.setField` already calls `runAllValidators()` on every value change,
  so `isValid` is always current.
- `implicitValidator` — `useFieldValidation` already accepts an optional `implicitValidator` that
  returns a message key, resolves it through the `messages` / `formMessages` chain, and shows the
  error after blur or submit — identical behaviour to user `validate()` functions.

The only missing wire: `useFieldProps` does not currently forward an `implicitValidator` to
`useFieldValidation`. Everything else is ready.

---

## Changes required

### 1. Wire `implicitValidator` through `useFieldProps` (enforma core)

`useFieldProps` accepts an optional second argument:

```typescript
useFieldProps<R>(props, options?: { implicitValidator?: () => string | null })
```

It passes `options.implicitValidator` through to `useFieldValidation`. This is a small, additive
change with no impact on existing fields.

### 2. Add types (enforma — `types.ts`)

**User-facing props:**

```typescript
type NumberInputProps = CommonProps & {
  decimalScale?:     Reactive<number>;
  decimalSeparator?: Reactive<'intl' | string>;
  thousandSeparator?: Reactive<false | 'intl' | string>;
  allowNegative?:    Reactive<boolean>;
  min?:              Reactive<number>;
  max?:              Reactive<number>;
};
```

**Resolved props (what the MUI adapter receives):**

```typescript
type ResolvedNumberInputProps = Omit<ResolvedCommonProps, 'value' | 'setValue'> & {
  value:             number | undefined;
  setValue:          (value: number | undefined) => void;
  decimalScale?:     number;
  decimalSeparator?: 'intl' | string;
  thousandSeparator?: false | 'intl' | string;
  allowNegative?:    boolean;
  min?:              number;
  max?:              number;
};
```

Add `NumberInput: ResolvedNumberInputProps` to `ComponentPropsMap`.

Export both types and their resolved counterparts from `enforma/src/index.ts`.

### 3. Dispatch function (enforma — `fields.tsx`)

```typescript
function NumberInputDispatch(props: NumberInputProps) {
  return dispatchComponent(
    'NumberInput',
    useFieldProps<ResolvedNumberInputProps>(props, {
      implicitValidator: () => {
        const v = /* current value from store */;
        if (v === undefined) return null;
        if (typeof v !== 'number' || isNaN(v)) return 'invalidNumber';
        return null;
      },
    }),
  );
}

export const NumberInput = memo(NumberInputDispatch, stablePropsEqual);
```

The implicit validator produces the message key `'invalidNumber'`. Users can override the text:

```tsx
<Enforma.NumberInput bind="price" messages={{ invalidNumber: 'Must be a valid number' }} />
```

Errors follow the existing showError rules: visible only after blur or submit.

### 4. MUI adapter — `NumberInput.tsx` (enforma-mui)

Uses IMask's Number mask via `react-imask` (already an optional peer dependency).
Lazy-loaded identically to the TextInput mask path.

**Separator defaults — Intl auto-detection:**

```typescript
function getIntlSeparators(locale?: string) {
  try {
    const parts = new Intl.NumberFormat(locale ?? navigator.language)
      .formatToParts(1234.56);
    return {
      radix:             parts.find(p => p.type === 'decimal')?.value ?? '.',
      thousandsSeparator: parts.find(p => p.type === 'group')?.value  ?? ',',
    };
  } catch {
    return { radix: '.', thousandsSeparator: ',' }; // SSR / unsupported locale fallback
  }
}
```

Prop mapping to IMask Number mask options:

| Prop | IMask option | Default |
|---|---|---|
| `decimalScale` | `scale` | `undefined` (unlimited) |
| `decimalSeparator` | `radix` | `'intl'` → auto-detected |
| `thousandSeparator` | `thousandsSeparator` | `'intl'` → auto-detected |
| `allowNegative` | `signed` | `true` |
| `min` | `min` | `undefined` |
| `max` | `max` | `undefined` |

When `thousandSeparator` is `false`, `thousandsSeparator` is set to `''`.

**Local display state — preserving mid-typing input:**

The adapter keeps a local `displayValue: string` alongside the form's numeric value. This prevents
IMask from losing partial input (e.g. the trailing `"."` in `"1."`) when form state re-renders.

```typescript
const [displayValue, setDisplayValue] = useState(
  () => value !== undefined ? String(value) : '',
);

// Sync from external form changes (reset, programmatic update).
// Does NOT fire when the user is typing, because typing only changes
// value when typedValue changes — and "1." has the same typedValue (1)
// as "1", so the form value doesn't change between those keystrokes.
useEffect(() => {
  setDisplayValue(value !== undefined ? String(value) : '');
}, [value]);

const handleAccept = (maskedValue: string, mask: MaskedNumber) => {
  setDisplayValue(maskedValue);
  const typed = mask.typedValue;
  setValue(typeof typed === 'number' && !isNaN(typed) ? typed : undefined);
};
```

IMask normalises trailing decimals (e.g. `"1."` → `"1"`) on blur, so the display and form value
are always consistent when the user leaves the field.

**Variant support:**

Follows `MuiVariantContext` (classic / outlined / standard) identically to `TextInput`, using
`TextField` with number-specific `slotProps`:

```tsx
slotProps={{
  htmlInput: {
    inputMode: 'decimal',
    // Hide native browser spin arrows:
    sx: {
      MozAppearance: 'textfield',
      '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
        WebkitAppearance: 'none',
      },
    },
  },
}}
```

The IMask `Number` mask is applied via the same `inputComponent` / `MaskAdapter` pattern used by
the existing masked TextInput.

### 5. Registration (enforma-mui — `index.ts`)

```typescript
const numericComponents = { NumberInput } satisfies Partial<EnformaComponentRegistry>;

export const classic  = { ..., ...numericComponents };
export const outlined = { ..., ...numericComponents };
export const standard = { ..., ...numericComponents };
```

---

## Separator API summary

| Prop | Value | Effect |
|---|---|---|
| `thousandSeparator` | `'intl'` (default) | auto-detect from browser locale |
| `thousandSeparator` | `false` | no grouping |
| `thousandSeparator` | `' '` | space-separated groups |
| `decimalSeparator` | `'intl'` (default) | auto-detect from browser locale |
| `decimalSeparator` | `','` | explicit comma |

Both default to `'intl'`. If `thousandSeparator` is `'intl'`, `decimalSeparator` also defaults to
`'intl'` so they are always consistent.

---

## Tests (`NumberInput.test.tsx` in enforma-mui)

Following the same pattern as `Checkbox.test.tsx`:

- Renders the input accessible by role and label
- Displays `undefined` (empty) when form value is not set
- Displays formatted value when form value is a number
- Calls `onChange` with the numeric value when user types
- Calls `onChange` with `undefined` when user clears the field
- Respects `disabled` prop
- Shows `description` when no error
- Shows type error (`invalidNumber`) after blur when value is invalid
- Shows user `validate()` error after blur
- Respects `messages={{ invalidNumber: '...' }}` override
- Respects `min` and `max` constraints

---

## Demo

Add a "Numeric Fields" section to `apps/demo/src/App.tsx` showing:

```tsx
<Enforma.NumberInput bind="price" label="Price" />
<Enforma.NumberInput bind="quantity" label="Quantity (integer)" decimalScale={0} />
<Enforma.NumberInput bind="rate" label="Rate (%)" min={0} max={100} allowNegative={false} />
```

---

## Files changed

| File | Change |
|---|---|
| `packages/enforma/src/hooks/useField.ts` | Wire `implicitValidator` through `useFieldProps` |
| `packages/enforma/src/components/types.ts` | Add `NumberInputProps`, `ResolvedNumberInputProps`, update `ComponentPropsMap` |
| `packages/enforma/src/components/fields.tsx` | Add `NumberInputDispatch`, export `NumberInput` |
| `packages/enforma/src/index.ts` | Export new types |
| `packages/enforma-mui/src/components/NumberInput.tsx` | New MUI adapter |
| `packages/enforma-mui/src/components/NumberInput.test.tsx` | Tests |
| `packages/enforma-mui/src/index.ts` | Register `NumberInput` in all bundles |
| `apps/demo/src/App.tsx` | Add Numeric Fields demo section |
| `todo.md` | Mark `NumberInput` as done |
