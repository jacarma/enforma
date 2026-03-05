# Autocomplete + ExclusiveToggle Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Autocomplete and ExclusiveToggle components, and refactor Select/RadioGroup to pass both `options` (flat array) and `children` (pre-rendered) so every list-based adapter can choose whichever fits its native API.

**Architecture:** All list-based dispatches (Select, RadioGroup, Autocomplete, ExclusiveToggle) call `buildSelectOptions` to produce `{ value, label }[]`, then pass that flat array as `options` AND pre-render option components into `children`. The MUI Autocomplete adapter uses `options`; MUI ToggleButtonGroup uses `children`; existing Select/RadioGroup adapters ignore the new `options` field.

**Tech Stack:** TypeScript strict, React, Vitest + @testing-library/react, MUI v6 (`Autocomplete`, `ToggleButtonGroup`, `ToggleButton`).

---

### Task 1: Add new types to `types.ts`

**Files:**
- Modify: `packages/enforma/src/components/types.ts`

**Step 1: Add `options` to `ResolvedSelectProps` (line 195–202)**

Replace:
```typescript
export type ResolvedSelectProps = ResolvedCommonProps & {
  value: unknown;
  setValue: (value: unknown) => void;
  children: ReactNode;
  displayValue: string;
  isLoading: boolean;
  dataSourceError: Error | null;
};
```
With:
```typescript
export type ResolvedSelectProps = ResolvedCommonProps & {
  value: unknown;
  setValue: (value: unknown) => void;
  options: { value: unknown; label: string }[];
  children: ReactNode;
  displayValue: string;
  isLoading: boolean;
  dataSourceError: Error | null;
};
```

**Step 2: Add `options` to `ResolvedRadioGroupProps` (line 53–60)**

Replace:
```typescript
export type ResolvedRadioGroupProps = ResolvedCommonProps & {
  value: unknown;
  setValue: (value: unknown) => void;
  children: ReactNode;
  row: boolean;
  isLoading: boolean;
  dataSourceError: Error | null;
};
```
With:
```typescript
export type ResolvedRadioGroupProps = ResolvedCommonProps & {
  value: unknown;
  setValue: (value: unknown) => void;
  options: { value: unknown; label: string }[];
  children: ReactNode;
  row: boolean;
  isLoading: boolean;
  dataSourceError: Error | null;
};
```

**Step 3: Add new prop types after `RadioGroupProps` (after line 51)**

Add after the `RadioGroupProps` block (before `ResolvedRadioGroupProps`):
```typescript
export type AutocompleteProps = CommonProps & {
  dataSource?: DataSourceProp<unknown>;
  children?: ReactNode;
};

export type ExclusiveToggleProps = CommonProps & {
  dataSource?: DataSourceProp<unknown>;
  children?: ReactNode;
};
```

**Step 4: Add new resolved types after `ResolvedRadioGroupOptionProps` (after line 65)**

Add after `ResolvedRadioGroupOptionProps`:
```typescript
export type ResolvedAutocompleteProps = ResolvedCommonProps & {
  value: unknown;
  setValue: (value: unknown) => void;
  options: { value: unknown; label: string }[];
  children: ReactNode;
  displayValue: string;
  isLoading: boolean;
  dataSourceError: Error | null;
};

export type ResolvedAutocompleteOptionProps = {
  value: unknown;
  label: string;
};

export type ResolvedExclusiveToggleProps = ResolvedCommonProps & {
  value: unknown;
  setValue: (value: unknown) => void;
  options: { value: unknown; label: string }[];
  children: ReactNode;
  isLoading: boolean;
  dataSourceError: Error | null;
};

export type ResolvedExclusiveToggleOptionProps = {
  value: unknown;
  label: string;
};
```

**Step 5: Add to `ComponentPropsMap` (in the map starting at line 101)**

Add four entries to `ComponentPropsMap`:
```typescript
  Autocomplete: ResolvedAutocompleteProps;
  AutocompleteOption: ResolvedAutocompleteOptionProps;
  ExclusiveToggle: ResolvedExclusiveToggleProps;
  ExclusiveToggleOption: ResolvedExclusiveToggleOptionProps;
```

**Step 6: Run typecheck**

```bash
nvm use 20 && pnpm typecheck
```
Expected: no errors (types only — nothing uses them yet).

**Step 7: Commit**

```bash
git add packages/enforma/src/components/types.ts
git commit -m "feat(enforma): add Autocomplete and ExclusiveToggle types; add options to ResolvedSelectProps and ResolvedRadioGroupProps"
```

---

### Task 2: Create marker components

**Files:**
- Create: `packages/enforma/src/components/AutocompleteOption.tsx`
- Create: `packages/enforma/src/components/ExclusiveToggleOption.tsx`

**Step 1: Create `AutocompleteOption.tsx`**

```typescript
// packages/enforma/src/components/AutocompleteOption.tsx
import type { FormValues } from '../store/FormStore';

export type AutocompleteOptionProps<TItem = FormValues> = {
  label: string | ((item: TItem) => string);
  value: string | ((item: TItem) => unknown);
};

// Props are read externally by the adapter via React.Children — not used in the body.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function AutocompleteOption(_: AutocompleteOptionProps): null {
  return null;
}
```

**Step 2: Create `ExclusiveToggleOption.tsx`**

```typescript
// packages/enforma/src/components/ExclusiveToggleOption.tsx
import type { FormValues } from '../store/FormStore';

export type ExclusiveToggleOptionProps<TItem = FormValues> = {
  label: string | ((item: TItem) => string);
  value: string | ((item: TItem) => unknown);
};

// Props are read externally by the adapter via React.Children — not used in the body.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ExclusiveToggleOption(_: ExclusiveToggleOptionProps): null {
  return null;
}
```

**Step 3: Run typecheck**

```bash
nvm use 20 && pnpm typecheck
```
Expected: no errors.

**Step 4: Commit**

```bash
git add packages/enforma/src/components/AutocompleteOption.tsx packages/enforma/src/components/ExclusiveToggleOption.tsx
git commit -m "feat(enforma): add AutocompleteOption and ExclusiveToggleOption marker components"
```

---

### Task 3: Update `fields.tsx`

**Files:**
- Modify: `packages/enforma/src/components/fields.tsx`

**Step 1: Add imports at top of file**

After the existing imports, add:
```typescript
import { AutocompleteOption } from './AutocompleteOption';
import type { AutocompleteOptionProps } from './AutocompleteOption';
import { ExclusiveToggleOption } from './ExclusiveToggleOption';
import type {
  AutocompleteProps,
  ExclusiveToggleProps,
  ResolvedAutocompleteProps,
  ResolvedExclusiveToggleProps,
} from './types';
```

Also add `AutocompleteProps` and `ExclusiveToggleProps` to the existing type import from `'./types'`.

**Step 2: Update `SelectDispatch` — pass `options` alongside `children`**

Replace the `return dispatchComponent('Select', ...)` call:
```typescript
  return dispatchComponent('Select', {
    ...resolved,
    options,
    children: renderedOptions,
    displayValue,
    isLoading,
    dataSourceError: dataSourceError ?? null,
  });
```

**Step 3: Update `RadioGroupDispatch` — pass `options` alongside `children`**

Replace the `return dispatchComponent('RadioGroup', ...)` call:
```typescript
  return dispatchComponent('RadioGroup', {
    ...resolved,
    options,
    children: renderedOptions,
    row,
    isLoading,
    dataSourceError: dataSourceError ?? null,
  } as ResolvedRadioGroupProps);
```

**Step 4: Add `AutocompleteDispatch` after `RadioGroupDispatch`**

```typescript
function AutocompleteDispatch(props: AutocompleteProps) {
  const resolved = useFieldProps<FieldResolved<unknown>>(props);
  const {
    items,
    isLoading,
    error: dataSourceError,
  } = useDataSource(props.dataSource, {
    bind: props.bind,
  });
  const options = buildSelectOptions(items, props.children);
  const AutocompleteOptionImpl = getComponent('AutocompleteOption');
  if (!AutocompleteOptionImpl) {
    throw new Error('Enforma: component "AutocompleteOption" is not registered.');
  }
  const renderedOptions = options.map((opt) => (
    <AutocompleteOptionImpl key={String(opt.value)} value={opt.value} label={opt.label} />
  ));
  const matched = options.find((opt) => opt.value === resolved.value);
  const displayValue = matched?.label ?? (typeof resolved.value === 'string' ? resolved.value : '');
  return dispatchComponent('Autocomplete', {
    ...resolved,
    options,
    children: renderedOptions,
    displayValue,
    isLoading,
    dataSourceError: dataSourceError ?? null,
  } as ResolvedAutocompleteProps);
}
```

**Step 5: Add `ExclusiveToggleDispatch` after `AutocompleteDispatch`**

```typescript
function ExclusiveToggleDispatch(props: ExclusiveToggleProps) {
  const resolved = useFieldProps<FieldResolved<unknown>>(props);
  const {
    items,
    isLoading,
    error: dataSourceError,
  } = useDataSource(props.dataSource, {
    bind: props.bind,
  });
  const options = buildSelectOptions(items, props.children);
  const ExclusiveToggleOptionImpl = getComponent('ExclusiveToggleOption');
  if (!ExclusiveToggleOptionImpl) {
    throw new Error('Enforma: component "ExclusiveToggleOption" is not registered.');
  }
  const renderedOptions = options.map((opt) => (
    <ExclusiveToggleOptionImpl key={String(opt.value)} value={opt.value} label={opt.label} />
  ));
  return dispatchComponent('ExclusiveToggle', {
    ...resolved,
    options,
    children: renderedOptions,
    isLoading,
    dataSourceError: dataSourceError ?? null,
  } as ResolvedExclusiveToggleProps);
}
```

**Step 6: Add exports at the bottom of `fields.tsx`**

After the `RadioGroup` export, add:
```typescript
export const Autocomplete = Object.assign(memo(AutocompleteDispatch, stablePropsEqual), {
  Option: AutocompleteOption,
});
export const ExclusiveToggle = Object.assign(memo(ExclusiveToggleDispatch, stablePropsEqual), {
  Option: ExclusiveToggleOption,
});

export { AutocompleteOption };
export { ExclusiveToggleOption };
```

**Step 7: Run typecheck**

```bash
nvm use 20 && pnpm typecheck
```
Expected: no errors.

**Step 8: Run existing tests**

```bash
nvm use 20 && pnpm test
```
Expected: all existing tests pass (Select/RadioGroup adapters ignore the new `options` prop).

**Step 9: Commit**

```bash
git add packages/enforma/src/components/fields.tsx
git commit -m "feat(enforma): pass options array in Select/RadioGroup dispatches; add AutocompleteDispatch and ExclusiveToggleDispatch"
```

---

### Task 4: Update `enforma/src/index.ts` exports

**Files:**
- Modify: `packages/enforma/src/index.ts`

**Step 1: Add component exports**

The `fields` import (`import * as fields from './components/fields'`) already re-exports everything from `fields.tsx`, so `Autocomplete` and `ExclusiveToggle` will be included in `Enforma` automatically.

Add named exports for the option marker components and types. After the existing `export { RadioGroupOption }` and `export type { RadioGroupOptionProps }` lines, add:

```typescript
export { AutocompleteOption } from './components/AutocompleteOption';
export type { AutocompleteOptionProps } from './components/AutocompleteOption';
export { ExclusiveToggleOption } from './components/ExclusiveToggleOption';
export type { ExclusiveToggleOptionProps } from './components/ExclusiveToggleOption';
```

**Step 2: Add type exports**

In the existing `export type { ... } from './components/types'` block, add:
```typescript
  AutocompleteProps,
  ResolvedAutocompleteProps,
  ResolvedAutocompleteOptionProps,
  ExclusiveToggleProps,
  ResolvedExclusiveToggleProps,
  ResolvedExclusiveToggleOptionProps,
```

**Step 3: Run typecheck and tests**

```bash
nvm use 20 && pnpm typecheck && pnpm test
```
Expected: no errors, all tests pass.

**Step 4: Commit**

```bash
git add packages/enforma/src/index.ts
git commit -m "feat(enforma): export Autocomplete and ExclusiveToggle types and components"
```

---

### Task 5: Write failing tests for Autocomplete MUI adapter

**Files:**
- Create: `packages/enforma-mui/src/components/Autocomplete.test.tsx`

**Step 1: Write the test file**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Enforma, { Form, registerComponents, clearRegistry, AutocompleteOption } from 'enforma';
import { Autocomplete } from './Autocomplete';
import { AutocompleteOption as AutocompleteOptionMui } from './AutocompleteOption';

beforeEach(() => {
  clearRegistry();
  registerComponents({ Autocomplete, AutocompleteOption: AutocompleteOptionMui });
});

describe('MUI Autocomplete', () => {
  it('renders a combobox accessible by label', () => {
    render(
      <Form values={{ country: '' }} onChange={() => undefined}>
        <Enforma.Autocomplete bind="country" label="Country">
          <AutocompleteOption value="au" label="Australia" />
          <AutocompleteOption value="nz" label="New Zealand" />
        </Enforma.Autocomplete>
      </Form>,
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByLabelText('Country')).toBeInTheDocument();
  });

  it('displays the label for the current form value', () => {
    render(
      <Form values={{ country: 'au' }} onChange={() => undefined}>
        <Enforma.Autocomplete bind="country" label="Country">
          <AutocompleteOption value="au" label="Australia" />
          <AutocompleteOption value="nz" label="New Zealand" />
        </Enforma.Autocomplete>
      </Form>,
    );
    expect(screen.getByRole('combobox')).toHaveValue('Australia');
  });

  it('calls onChange with selected value when user picks an option', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ country: '' }} onChange={onChange}>
        <Enforma.Autocomplete bind="country" label="Country">
          <AutocompleteOption value="au" label="Australia" />
          <AutocompleteOption value="nz" label="New Zealand" />
        </Enforma.Autocomplete>
      </Form>,
    );
    await userEvent.type(screen.getByRole('combobox'), 'Aus');
    await userEvent.click(await screen.findByRole('option', { name: 'Australia' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ country: 'au' }),
      expect.anything(),
    );
  });

  it('renders with a static array datasource', () => {
    const options = [
      { value: 'au', label: 'Australia' },
      { value: 'nz', label: 'New Zealand' },
    ];
    render(
      <Form values={{ country: '' }} onChange={() => undefined}>
        <Enforma.Autocomplete bind="country" label="Country" dataSource={options} />
      </Form>,
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('shows loading spinner when datasource is loading', () => {
    const neverResolvingDs = { query: (): Promise<never[]> => new Promise(() => undefined) };
    render(
      <Form
        values={{ country: '' }}
        onChange={() => undefined}
        dataSources={{ countries: neverResolvingDs }}
      >
        <Enforma.Autocomplete bind="country" label="Country" dataSource="countries" />
      </Form>,
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows error message after blur with failed validation', async () => {
    render(
      <Form values={{ country: '' }} onChange={() => undefined}>
        <Enforma.Autocomplete
          bind="country"
          label="Country"
          validate={(v) => (!v ? 'Required' : null)}
        >
          <AutocompleteOption value="au" label="Australia" />
        </Enforma.Autocomplete>
      </Form>,
    );
    screen.getByRole('combobox').focus();
    await userEvent.tab();
    expect(await screen.findByText('Required')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
nvm use 20 && pnpm --filter enforma-mui test -- --reporter=verbose Autocomplete.test
```
Expected: FAIL — `Cannot find module './Autocomplete'` and `Cannot find module './AutocompleteOption'`.

---

### Task 6: Implement MUI AutocompleteOption and Autocomplete adapters

**Files:**
- Create: `packages/enforma-mui/src/components/AutocompleteOption.tsx`
- Create: `packages/enforma-mui/src/components/Autocomplete.tsx`

**Step 1: Create `AutocompleteOption.tsx`**

MUI Autocomplete renders its own option elements — this adapter is registered so the dispatch can render children, but its output is not used by the MUI Autocomplete adapter.

```typescript
// packages/enforma-mui/src/components/AutocompleteOption.tsx
import { type ResolvedAutocompleteOptionProps } from 'enforma';

// MUI Autocomplete uses the flat options array, not pre-rendered children.
// This component is registered so the dispatch can render without error;
// the MUI Autocomplete adapter ignores children.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function AutocompleteOption(_: ResolvedAutocompleteOptionProps): null {
  return null;
}
```

**Step 2: Create `Autocomplete.tsx`**

```typescript
// packages/enforma-mui/src/components/Autocomplete.tsx
import { CircularProgress, Autocomplete as MuiAutocomplete, TextField } from '@mui/material';
import { type ResolvedAutocompleteProps } from 'enforma';

type OptionItem = { value: unknown; label: string };

export function Autocomplete({
  value,
  setValue,
  label,
  disabled = false,
  error,
  showError,
  onBlur,
  options,
  isLoading,
  dataSourceError,
}: ResolvedAutocompleteProps) {
  const currentOption = options.find((opt) => opt.value === value) ?? null;

  if (isLoading) {
    return <CircularProgress size={20} />;
  }

  return (
    <MuiAutocomplete<OptionItem>
      options={options as OptionItem[]}
      value={currentOption}
      onChange={(_, selected) => {
        setValue(selected?.value ?? undefined);
      }}
      getOptionLabel={(opt) => opt.label}
      isOptionEqualToValue={(opt, val) => opt.value === val.value}
      disabled={disabled}
      onBlur={onBlur}
      fullWidth
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          error={showError}
          helperText={showError ? (dataSourceError?.message ?? error) : undefined}
          margin="dense"
        />
      )}
    />
  );
}
```

**Step 3: Run the Autocomplete tests**

```bash
nvm use 20 && pnpm --filter enforma-mui test -- --reporter=verbose Autocomplete.test
```
Expected: all 6 tests PASS.

**Step 4: Commit**

```bash
git add packages/enforma-mui/src/components/AutocompleteOption.tsx packages/enforma-mui/src/components/Autocomplete.tsx packages/enforma-mui/src/components/Autocomplete.test.tsx
git commit -m "feat(enforma-mui): add Autocomplete and AutocompleteOption adapters with tests"
```

---

### Task 7: Write failing tests for ExclusiveToggle MUI adapter

**Files:**
- Create: `packages/enforma-mui/src/components/ExclusiveToggle.test.tsx`

**Step 1: Write the test file**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Enforma, { Form, registerComponents, clearRegistry, ExclusiveToggleOption } from 'enforma';
import { ExclusiveToggle } from './ExclusiveToggle';
import { ExclusiveToggleOption as ExclusiveToggleOptionMui } from './ExclusiveToggleOption';

beforeEach(() => {
  clearRegistry();
  registerComponents({ ExclusiveToggle, ExclusiveToggleOption: ExclusiveToggleOptionMui });
});

describe('MUI ExclusiveToggle', () => {
  it('renders options as buttons', () => {
    render(
      <Form values={{ size: '' }} onChange={() => undefined}>
        <Enforma.ExclusiveToggle bind="size" label="Size">
          <ExclusiveToggleOption value="s" label="S" />
          <ExclusiveToggleOption value="m" label="M" />
          <ExclusiveToggleOption value="l" label="L" />
        </Enforma.ExclusiveToggle>
      </Form>,
    );
    expect(screen.getByRole('button', { name: 'S' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'M' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'L' })).toBeInTheDocument();
  });

  it('renders options from a static array datasource', () => {
    const options = [
      { value: 's', label: 'S' },
      { value: 'm', label: 'M' },
    ];
    render(
      <Form values={{ size: '' }} onChange={() => undefined}>
        <Enforma.ExclusiveToggle bind="size" label="Size" dataSource={options} />
      </Form>,
    );
    expect(screen.getByRole('button', { name: 'S' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'M' })).toBeInTheDocument();
  });

  it('marks the current value button as pressed', () => {
    render(
      <Form values={{ size: 'm' }} onChange={() => undefined}>
        <Enforma.ExclusiveToggle bind="size" label="Size">
          <ExclusiveToggleOption value="s" label="S" />
          <ExclusiveToggleOption value="m" label="M" />
        </Enforma.ExclusiveToggle>
      </Form>,
    );
    expect(screen.getByRole('button', { name: 'M' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'S' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onChange with selected value when user clicks a button', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ size: '' }} onChange={onChange}>
        <Enforma.ExclusiveToggle bind="size" label="Size">
          <ExclusiveToggleOption value="s" label="S" />
          <ExclusiveToggleOption value="m" label="M" />
        </Enforma.ExclusiveToggle>
      </Form>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'S' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ size: 's' }),
      expect.anything(),
    );
  });

  it('shows loading spinner when datasource is loading', () => {
    const neverResolvingDs = { query: (): Promise<never[]> => new Promise(() => undefined) };
    render(
      <Form
        values={{ size: '' }}
        onChange={() => undefined}
        dataSources={{ sizes: neverResolvingDs }}
      >
        <Enforma.ExclusiveToggle bind="size" label="Size" dataSource="sizes" />
      </Form>,
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows error message after blur with failed validation', async () => {
    render(
      <Form values={{ size: '' }} onChange={() => undefined}>
        <Enforma.ExclusiveToggle
          bind="size"
          label="Size"
          validate={(v) => (!v ? 'Required' : null)}
        >
          <ExclusiveToggleOption value="s" label="S" />
        </Enforma.ExclusiveToggle>
      </Form>,
    );
    screen.getByRole('button', { name: 'S' }).focus();
    await userEvent.tab();
    expect(await screen.findByText('Required')).toBeInTheDocument();
  });

  it('disables all buttons when disabled prop is true', () => {
    render(
      <Form values={{ size: '' }} onChange={() => undefined}>
        <Enforma.ExclusiveToggle bind="size" label="Size" disabled>
          <ExclusiveToggleOption value="s" label="S" />
          <ExclusiveToggleOption value="m" label="M" />
        </Enforma.ExclusiveToggle>
      </Form>,
    );
    expect(screen.getByRole('button', { name: 'S' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'M' })).toBeDisabled();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
nvm use 20 && pnpm --filter enforma-mui test -- --reporter=verbose ExclusiveToggle.test
```
Expected: FAIL — `Cannot find module './ExclusiveToggle'` and `Cannot find module './ExclusiveToggleOption'`.

---

### Task 8: Implement MUI ExclusiveToggleOption and ExclusiveToggle adapters

**Files:**
- Create: `packages/enforma-mui/src/components/ExclusiveToggleOption.tsx`
- Create: `packages/enforma-mui/src/components/ExclusiveToggle.tsx`

**Step 1: Create `ExclusiveToggleOption.tsx`**

```typescript
// packages/enforma-mui/src/components/ExclusiveToggleOption.tsx
import { ToggleButton } from '@mui/material';
import { type ResolvedExclusiveToggleOptionProps } from 'enforma';

export function ExclusiveToggleOption({ value, label }: ResolvedExclusiveToggleOptionProps) {
  return <ToggleButton value={value as string}>{label}</ToggleButton>;
}
```

**Step 2: Create `ExclusiveToggle.tsx`**

```typescript
// packages/enforma-mui/src/components/ExclusiveToggle.tsx
import {
  CircularProgress,
  FormControl,
  FormHelperText,
  FormLabel,
  ToggleButtonGroup,
} from '@mui/material';
import { type ResolvedExclusiveToggleProps } from 'enforma';

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
}: ResolvedExclusiveToggleProps) {
  if (isLoading) {
    return <CircularProgress size={20} />;
  }

  return (
    <FormControl disabled={disabled} error={showError}>
      {label !== undefined && <FormLabel>{label}</FormLabel>}
      <ToggleButtonGroup
        value={value ?? null}
        exclusive
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
    </FormControl>
  );
}
```

**Step 3: Run ExclusiveToggle tests**

```bash
nvm use 20 && pnpm --filter enforma-mui test -- --reporter=verbose ExclusiveToggle.test
```
Expected: all 7 tests PASS.

**Step 4: Commit**

```bash
git add packages/enforma-mui/src/components/ExclusiveToggleOption.tsx packages/enforma-mui/src/components/ExclusiveToggle.tsx packages/enforma-mui/src/components/ExclusiveToggle.test.tsx
git commit -m "feat(enforma-mui): add ExclusiveToggle and ExclusiveToggleOption adapters with tests"
```

---

### Task 9: Register new components in the MUI bundle

**Files:**
- Modify: `packages/enforma-mui/src/index.ts`

**Step 1: Add imports**

After the `RadioGroupOption` import line, add:
```typescript
import { Autocomplete } from './components/Autocomplete';
import { AutocompleteOption } from './components/AutocompleteOption';
import { ExclusiveToggle } from './components/ExclusiveToggle';
import { ExclusiveToggleOption } from './components/ExclusiveToggleOption';
```

**Step 2: Add to `muiComponents` object**

After `RadioGroupOption,` add:
```typescript
  Autocomplete,
  AutocompleteOption,
  ExclusiveToggle,
  ExclusiveToggleOption,
```

**Step 3: Add to named exports**

After `RadioGroupOption,` in the export block, add:
```typescript
  Autocomplete,
  AutocompleteOption,
  ExclusiveToggle,
  ExclusiveToggleOption,
```

**Step 4: Run typecheck and full test suite**

```bash
nvm use 20 && pnpm typecheck && pnpm test
```
Expected: no type errors, all tests pass.

**Step 5: Commit**

```bash
git add packages/enforma-mui/src/index.ts
git commit -m "feat(enforma-mui): register Autocomplete and ExclusiveToggle in bundle"
```

---

### Task 10: Add demo examples

**Files:**
- Modify: `apps/demo/src/App.tsx`

**Step 1: Add state for new components**

In the App component, find where `radioValues` state is defined and add nearby:
```typescript
const [autocompleteValues, setAutocompleteValues] = useState<Record<string, unknown>>({
  country: '',
  plan: '',
});
const [toggleValues, setToggleValues] = useState<Record<string, unknown>>({
  size: '',
  plan: '',
});
```

**Step 2: Add demo sections after the RadioGroup section (after line 303, the `<hr>` after RadioGroup)**

```tsx
<hr style={{ margin: '2rem 0' }} />

<h2>Autocomplete</h2>
<p style={{ color: '#555', marginBottom: '1rem' }}>
  <code>Autocomplete</code> is a searchable combobox — constrained to options, supports
  datasource and inline children.
</p>

<Enforma.Form
  values={autocompleteValues}
  onChange={setAutocompleteValues}
  aria-label="autocomplete demo form"
  dataSources={DATASOURCE_DEMO_SOURCES}
>
  {/* Autocomplete — inline options */}
  <Enforma.Autocomplete bind="country" label="Country">
    <Enforma.Autocomplete.Option value="au" label="Australia" />
    <Enforma.Autocomplete.Option value="nz" label="New Zealand" />
    <Enforma.Autocomplete.Option value="us" label="United States" />
  </Enforma.Autocomplete>

  {/* Autocomplete — datasource with template mapping */}
  <Enforma.Autocomplete bind="plan" label="Plan (datasource)" dataSource="countries">
    <Enforma.Autocomplete.Option label="name" value="code" />
  </Enforma.Autocomplete>
</Enforma.Form>

<pre style={{ marginTop: '2rem', background: '#f4f4f4', padding: '1rem' }}>
  {JSON.stringify(autocompleteValues, null, 2)}
</pre>

<hr style={{ margin: '2rem 0' }} />

<h2>Exclusive Toggle</h2>
<p style={{ color: '#555', marginBottom: '1rem' }}>
  <code>ExclusiveToggle</code> is a segmented button group for single selection from a small
  fixed set — inline children or datasource.
</p>

<Enforma.Form
  values={toggleValues}
  onChange={setToggleValues}
  aria-label="exclusive toggle demo form"
  dataSources={DATASOURCE_DEMO_SOURCES}
>
  {/* ExclusiveToggle — inline options */}
  <Enforma.ExclusiveToggle bind="size" label="Size">
    <Enforma.ExclusiveToggle.Option value="s" label="S" />
    <Enforma.ExclusiveToggle.Option value="m" label="M" />
    <Enforma.ExclusiveToggle.Option value="l" label="L" />
  </Enforma.ExclusiveToggle>

  {/* ExclusiveToggle — datasource with template mapping */}
  <Enforma.ExclusiveToggle bind="plan" label="Country (datasource)" dataSource="countries">
    <Enforma.ExclusiveToggle.Option label="name" value="code" />
  </Enforma.ExclusiveToggle>
</Enforma.Form>

<pre style={{ marginTop: '2rem', background: '#f4f4f4', padding: '1rem' }}>
  {JSON.stringify(toggleValues, null, 2)}
</pre>
```

**Step 3: Run typecheck**

```bash
nvm use 20 && pnpm typecheck
```
Expected: no errors. If App.tsx doesn't import `useState` for the new state vars, add it (it likely already imports useState).

**Step 4: Commit**

```bash
git add apps/demo/src/App.tsx
git commit -m "feat(demo): add Autocomplete and ExclusiveToggle examples"
```

---

### Task 11: Final verification

**Step 1: Run lint**

```bash
nvm use 20 && pnpm lint
```
Expected: no errors or warnings.

**Step 2: Run typecheck**

```bash
nvm use 20 && pnpm typecheck
```
Expected: no errors.

**Step 3: Run full test suite**

```bash
nvm use 20 && pnpm test
```
Expected: all tests pass.

**Step 4: If all pass — done. If lint/typecheck errors exist, fix them before considering the task complete.**
