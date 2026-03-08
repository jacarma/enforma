# OpenChoice Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an `openChoice` boolean prop to `Select`, `RadioGroup`, and `ExclusiveToggle` that appends an "Other" option and reveals a text input when selected; the typed value is stored directly as the field value.

**Architecture:** The dispatch layer (fields.tsx) injects a sentinel option, intercepts `setValue` calls for the sentinel, computes `isOtherSelected`/`otherText`, and passes them to adapters. Adapters are purely presentational — they render a `TextField` below their main component when `openChoice && isOtherSelected`.

**Tech Stack:** TypeScript, React, Vitest + @testing-library/react, MUI TextField

---

### Task 1: Update type definitions

**Files:**
- Modify: `packages/enforma/src/components/types.ts`

No tests needed — TypeScript itself enforces correctness.

**Step 1: Add `openChoice` to the three component prop types**

In `types.ts`, add `openChoice?: boolean` to `SelectProps`, `RadioGroupProps`, and `ExclusiveToggleProps`:

```typescript
export type SelectProps = CommonProps & {
  dataSource?: DataSourceProp<unknown>;
  children?: ReactNode;
  openChoice?: boolean;
};

export type RadioGroupProps = CommonProps & {
  dataSource?: DataSourceProp<unknown>;
  children?: ReactNode;
  row?: Reactive<boolean>;
  openChoice?: boolean;
};

export type ExclusiveToggleProps = CommonProps & {
  dataSource?: DataSourceProp<unknown>;
  children?: ReactNode;
  openChoice?: boolean;
};
```

**Step 2: Add `openChoice`, `isOtherSelected`, `otherText` to the three resolved prop types**

```typescript
export type ResolvedSelectProps = ResolvedCommonProps & {
  value: unknown;
  setValue: (value: unknown) => void;
  options: { value: unknown; label: string }[];
  children: ReactNode;
  displayValue: string;
  isLoading: boolean;
  dataSourceError: Error | null;
  openChoice: boolean;
  isOtherSelected: boolean;
  otherText: string;
};

export type ResolvedRadioGroupProps = ResolvedCommonProps & {
  value: unknown;
  setValue: (value: unknown) => void;
  options: { value: unknown; label: string }[];
  children: ReactNode;
  row: boolean;
  isLoading: boolean;
  dataSourceError: Error | null;
  openChoice: boolean;
  isOtherSelected: boolean;
  otherText: string;
};

export type ResolvedExclusiveToggleProps = ResolvedCommonProps & {
  value: unknown;
  setValue: (value: unknown) => void;
  options: { value: unknown; label: string }[];
  children: ReactNode;
  isLoading: boolean;
  dataSourceError: Error | null;
  openChoice: boolean;
  isOtherSelected: boolean;
  otherText: string;
};
```

**Step 3: Verify typecheck passes**

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm typecheck
```

Expected: errors about missing fields in dispatch (fields.tsx). That's fine — we fix those next.

---

### Task 2: Write failing Select openChoice tests

**Files:**
- Modify: `packages/enforma-mui/src/components/Select.test.tsx`

**Step 1: Add the following tests to the bottom of `Select.test.tsx`**

```tsx
describe('MUI Select — openChoice', () => {
  it('shows the text input when a pre-loaded value is not in the options list', () => {
    render(
      <Form values={{ color: 'tangerine' }} onChange={() => undefined}>
        <Enforma.Select bind="color" label="Color" openChoice>
          <SelectOption value="red" label="Red" />
          <SelectOption value="blue" label="Blue" />
        </Enforma.Select>
      </Form>,
    );
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('tangerine');
  });

  it('does not show the text input when the value matches a real option', () => {
    render(
      <Form values={{ color: 'red' }} onChange={() => undefined}>
        <Enforma.Select bind="color" label="Color" openChoice>
          <SelectOption value="red" label="Red" />
          <SelectOption value="blue" label="Blue" />
        </Enforma.Select>
      </Form>,
    );
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('does not show the text input when value is empty', () => {
    render(
      <Form values={{ color: '' }} onChange={() => undefined}>
        <Enforma.Select bind="color" label="Color" openChoice>
          <SelectOption value="red" label="Red" />
        </Enforma.Select>
      </Form>,
    );
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('typing in the text input updates the form value directly', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ color: 'tangerine' }} onChange={onChange}>
        <Enforma.Select bind="color" label="Color" openChoice>
          <SelectOption value="red" label="Red" />
        </Enforma.Select>
      </Form>,
    );
    const textbox = screen.getByRole('textbox');
    await userEvent.clear(textbox);
    await userEvent.type(textbox, 'mauve');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ color: 'mauve' }),
      expect.anything(),
    );
  });
});
```

Also add `vi` to the imports at the top (it may already be there — check and add if missing):
```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
```

And add `TextInput` to the `registerComponents` call in `beforeEach` if not already there (it is — check the existing beforeEach).

**Step 2: Run the new tests to confirm they fail**

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm test --reporter=verbose --run packages/enforma-mui/src/components/Select.test.tsx
```

Expected: the 4 new tests fail with type errors or assertion errors. That's correct.

---

### Task 3: Implement Select openChoice in dispatch + adapter

**Files:**
- Modify: `packages/enforma/src/components/fields.tsx`
- Modify: `packages/enforma-mui/src/components/Select.tsx`

**Step 1: Add the sentinel constant above `buildSelectOptions` in fields.tsx**

Add after the imports, before `isEmptyRef`:

```tsx
const OPEN_CHOICE_SENTINEL = '__enforma_other__';
```

**Step 2: Replace `SelectDispatch` in fields.tsx**

```tsx
function SelectDispatch(props: SelectProps) {
  const [localOtherSelected, setLocalOtherSelected] = React.useState(false);
  const resolved = useFieldProps<FieldResolved<unknown>>(props);
  const {
    items,
    isLoading,
    error: dataSourceError,
  } = useDataSource(props.dataSource, {
    bind: props.bind,
  });
  const rawOptions = buildSelectOptions(items, props.children, props.dataSource !== undefined);
  const openChoice = props.openChoice ?? false;
  const options = openChoice
    ? [...rawOptions, { value: OPEN_CHOICE_SENTINEL, label: 'Other' }]
    : rawOptions;

  const storeValue = resolved.value;
  const valueInRawOptions = rawOptions.some((o) => o.value === storeValue);
  const isOtherSelected =
    openChoice &&
    (localOtherSelected || (storeValue !== '' && storeValue != null && !valueInRawOptions));
  const otherText = isOtherSelected && typeof storeValue === 'string' ? storeValue : '';

  // Reset localOtherSelected if the form value is cleared externally
  React.useEffect(() => {
    if (storeValue === '' || storeValue == null) {
      setLocalOtherSelected(false);
    }
  }, [storeValue]);

  const originalSetValue = resolved.setValue;
  const wrappedSetValue = (v: unknown) => {
    if (v === OPEN_CHOICE_SENTINEL) {
      setLocalOtherSelected(true);
      originalSetValue('');
    } else {
      setLocalOtherSelected(false);
      originalSetValue(v);
    }
  };

  const SelectOptionImpl = getComponent('SelectOption');
  if (!SelectOptionImpl) {
    throw new Error('Enforma: component "SelectOption" is not registered.');
  }
  const renderedOptions = options.map((opt) => (
    <SelectOptionImpl key={String(opt.value)} value={opt.value} label={opt.label} />
  ));

  const matchedInRaw = rawOptions.find((opt) => opt.value === storeValue);
  const displayValue = isOtherSelected
    ? otherText || 'Other'
    : (matchedInRaw?.label ?? (typeof storeValue === 'string' ? storeValue : ''));

  const adapterValue = isOtherSelected ? OPEN_CHOICE_SENTINEL : storeValue;

  return dispatchComponent('Select', {
    ...resolved,
    value: adapterValue,
    setValue: wrappedSetValue,
    options,
    children: renderedOptions,
    displayValue,
    isLoading,
    dataSourceError: dataSourceError ?? null,
    openChoice,
    isOtherSelected,
    otherText,
  });
}
```

**Step 3: Update MUI `Select.tsx` adapter to accept new props and render the text input**

Replace the full file:

```tsx
import { useId, useContext } from 'react';
import {
  CircularProgress,
  Select as MuiSelect,
  InputLabel,
  FormHelperText,
  FormLabel,
  TextField,
} from '@mui/material';
import { type ResolvedSelectProps } from 'enforma';
import { ComponentWrap } from './ComponentWrap';
import { MuiVariantContext } from '../context/MuiVariantContext';

export function Select({
  value,
  setValue,
  label,
  disabled = false,
  error,
  showError,
  onBlur,
  children,
  options,
  displayValue,
  isLoading,
  dataSourceError,
  openChoice,
  isOtherSelected,
  otherText,
}: ResolvedSelectProps) {
  const variant = useContext(MuiVariantContext);
  const labelId = useId();
  const isClassic = variant === 'classic';

  if (isLoading) {
    return <CircularProgress size={20} />;
  }

  const muiVariant = isClassic ? 'outlined' : variant;

  const labelEl =
    label !== undefined ? (
      isClassic ? (
        <FormLabel id={labelId}>{label}</FormLabel>
      ) : (
        <InputLabel id={labelId}>{label}</InputLabel>
      )
    ) : null;

  const variantProps = isClassic ? { labelId, size: 'small' as const } : { labelId, label };

  return (
    <>
      <ComponentWrap error={showError} disabled={disabled} variant={muiVariant}>
        {labelEl}
        <MuiSelect
          value={value ?? ''}
          onChange={(e) => {
            const matched = options.find((opt) => String(opt.value) === e.target.value);
            setValue(matched !== undefined ? matched.value : e.target.value);
          }}
          onBlur={onBlur}
          fullWidth
          renderValue={() => displayValue}
          variant={muiVariant}
          {...variantProps}
        >
          {children}
        </MuiSelect>
        {showError && <FormHelperText>{dataSourceError?.message ?? error}</FormHelperText>}
      </ComponentWrap>
      {openChoice && isOtherSelected && (
        <TextField
          value={otherText}
          onChange={(e) => {
            setValue(e.target.value);
          }}
          size="small"
          fullWidth
        />
      )}
    </>
  );
}
```

**Step 4: Run the Select tests**

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm test --reporter=verbose --run packages/enforma-mui/src/components/Select.test.tsx
```

Expected: all tests pass.

**Step 5: Run typecheck**

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm typecheck
```

Expected: errors remain for RadioGroup and ExclusiveToggle dispatch (missing new required props). That's fine — we fix those next.

**Step 6: Commit**

```bash
cd /Users/krisish/dev/enforma && git add packages/enforma/src/components/types.ts packages/enforma/src/components/fields.tsx packages/enforma-mui/src/components/Select.tsx packages/enforma-mui/src/components/Select.test.tsx && git commit -m "feat: add openChoice to Select"
```

---

### Task 4: Write failing RadioGroup openChoice tests

**Files:**
- Modify: `packages/enforma-mui/src/components/RadioGroup.test.tsx`

**Step 1: Add the following tests to the bottom of `RadioGroup.test.tsx`**

```tsx
describe('MUI RadioGroup — openChoice', () => {
  it('renders an "Other" radio option when openChoice is true', () => {
    render(
      <Form values={{ size: '' }} onChange={() => undefined}>
        <Enforma.RadioGroup bind="size" label="Size" openChoice>
          <RadioGroupOption value="s" label="Small" />
          <RadioGroupOption value="m" label="Medium" />
        </Enforma.RadioGroup>
      </Form>,
    );
    expect(screen.getByRole('radio', { name: 'Other' })).toBeInTheDocument();
  });

  it('shows the text input when "Other" radio is selected', async () => {
    render(
      <Form values={{ size: '' }} onChange={() => undefined}>
        <Enforma.RadioGroup bind="size" label="Size" openChoice>
          <RadioGroupOption value="s" label="Small" />
        </Enforma.RadioGroup>
      </Form>,
    );
    await userEvent.click(screen.getByRole('radio', { name: 'Other' }));
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('pre-loaded value not in options shows "Other" checked with text input containing the value', () => {
    render(
      <Form values={{ size: 'custom' }} onChange={() => undefined}>
        <Enforma.RadioGroup bind="size" label="Size" openChoice>
          <RadioGroupOption value="s" label="Small" />
        </Enforma.RadioGroup>
      </Form>,
    );
    expect(screen.getByRole('radio', { name: 'Other' })).toBeChecked();
    expect(screen.getByRole('textbox')).toHaveValue('custom');
  });

  it('pre-loaded value matching an option does not show the text input', () => {
    render(
      <Form values={{ size: 's' }} onChange={() => undefined}>
        <Enforma.RadioGroup bind="size" label="Size" openChoice>
          <RadioGroupOption value="s" label="Small" />
        </Enforma.RadioGroup>
      </Form>,
    );
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('typing in the text input updates the form value', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ size: 'custom' }} onChange={onChange}>
        <Enforma.RadioGroup bind="size" label="Size" openChoice>
          <RadioGroupOption value="s" label="Small" />
        </Enforma.RadioGroup>
      </Form>,
    );
    const textbox = screen.getByRole('textbox');
    await userEvent.clear(textbox);
    await userEvent.type(textbox, 'xl');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ size: 'xl' }),
      expect.anything(),
    );
  });
});
```

**Step 2: Run to confirm failure**

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm test --reporter=verbose --run packages/enforma-mui/src/components/RadioGroup.test.tsx
```

Expected: new tests fail.

---

### Task 5: Implement RadioGroup openChoice in dispatch + adapter

**Files:**
- Modify: `packages/enforma/src/components/fields.tsx`
- Modify: `packages/enforma-mui/src/components/RadioGroup.tsx`

**Step 1: Replace `RadioGroupDispatch` in fields.tsx**

```tsx
function RadioGroupDispatch(props: RadioGroupProps) {
  const [localOtherSelected, setLocalOtherSelected] = React.useState(false);
  const resolved = useFieldProps<FieldResolved<unknown>>(props);
  const {
    items,
    isLoading,
    error: dataSourceError,
  } = useDataSource(props.dataSource, {
    bind: props.bind,
  });
  const rawOptions = buildSelectOptions(items, props.children, props.dataSource !== undefined);
  const openChoice = props.openChoice ?? false;
  const options = openChoice
    ? [...rawOptions, { value: OPEN_CHOICE_SENTINEL, label: 'Other' }]
    : rawOptions;

  const storeValue = resolved.value;
  const valueInRawOptions = rawOptions.some((o) => o.value === storeValue);
  const isOtherSelected =
    openChoice &&
    (localOtherSelected || (storeValue !== '' && storeValue != null && !valueInRawOptions));
  const otherText = isOtherSelected && typeof storeValue === 'string' ? storeValue : '';

  React.useEffect(() => {
    if (storeValue === '' || storeValue == null) {
      setLocalOtherSelected(false);
    }
  }, [storeValue]);

  const originalSetValue = resolved.setValue;
  const wrappedSetValue = (v: unknown) => {
    if (v === OPEN_CHOICE_SENTINEL) {
      setLocalOtherSelected(true);
      originalSetValue('');
    } else {
      setLocalOtherSelected(false);
      originalSetValue(v);
    }
  };

  const RadioGroupOptionImpl = getComponent('RadioGroupOption');
  if (!RadioGroupOptionImpl) {
    throw new Error('Enforma: component "RadioGroupOption" is not registered.');
  }
  const renderedOptions = options.map((opt) => (
    <RadioGroupOptionImpl key={String(opt.value)} value={opt.value} label={opt.label} />
  ));
  const row = useReactiveProp(props.row) ?? false;
  const adapterValue = isOtherSelected ? OPEN_CHOICE_SENTINEL : storeValue;

  return dispatchComponent('RadioGroup', {
    ...resolved,
    value: adapterValue,
    setValue: wrappedSetValue,
    options,
    children: renderedOptions,
    row,
    isLoading,
    dataSourceError: dataSourceError ?? null,
    openChoice,
    isOtherSelected,
    otherText,
  } as ResolvedRadioGroupProps);
}
```

**Step 2: Update MUI `RadioGroup.tsx` adapter**

Replace the full file:

```tsx
import {
  CircularProgress,
  FormHelperText,
  FormLabel,
  RadioGroup as MuiRadioGroup,
  TextField,
} from '@mui/material';
import { type ResolvedRadioGroupProps } from 'enforma';
import { ComponentWrap } from './ComponentWrap';

export function RadioGroup({
  value,
  setValue,
  label,
  disabled = false,
  error,
  showError,
  onBlur,
  children,
  row,
  options,
  isLoading,
  dataSourceError,
  openChoice,
  isOtherSelected,
  otherText,
}: ResolvedRadioGroupProps) {
  if (isLoading) {
    return <CircularProgress size={20} />;
  }

  return (
    <>
      <ComponentWrap disabled={disabled} error={showError}>
        {label !== undefined && <FormLabel>{label}</FormLabel>}
        <MuiRadioGroup
          value={value ?? ''}
          onChange={(e) => {
            const matched = options.find((opt) => String(opt.value) === e.target.value);
            if (matched !== undefined) setValue(matched.value);
          }}
          onBlur={onBlur}
          row={row}
        >
          {children}
        </MuiRadioGroup>
        {showError && <FormHelperText>{dataSourceError?.message ?? error}</FormHelperText>}
      </ComponentWrap>
      {openChoice && isOtherSelected && (
        <TextField
          value={otherText}
          onChange={(e) => {
            setValue(e.target.value);
          }}
          size="small"
          fullWidth
        />
      )}
    </>
  );
}
```

**Step 3: Run RadioGroup tests**

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm test --reporter=verbose --run packages/enforma-mui/src/components/RadioGroup.test.tsx
```

Expected: all tests pass.

**Step 4: Commit**

```bash
cd /Users/krisish/dev/enforma && git add packages/enforma/src/components/fields.tsx packages/enforma-mui/src/components/RadioGroup.tsx packages/enforma-mui/src/components/RadioGroup.test.tsx && git commit -m "feat: add openChoice to RadioGroup"
```

---

### Task 6: Write failing ExclusiveToggle openChoice tests

**Files:**
- Modify: `packages/enforma-mui/src/components/ExclusiveToggle.test.tsx`

**Step 1: Add the following tests to the bottom of `ExclusiveToggle.test.tsx`**

```tsx
describe('MUI ExclusiveToggle — openChoice', () => {
  it('renders an "Other" button when openChoice is true', () => {
    render(
      <Form values={{ size: '' }} onChange={() => undefined}>
        <Enforma.ExclusiveToggle bind="size" label="Size" openChoice>
          <ExclusiveToggleOption value="s" label="S" />
          <ExclusiveToggleOption value="m" label="M" />
        </Enforma.ExclusiveToggle>
      </Form>,
    );
    expect(screen.getByRole('button', { name: 'Other' })).toBeInTheDocument();
  });

  it('shows the text input when "Other" button is clicked', async () => {
    render(
      <Form values={{ size: '' }} onChange={() => undefined}>
        <Enforma.ExclusiveToggle bind="size" label="Size" openChoice>
          <ExclusiveToggleOption value="s" label="S" />
        </Enforma.ExclusiveToggle>
      </Form>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Other' }));
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('pre-loaded value not in options shows the text input with the value', () => {
    render(
      <Form values={{ size: 'custom' }} onChange={() => undefined}>
        <Enforma.ExclusiveToggle bind="size" label="Size" openChoice>
          <ExclusiveToggleOption value="s" label="S" />
        </Enforma.ExclusiveToggle>
      </Form>,
    );
    expect(screen.getByRole('textbox')).toHaveValue('custom');
  });

  it('pre-loaded value matching an option does not show the text input', () => {
    render(
      <Form values={{ size: 's' }} onChange={() => undefined}>
        <Enforma.ExclusiveToggle bind="size" label="Size" openChoice>
          <ExclusiveToggleOption value="s" label="S" />
        </Enforma.ExclusiveToggle>
      </Form>,
    );
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('typing in the text input updates the form value', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ size: 'custom' }} onChange={onChange}>
        <Enforma.ExclusiveToggle bind="size" label="Size" openChoice>
          <ExclusiveToggleOption value="s" label="S" />
        </Enforma.ExclusiveToggle>
      </Form>,
    );
    const textbox = screen.getByRole('textbox');
    await userEvent.clear(textbox);
    await userEvent.type(textbox, 'xl');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ size: 'xl' }),
      expect.anything(),
    );
  });
});
```

**Step 2: Run to confirm failure**

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm test --reporter=verbose --run packages/enforma-mui/src/components/ExclusiveToggle.test.tsx
```

Expected: new tests fail.

---

### Task 7: Implement ExclusiveToggle openChoice in dispatch + adapter

**Files:**
- Modify: `packages/enforma/src/components/fields.tsx`
- Modify: `packages/enforma-mui/src/components/ExclusiveToggle.tsx`

**Step 1: Replace `ExclusiveToggleDispatch` in fields.tsx**

```tsx
function ExclusiveToggleDispatch(props: ExclusiveToggleProps) {
  const [localOtherSelected, setLocalOtherSelected] = React.useState(false);
  const resolved = useFieldProps<FieldResolved<unknown>>(props);
  const {
    items,
    isLoading,
    error: dataSourceError,
  } = useDataSource(props.dataSource, {
    bind: props.bind,
  });
  const rawOptions = buildSelectOptions(items, props.children, props.dataSource !== undefined);
  const openChoice = props.openChoice ?? false;
  const options = openChoice
    ? [...rawOptions, { value: OPEN_CHOICE_SENTINEL, label: 'Other' }]
    : rawOptions;

  const storeValue = resolved.value;
  const valueInRawOptions = rawOptions.some((o) => o.value === storeValue);
  const isOtherSelected =
    openChoice &&
    (localOtherSelected || (storeValue !== '' && storeValue != null && !valueInRawOptions));
  const otherText = isOtherSelected && typeof storeValue === 'string' ? storeValue : '';

  React.useEffect(() => {
    if (storeValue === '' || storeValue == null) {
      setLocalOtherSelected(false);
    }
  }, [storeValue]);

  const originalSetValue = resolved.setValue;
  const wrappedSetValue = (v: unknown) => {
    if (v === OPEN_CHOICE_SENTINEL) {
      setLocalOtherSelected(true);
      originalSetValue('');
    } else {
      setLocalOtherSelected(false);
      originalSetValue(v);
    }
  };

  const ExclusiveToggleOptionImpl = getComponent('ExclusiveToggleOption');
  if (!ExclusiveToggleOptionImpl) {
    throw new Error('Enforma: component "ExclusiveToggleOption" is not registered.');
  }
  const renderedOptions = options.map((opt) => (
    <ExclusiveToggleOptionImpl key={String(opt.value)} value={opt.value} label={opt.label} />
  ));
  const adapterValue = isOtherSelected ? OPEN_CHOICE_SENTINEL : storeValue;

  return dispatchComponent('ExclusiveToggle', {
    ...resolved,
    value: adapterValue,
    setValue: wrappedSetValue,
    options,
    children: renderedOptions,
    isLoading,
    dataSourceError: dataSourceError ?? null,
    openChoice,
    isOtherSelected,
    otherText,
  } as ResolvedExclusiveToggleProps);
}
```

**Step 2: Update MUI `ExclusiveToggle.tsx` adapter**

Replace the full file:

```tsx
import { CircularProgress, FormHelperText, FormLabel, TextField, ToggleButtonGroup } from '@mui/material';
import { type ResolvedExclusiveToggleProps } from 'enforma';
import { ComponentWrap } from './ComponentWrap';

export function ExclusiveToggle({
  value,
  setValue,
  label,
  disabled = false,
  error,
  showError,
  onBlur,
  children,
  isLoading,
  dataSourceError,
  openChoice,
  isOtherSelected,
  otherText,
}: ResolvedExclusiveToggleProps) {
  if (isLoading) {
    return <CircularProgress size={20} />;
  }

  return (
    <>
      <ComponentWrap disabled={disabled} error={showError}>
        {label !== undefined && <FormLabel>{label}</FormLabel>}
        <ToggleButtonGroup
          value={value ?? null}
          exclusive
          disabled={disabled}
          onChange={(_, newValue: unknown) => {
            if (newValue !== null) {
              setValue(newValue);
            }
          }}
          onBlur={onBlur}
        >
          {children}
        </ToggleButtonGroup>
        {showError && <FormHelperText>{dataSourceError?.message ?? error}</FormHelperText>}
      </ComponentWrap>
      {openChoice && isOtherSelected && (
        <TextField
          value={otherText}
          onChange={(e) => {
            setValue(e.target.value);
          }}
          size="small"
          fullWidth
        />
      )}
    </>
  );
}
```

**Step 3: Run ExclusiveToggle tests**

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm test --reporter=verbose --run packages/enforma-mui/src/components/ExclusiveToggle.test.tsx
```

Expected: all tests pass.

**Step 4: Run full test suite + typecheck + lint**

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm typecheck && pnpm lint && pnpm test --run
```

Expected: all pass with no errors.

**Step 5: Commit**

```bash
cd /Users/krisish/dev/enforma && git add packages/enforma/src/components/fields.tsx packages/enforma-mui/src/components/ExclusiveToggle.tsx packages/enforma-mui/src/components/ExclusiveToggle.test.tsx && git commit -m "feat: add openChoice to ExclusiveToggle"
```

---

### Task 8: Add demo section

**Files:**
- Modify: `apps/demo/src/App.tsx` (or whatever file contains the demo examples)

**Step 1: Find the demo file**

```bash
ls /Users/krisish/dev/enforma/apps/demo/src/
```

Read the demo file to understand where to add the new section (look for existing RadioGroup or ExclusiveToggle examples).

**Step 2: Add an openChoice demo section**

Find the existing demos for RadioGroup, Select, or ExclusiveToggle and add a nearby section showing `openChoice`. Add a new form state variable and a demo group:

```tsx
// Near top of component or with other state declarations:
const [openChoiceValues, setOpenChoiceValues] = React.useState<Record<string, unknown>>({
  color: '',
  size: '',
  format: 'tangerine', // pre-loaded custom value to show auto-detection
});

// In the JSX, add a new demo section:
<Form values={openChoiceValues} onChange={setOpenChoiceValues}>
  <Enforma.Select bind="color" label="Color (openChoice)" openChoice>
    <Enforma.Select.Option value="red" label="Red" />
    <Enforma.Select.Option value="blue" label="Blue" />
    <Enforma.Select.Option value="green" label="Green" />
  </Enforma.Select>

  <Enforma.RadioGroup bind="size" label="Size (openChoice)" openChoice>
    <Enforma.RadioGroup.Option value="s" label="Small" />
    <Enforma.RadioGroup.Option value="m" label="Medium" />
    <Enforma.RadioGroup.Option value="l" label="Large" />
  </Enforma.RadioGroup>

  <Enforma.ExclusiveToggle bind="format" label="Format (openChoice, pre-loaded custom)" openChoice>
    <Enforma.ExclusiveToggle.Option value="pdf" label="PDF" />
    <Enforma.ExclusiveToggle.Option value="csv" label="CSV" />
  </Enforma.ExclusiveToggle>

  <pre>{JSON.stringify(openChoiceValues, null, 2)}</pre>
</Form>
```

**Step 3: Verify the demo builds**

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm --filter demo build
```

Expected: builds with no errors.

**Step 4: Commit**

```bash
cd /Users/krisish/dev/enforma && git add apps/demo/src/ && git commit -m "feat(demo): add openChoice examples"
```

---

### Task 9: Final verification

**Step 1: Run everything**

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm typecheck && pnpm lint && pnpm test --run
```

Expected: all pass with no errors or warnings.
