# NumberInput Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `NumberInput` field that stores `number | undefined`, formats with IMask's Number mask, and integrates with the existing type-validator system.

**Architecture:** Wire a `typeValidator` option through `useFieldProps` → `useFieldValidation` so dispatch functions can register implicit type-level validation. The MUI adapter lazy-loads `react-imask` (already a peer dep), keeps a local `displayValue` string so IMask never loses mid-type characters (e.g. `"1."`), and calls `setValue` with the parsed `typedValue`.

**Tech Stack:** TypeScript strict, React 18, IMask / react-imask (Number mask), MUI v6, Vitest + @testing-library/react.

---

### Key discovery

`Form` already passes `{ isValid, errors }` as the second argument to `onChange`; `FormStore` already calls `runAllValidators()` on every `setField`. No store or Form changes are needed.

---

## Task 1 — Wire `typeValidator` through `useFieldProps` / `useFieldValidation`

**Files:**
- Modify: `packages/enforma/src/hooks/useField.ts`
- Modify (tests): `packages/enforma/src/components/Form.test.tsx`

### Step 1 — Write the failing tests

Add at the bottom of `Form.test.tsx`:

```tsx
describe('typeValidator', () => {
  it('shows the message key as error after blur when typeValidator fails', async () => {
    function TypedField({ bind }: { bind: string }) {
      const { error, showError, onBlur } = useFieldProps<FieldResolved<number>>(
        { bind },
        { typeValidator: (v) => (typeof v === 'number' || v === undefined ? null : 'badType') },
      );
      return (
        <div>
          <button aria-label={bind} onBlur={onBlur} />
          {showError && <span>{error}</span>}
        </div>
      );
    }

    render(
      <Form values={{ qty: 'not-a-number' }} onChange={vi.fn()}>
        <TypedField bind="qty" />
      </Form>,
    );

    screen.getByRole('button', { name: 'qty' }).focus();
    await userEvent.tab();
    expect(await screen.findByText('badType')).toBeInTheDocument();
  });

  it('resolves the message key through the messages prop', async () => {
    function TypedField({ bind }: { bind: string }) {
      const { error, showError, onBlur } = useFieldProps<FieldResolved<number>>(
        { bind, messages: { badType: 'Not a valid number' } },
        { typeValidator: (v) => (typeof v === 'number' || v === undefined ? null : 'badType') },
      );
      return (
        <div>
          <button aria-label={bind} onBlur={onBlur} />
          {showError && <span>{error}</span>}
        </div>
      );
    }

    render(
      <Form values={{ qty: 'bad' }} onChange={vi.fn()}>
        <TypedField bind="qty" />
      </Form>,
    );

    screen.getByRole('button', { name: 'qty' }).focus();
    await userEvent.tab();
    expect(await screen.findByText('Not a valid number')).toBeInTheDocument();
  });

  it('reports isValid=false in onChange when typeValidator fails', async () => {
    const onChange = vi.fn();

    function TypedField({ bind }: { bind: string }) {
      const { onBlur, setValue } = useFieldProps<FieldResolved<number>>(
        { bind },
        { typeValidator: (v) => (typeof v === 'number' || v === undefined ? null : 'badType') },
      );
      return (
        <input
          aria-label={bind}
          onChange={(e) => { setValue(e.target.value as unknown as number); }}
          onBlur={onBlur}
        />
      );
    }

    render(
      <Form values={{ qty: 'bad' }} onChange={onChange}>
        <TypedField bind="qty" />
      </Form>,
    );

    // onChange fires on mount for initial value — check it reports invalid
    expect(onChange).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ isValid: false }),
    );
  });
});
```

### Step 2 — Run to verify they fail

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm test --filter enforma 2>&1 | tail -20
```

Expected: 3 failing tests mentioning `typeValidator`.

### Step 3 — Implement `typeValidator` in `useFieldValidation`

In `packages/enforma/src/hooks/useField.ts`, make these changes:

**a) Add the `typeValidator` parameter and ref** (in `useFieldValidation`, after the existing `implicitValidatorRef`):

```typescript
// Add 5th parameter:
export function useFieldValidation(
  bind: string,
  validate:
    | ((value: unknown, scopeValues: FormValues, allValues: FormValues) => string | null)
    | undefined,
  localMessages: Partial<Record<string, string>> | undefined,
  implicitValidator?: () => string | null,
  typeValidator?: (value: unknown) => string | null,
): { error: string | null; showError: boolean; onBlur: () => void } {
```

**b) Add the typeValidator ref** after the existing `implicitValidatorRef`:

```typescript
const typeValidatorRef = useRef(typeValidator);
typeValidatorRef.current = typeValidator;
```

**c) Update the `useEffect` guard** to also bail out when no typeValidator:

```typescript
useEffect(() => {
  if (
    validateRef.current === undefined &&
    implicitValidatorRef.current === undefined &&
    typeValidatorRef.current === undefined
  )
    return;
```

**d) Add the type-validator check inside `combinedValidator`**, before the implicit-validator block:

```typescript
const combinedValidator = (): string | null => {
  // 0. Type validator — runs before user validators; error is shown after blur like all others.
  const typeValidatorFn = typeValidatorRef.current;
  if (typeValidatorFn !== undefined) {
    const fieldValue = store.getField(fullPath);
    const key = typeValidatorFn(fieldValue);
    if (key !== null) {
      return localMessagesRef.current?.[key] ?? formMessagesRef.current[key] ?? key;
    }
  }

  // 1. Implicit check … (existing code unchanged)
```

### Step 4 — Wire `typeValidator` through `useFieldProps`

In `useFieldProps`, add the optional second argument and pass it to `useFieldValidation`:

```typescript
export function useFieldProps<R extends { value: unknown; setValue: (v: never) => void }>(
  props: ToComponentProps<R>,
  options?: { typeValidator?: (value: unknown) => string | null },
): R {
  const { bind, validate, messages, ...reactiveProps } = props;
  // … (rest unchanged) …
  return {
    value,
    setValue,
    ...resolvedExtras,
    ...useFieldValidation(bind, validate, messages, undefined, options?.typeValidator),
  } as unknown as R;
}
```

### Step 5 — Run tests to verify they pass

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm test --filter enforma 2>&1 | tail -20
```

Expected: all passing.

### Step 6 — Typecheck and lint

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm typecheck && pnpm lint
```

Expected: no errors.

### Step 7 — Commit

```bash
git add packages/enforma/src/hooks/useField.ts packages/enforma/src/components/Form.test.tsx
git commit -m "$(cat <<'EOF'
feat(enforma): add typeValidator option to useFieldProps

Dispatch functions can now register a type-level implicit validator
that contributes to isValid and shows errors after blur, identical
to user-provided validate() but keyed through the messages system.
EOF
)"
```

---

## Task 2 — Add NumberInput types and dispatch to enforma

**Files:**
- Modify: `packages/enforma/src/components/types.ts`
- Modify: `packages/enforma/src/components/fields.tsx`
- Modify: `packages/enforma/src/index.ts`

### Step 1 — Add types to `types.ts`

**a) Add `NumberInputProps`** after `SwitchProps`:

```typescript
export type NumberInputProps = CommonProps & {
  decimalScale?: Reactive<number>;
  decimalSeparator?: Reactive<'intl' | string>;
  thousandSeparator?: Reactive<false | 'intl' | string>;
  allowNegative?: Reactive<boolean>;
  min?: Reactive<number>;
  max?: Reactive<number>;
};
```

**b) Add `ResolvedNumberInputProps`** after `ResolvedSwitchProps`:

```typescript
export type ResolvedNumberInputProps = Omit<ResolvedCommonProps, 'value' | 'setValue'> & {
  value: number | undefined;
  setValue: (value: number | undefined) => void;
  decimalScale?: number;
  decimalSeparator?: 'intl' | string;
  thousandSeparator?: false | 'intl' | string;
  allowNegative?: boolean;
  min?: number;
  max?: number;
};
```

**c) Add to `ComponentPropsMap`**:

```typescript
export type ComponentPropsMap = {
  // … existing entries …
  NumberInput: ResolvedNumberInputProps;
};
```

### Step 2 — Add dispatch to `fields.tsx`

**a) Add the import** (add `NumberInputProps` and `ResolvedNumberInputProps` to the existing type imports from `'./types'`).

**b) Add the dispatch function** after `SwitchDispatch`:

```typescript
function NumberInputDispatch(props: NumberInputProps) {
  return dispatchComponent(
    'NumberInput',
    useFieldProps<ResolvedNumberInputProps>(props, {
      typeValidator: (v): string | null => {
        if (v === undefined) return null;
        if (typeof v !== 'number' || isNaN(v as number)) return 'invalidNumber';
        return null;
      },
    }),
  );
}
```

**c) Export** (add to the bottom exports):

```typescript
export const NumberInput = memo(NumberInputDispatch, stablePropsEqual);
```

### Step 3 — Export from `index.ts`

Add to the appropriate export blocks:

```typescript
// In the field component exports:
export { Form, Scope, List };
// Add:
// (NumberInput is exported via the fields spread, but add explicit named export too)

// In the type exports, add:
export type {
  // … existing …
  NumberInputProps,
} from './components/types';

export type {
  // … existing …
  ResolvedNumberInputProps,
} from './components/types';
```

Also add `NumberInput` to the `Enforma` default export object in `index.ts`:

```typescript
// The fields.tsx re-export handles this via the * re-export pattern —
// check that NumberInput appears in the `fields` spread. If the existing
// pattern is `import * as fields from './components/fields'` then
// NumberInput is automatically included. Verify with typecheck.
```

### Step 4 — Typecheck

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm typecheck
```

Expected: no errors.

### Step 5 — Commit

```bash
git add packages/enforma/src/components/types.ts \
        packages/enforma/src/components/fields.tsx \
        packages/enforma/src/index.ts
git commit -m "$(cat <<'EOF'
feat(enforma): add NumberInput field type and dispatch

Stores number | undefined. TypeValidator rejects non-numeric values
with the 'invalidNumber' message key, shown after blur or submit.
EOF
)"
```

---

## Task 3 — Build the MUI NumberInput adapter

**Files:**
- Create: `packages/enforma-mui/src/components/NumberInput.tsx`

Create the file with this full content:

```tsx
import { forwardRef, lazy, Suspense, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import { FormLabel, TextField } from '@mui/material';
import type { ResolvedNumberInputProps } from 'enforma';
import { ComponentWrap } from './ComponentWrap';
import { MuiVariantContext } from '../context/MuiVariantContext';

// ── Intl separator detection ─────────────────────────────────────────────────

function getIntlSeparators(): { radix: string; thousandsSeparator: string } {
  try {
    const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US';
    const parts = new Intl.NumberFormat(locale).formatToParts(1234.56);
    return {
      radix: parts.find((p) => p.type === 'decimal')?.value ?? '.',
      thousandsSeparator: parts.find((p) => p.type === 'group')?.value ?? ',',
    };
  } catch {
    return { radix: '.', thousandsSeparator: ',' };
  }
}

// ── Types for the mask adapter ────────────────────────────────────────────────

type MaskedNumberOptions = {
  mask: NumberConstructor;
  scale?: number;
  signed?: boolean;
  radix?: string;
  thousandsSeparator?: string;
  min?: number;
  max?: number;
};

type MaskRef = { typedValue: number | null | undefined };

type NumberMaskAdapterProps = React.InputHTMLAttributes<HTMLInputElement> & {
  inputRef: React.Ref<HTMLInputElement>;
  maskOptions: MaskedNumberOptions;
  onTypedValueChange: (value: number | undefined) => void;
};

// ── Skeleton shown while react-imask lazy-loads ───────────────────────────────

function NumberInputSkeleton({
  label,
  disabled,
  placeholder,
  description,
  error,
  showError,
  onBlur,
  value,
}: ResolvedNumberInputProps) {
  const variant = useContext(MuiVariantContext);
  const id = useId();
  const displayValue = value !== undefined ? String(value) : '';

  const commonProps = {
    value: displayValue,
    onChange: () => undefined,
    onBlur,
    disabled: true, // disabled while loading
    placeholder: placeholder ?? '',
    fullWidth: true,
    error: showError,
    helperText: showError ? error : description,
  } as const;

  if (variant === 'classic') {
    return (
      <ComponentWrap error={showError} disabled={disabled}>
        {label !== undefined && <FormLabel htmlFor={id}>{label}</FormLabel>}
        <TextField
          {...commonProps}
          variant="outlined"
          size="small"
          slotProps={{ htmlInput: { id } }}
        />
      </ComponentWrap>
    );
  }

  return (
    <ComponentWrap error={showError} disabled={disabled}>
      <TextField {...commonProps} label={label} variant={variant} />
    </ComponentWrap>
  );
}

// ── Lazy-loaded component that requires react-imask ───────────────────────────

type IMaskInputType = React.ComponentType<{
  value: string;
  inputRef: React.Ref<HTMLInputElement>;
  onAccept: (value: string, mask: MaskRef) => void;
  [key: string]: unknown;
}>;

const LazyNumberInput = lazy(() =>
  import('react-imask')
    .then(({ IMaskInput: rawIMaskInput }) => {
      const IMaskInput = rawIMaskInput as unknown as IMaskInputType;

      // forwardRef adapter — bridges MUI TextField's inputComponent slot to IMaskInput
      const NumberMaskAdapter = forwardRef<HTMLInputElement, NumberMaskAdapterProps>(
        ({ onChange, onTypedValueChange, inputRef, maskOptions, value, ...other }, _ref) => (
          <IMaskInput
            {...other}
            {...(maskOptions as Record<string, unknown>)}
            value={typeof value === 'string' ? value : ''}
            inputRef={inputRef}
            onAccept={(maskedValue, mask) => {
              onChange?.({
                target: { value: maskedValue },
              } as React.ChangeEvent<HTMLInputElement>);
              const typed = mask.typedValue;
              onTypedValueChange(typeof typed === 'number' && !isNaN(typed) ? typed : undefined);
            }}
          />
        ),
      );
      NumberMaskAdapter.displayName = 'NumberMaskAdapter';

      function NumberInputImpl({
        value,
        setValue,
        label,
        disabled = false,
        placeholder,
        description,
        error,
        showError,
        onBlur,
        decimalScale,
        decimalSeparator = 'intl',
        thousandSeparator = 'intl',
        allowNegative = true,
        min,
        max,
      }: ResolvedNumberInputProps) {
        const variant = useContext(MuiVariantContext);
        const id = useId();

        const intlSeps = useMemo(getIntlSeparators, []);
        const radix = decimalSeparator === 'intl' ? intlSeps.radix : decimalSeparator;
        const thousSep =
          thousandSeparator === false
            ? ''
            : thousandSeparator === 'intl'
              ? intlSeps.thousandsSeparator
              : thousandSeparator;

        const maskOptions: MaskedNumberOptions = {
          mask: Number,
          ...(decimalScale !== undefined && { scale: decimalScale }),
          signed: allowNegative,
          radix,
          thousandsSeparator: thousSep,
          ...(min !== undefined && { min }),
          ...(max !== undefined && { max }),
        };

        // Keep a local display string so IMask never loses mid-type chars (e.g. "1.")
        const [displayValue, setDisplayValue] = useState(
          () => (value !== undefined ? String(value) : ''),
        );

        // Sync from external form changes (form reset, programmatic update).
        // Does NOT fire when user is mid-typing, because typing "1." leaves
        // form value at 1 (same as after "1"), so value prop does not change.
        const prevValueRef = useRef(value);
        useEffect(() => {
          if (prevValueRef.current === value) return;
          prevValueRef.current = value;
          setDisplayValue(value !== undefined ? String(value) : '');
        }, [value]);

        const slotProps = {
          input: {
            inputComponent: NumberMaskAdapter as unknown as React.ComponentType<object>,
          },
          htmlInput: {
            maskOptions,
            onTypedValueChange: setValue,
          } as unknown as React.InputHTMLAttributes<HTMLInputElement>,
        };

        const commonProps = {
          value: displayValue,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
            setDisplayValue(e.target.value);
          },
          onBlur,
          disabled,
          placeholder: placeholder ?? '',
          fullWidth: true,
          error: showError,
          helperText: showError ? error : description,
          color: showError ? ('error' as const) : ('primary' as const),
        };

        if (variant === 'classic') {
          return (
            <ComponentWrap error={showError} disabled={disabled}>
              {label !== undefined && <FormLabel htmlFor={id}>{label}</FormLabel>}
              <TextField
                {...commonProps}
                variant="outlined"
                size="small"
                slotProps={{
                  ...slotProps,
                  htmlInput: {
                    ...(slotProps.htmlInput as object),
                    id,
                  } as unknown as React.InputHTMLAttributes<HTMLInputElement>,
                }}
              />
            </ComponentWrap>
          );
        }

        return (
          <ComponentWrap error={showError} disabled={disabled}>
            <TextField {...commonProps} label={label} variant={variant} slotProps={slotProps} />
          </ComponentWrap>
        );
      }
      NumberInputImpl.displayName = 'NumberInput';

      return { default: NumberInputImpl };
    })
    .catch(() => {
      throw new Error(
        'enforma-mui: NumberInput requires `react-imask`. Run: pnpm add react-imask imask',
      );
    }),
);

// ── Public export ─────────────────────────────────────────────────────────────

export function NumberInput(props: ResolvedNumberInputProps) {
  return (
    <Suspense fallback={<NumberInputSkeleton {...props} />}>
      <LazyNumberInput {...props} />
    </Suspense>
  );
}
```

### Step 2 — Typecheck

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm --filter enforma-mui typecheck 2>&1 | tail -30
```

Fix any type errors before continuing.

### Step 3 — Commit

```bash
git add packages/enforma-mui/src/components/NumberInput.tsx
git commit -m "$(cat <<'EOF'
feat(enforma-mui): add NumberInput adapter with IMask Number mask

Lazy-loads react-imask. Keeps local displayValue to preserve mid-type
chars (e.g. "1."). Intl separator detection as default. Stores
number | undefined in form state via mask.typedValue.
EOF
)"
```

---

## Task 4 — Write tests for the MUI NumberInput

**Files:**
- Create: `packages/enforma-mui/src/components/NumberInput.test.tsx`

### Step 1 — Create the test file

```tsx
import React, { forwardRef } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Enforma, { Form, registerComponents, clearRegistry } from 'enforma';
import { NumberInput } from './NumberInput';

// ── Mock react-imask ──────────────────────────────────────────────────────────
// Simulates IMask's Number mask: onChange fires onAccept(maskedValue, { typedValue })
vi.mock('react-imask', () => ({
  IMaskInput: forwardRef(
    ({
      onAccept,
      inputRef,
      value,
      ...rest
    }: {
      onAccept: (v: string, mask: { typedValue: number | null }) => void;
      inputRef: React.Ref<HTMLInputElement>;
      value: string;
    }) => (
      <input
        {...rest}
        ref={inputRef}
        value={value}
        data-testid="imask-input"
        onChange={(e) => {
          const raw = e.target.value;
          const parsed = parseFloat(raw);
          onAccept(raw, { typedValue: isNaN(parsed) ? null : parsed });
        }}
      />
    ),
  ),
}));

beforeEach(() => {
  clearRegistry();
  registerComponents({ NumberInput });
});

describe('MUI NumberInput', () => {
  it('renders an input accessible by label', async () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.NumberInput bind="price" label="Price" />
      </Form>,
    );
    expect(await screen.findByTestId('imask-input')).toBeInTheDocument();
  });

  it('displays empty string when form value is undefined', async () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.NumberInput bind="price" label="Price" />
      </Form>,
    );
    expect(await screen.findByTestId('imask-input')).toHaveValue('');
  });

  it('displays stringified value when form value is a number', async () => {
    render(
      <Form values={{ price: 42 }} onChange={() => undefined}>
        <Enforma.NumberInput bind="price" label="Price" />
      </Form>,
    );
    expect(await screen.findByTestId('imask-input')).toHaveValue('42');
  });

  it('calls onChange with a number when user types', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ price: undefined }} onChange={onChange}>
        <Enforma.NumberInput bind="price" label="Price" />
      </Form>,
    );
    const input = await screen.findByTestId('imask-input');
    await userEvent.type(input, '9');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ price: 9 }),
      expect.anything(),
    );
  });

  it('calls onChange with undefined when user clears the field', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ price: 5 }} onChange={onChange}>
        <Enforma.NumberInput bind="price" label="Price" />
      </Form>,
    );
    const input = await screen.findByTestId('imask-input');
    await userEvent.clear(input);
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ price: undefined }),
      expect.anything(),
    );
  });

  it('is disabled when disabled prop is true', async () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.NumberInput bind="price" label="Price" disabled />
      </Form>,
    );
    expect(await screen.findByTestId('imask-input')).toBeDisabled();
  });

  it('shows description when there is no error', async () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.NumberInput bind="price" label="Price" description="Enter amount in USD" />
      </Form>,
    );
    await screen.findByTestId('imask-input');
    expect(screen.getByText('Enter amount in USD')).toBeInTheDocument();
  });

  it('shows user validate() error after blur', async () => {
    render(
      <Form values={{ price: undefined }} onChange={() => undefined}>
        <Enforma.NumberInput
          bind="price"
          label="Price"
          validate={(v) => (v === undefined ? 'Price is required' : null)}
        />
      </Form>,
    );
    const input = await screen.findByTestId('imask-input');
    input.focus();
    await userEvent.tab();
    expect(await screen.findByText('Price is required')).toBeInTheDocument();
  });

  it('does not show error before blur', async () => {
    render(
      <Form values={{ price: undefined }} onChange={() => undefined}>
        <Enforma.NumberInput
          bind="price"
          label="Price"
          validate={(v) => (v === undefined ? 'Price is required' : null)}
        />
      </Form>,
    );
    await screen.findByTestId('imask-input');
    expect(screen.queryByText('Price is required')).not.toBeInTheDocument();
  });

  it('reveals all errors on submit', async () => {
    render(
      <Form values={{ price: undefined }} onChange={() => undefined}>
        <Enforma.NumberInput
          bind="price"
          label="Price"
          validate={(v) => (v === undefined ? 'Price is required' : null)}
        />
        <button type="submit">Submit</button>
      </Form>,
    );
    await screen.findByTestId('imask-input');
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByText('Price is required')).toBeInTheDocument();
  });

  it('reports isValid=false in onChange when field has an error', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ price: undefined }} onChange={onChange}>
        <Enforma.NumberInput
          bind="price"
          label="Price"
          validate={(v) => (v === undefined ? 'required' : null)}
        />
      </Form>,
    );
    await screen.findByTestId('imask-input');
    expect(onChange).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ isValid: false }),
    );
  });
});

describe('MUI NumberInput — missing react-imask', () => {
  it('throws a clear error when react-imask is not installed', async () => {
    vi.resetModules();
    vi.doMock('react-imask', () => {
      throw new Error("Cannot find module 'react-imask'");
    });

    const { NumberInput: FreshNumberInput } = await import('./NumberInput');

    const errors: Error[] = [];
    class ErrorBoundary extends React.Component<
      { children: React.ReactNode },
      { error: Error | null }
    > {
      state = { error: null as Error | null };
      static getDerivedStateFromError(error: Error) {
        return { error };
      }
      componentDidCatch(error: Error) {
        errors.push(error);
      }
      render() {
        if (this.state.error !== null) return null;
        return this.props.children;
      }
    }

    render(
      <ErrorBoundary>
        <FreshNumberInput
          value={undefined}
          setValue={() => undefined}
          label="Price"
          disabled={false}
          placeholder={undefined}
          description={undefined}
          error={null}
          showError={false}
          onBlur={() => undefined}
        />
      </ErrorBoundary>,
    );

    await waitFor(() => {
      expect(errors[0]?.message).toMatch('pnpm add react-imask imask');
    });
  });
});
```

### Step 2 — Run tests to verify they pass

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm --filter enforma-mui test 2>&1 | tail -30
```

Expected: all new tests pass.

### Step 3 — Commit

```bash
git add packages/enforma-mui/src/components/NumberInput.test.tsx
git commit -m "$(cat <<'EOF'
test(enforma-mui): add NumberInput adapter tests

Covers: renders, value display, onChange with number/undefined,
disabled, description, validate errors, submit reveal, isValid flag,
missing react-imask error message.
EOF
)"
```

---

## Task 5 — Register NumberInput in all bundles and update exports

**Files:**
- Modify: `packages/enforma-mui/src/index.ts`

### Step 1 — Update `index.ts`

Add the import after the `Switch` import:

```typescript
import { NumberInput } from './components/NumberInput';
```

Add a `numericComponents` group (after `booleanComponents`):

```typescript
const numericComponents = { NumberInput } satisfies Partial<EnformaComponentRegistry>;
```

Spread it into all three bundles:

```typescript
export const classic: Partial<EnformaComponentRegistry> = {
  // … existing …
  ...numericComponents,
};
export const outlined: Partial<EnformaComponentRegistry> = {
  // … existing …
  ...numericComponents,
};
export const standard: Partial<EnformaComponentRegistry> = {
  // … existing …
  ...numericComponents,
};
```

Add `NumberInput` to the named exports at the bottom:

```typescript
export {
  TextInput,
  Checkbox,
  Switch,
  NumberInput,   // ← add
  Fieldset,
  // … rest unchanged …
};
```

### Step 2 — Typecheck and full test run

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm typecheck && pnpm lint && pnpm test
```

Expected: all passing, no errors.

### Step 3 — Commit

```bash
git add packages/enforma-mui/src/index.ts
git commit -m "$(cat <<'EOF'
feat(enforma-mui): register NumberInput in all bundles and exports
EOF
)"
```

---

## Task 6 — Add demo section and update todo

**Files:**
- Modify: `apps/demo/src/App.tsx`
- Modify: `todo.md`

### Step 1 — Add Numeric Fields section to `App.tsx`

Add a new state variable near the other state declarations:

```typescript
const [numericValues, setNumericValues] = useState<FormValues>({});
```

Add the section after the Boolean Fields section (after the `</pre>` and `<hr>`):

```tsx
<hr style={{ margin: '2rem 0' }} />

<h2>Numeric Fields</h2>
<p style={{ color: '#555', marginBottom: '1rem' }}>
  <code>NumberInput</code> stores a <code>number | undefined</code> and formats using IMask's
  Number mask. Separators default to the browser locale (<code>Intl.NumberFormat</code>).
</p>

<Enforma.Form
  values={numericValues}
  onChange={setNumericValues}
  aria-label="numeric fields demo form"
>
  <Enforma.NumberInput bind="price" label="Price (locale default)" />
  <Enforma.NumberInput
    bind="quantity"
    label="Quantity (integer)"
    decimalScale={0}
    thousandSeparator={false}
    allowNegative={false}
    validate={(v) => (v === undefined ? 'Required' : null)}
  />
  <Enforma.NumberInput
    bind="rate"
    label="Rate (0–100%)"
    decimalScale={2}
    min={0}
    max={100}
    allowNegative={false}
  />
</Enforma.Form>

<pre style={{ marginTop: '2rem', background: '#f4f4f4', padding: '1rem' }}>
  {JSON.stringify(numericValues, null, 2)}
</pre>
```

Also add `NumberInput` to the import from `enforma-mui` at the top of `App.tsx` if it is explicitly imported (check — it may be included via the bundle registration already).

### Step 2 — Update `todo.md`

Mark NumberInput as done:

```markdown
- [x] NumberInput — numeric-only text input with min/max/step; no spinner arrows
```

### Step 3 — Full test run and typecheck

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm typecheck && pnpm lint && pnpm test
```

Expected: all passing.

### Step 4 — Commit

```bash
git add apps/demo/src/App.tsx todo.md
git commit -m "$(cat <<'EOF'
feat(demo): add Numeric Fields section with NumberInput examples

Shows locale-formatted, integer-only, and min/max-constrained variants.
Also marks NumberInput as done in the roadmap.
EOF
)"
```
