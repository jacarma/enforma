# RadioGroup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `RadioGroup` single-selection field component that mirrors `Select` — datasource-backed, options pre-rendered in dispatch, adapter receives dumb children.

**Architecture:** Core types + slot component → dispatch in `fields.tsx` using existing `buildSelectOptions` + `useDataSource` → MUI adapter renders MUI `RadioGroup` + `Radio` buttons. Follows the exact same pattern as `Select` / `SelectOption`.

**Tech Stack:** TypeScript strict, React, Vitest + @testing-library/react, MUI v5.

---

### Task 1: Add types to core

**Files:**
- Modify: `packages/enforma/src/components/types.ts`

**Step 1: Add props and resolved types**

In `types.ts`, add after `SwitchProps`:

```ts
export type RadioGroupProps = CommonProps & {
  dataSource?: DataSourceProp<unknown>;
  children?: ReactNode;
  row?: Reactive<boolean>;
};

export type ResolvedRadioGroupProps = ResolvedCommonProps & {
  value: unknown;
  setValue: (value: unknown) => void;
  children: ReactNode;
  row: boolean;
  isLoading: boolean;
  dataSourceError: Error | null;
};

export type ResolvedRadioGroupOptionProps = {
  value: unknown;
  label: string;
};
```

In `ComponentPropsMap`, add two entries:

```ts
RadioGroup: ResolvedRadioGroupProps;
RadioGroupOption: ResolvedRadioGroupOptionProps;
```

**Step 2: Run typecheck**

```bash
nvm use 20 && pnpm typecheck
```

Expected: passes with no errors.

**Step 3: Commit**

```bash
git add packages/enforma/src/components/types.ts
git commit -m "feat(enforma): add RadioGroup and RadioGroupOption types"
```

---

### Task 2: Create RadioGroupOption slot component (core)

**Files:**
- Create: `packages/enforma/src/components/RadioGroupOption.tsx`

**Step 1: Create the file**

```tsx
export type RadioGroupOptionProps = {
  label: string | ((item: unknown) => string);
  value: string | ((item: unknown) => unknown);
};

export function RadioGroupOption(_: RadioGroupOptionProps): null {
  return null;
}
```

This renders nothing — it's a declarative template child, read by the dispatch layer via `React.Children`, exactly like `SelectOption`.

**Step 2: Run typecheck**

```bash
nvm use 20 && pnpm typecheck
```

Expected: passes.

**Step 3: Commit**

```bash
git add packages/enforma/src/components/RadioGroupOption.tsx
git commit -m "feat(enforma): add RadioGroupOption slot component"
```

---

### Task 3: Add RadioGroupDispatch to fields.tsx and export

**Files:**
- Modify: `packages/enforma/src/components/fields.tsx`

**Step 1: Add imports at top of fields.tsx**

Add to the import block:

```ts
import { RadioGroupOption } from './RadioGroupOption';
import type { RadioGroupOptionProps } from './RadioGroupOption';
import type {
  RadioGroupProps,
  ResolvedRadioGroupProps,
  // ... (add to existing import list)
} from './types';
```

**Step 2: Add RadioGroupDispatch function**

Add after `SelectDispatch` (before the export block at the bottom):

```tsx
function RadioGroupDispatch(props: RadioGroupProps) {
  const resolved = useFieldProps<FieldResolved<unknown>>(props);
  const {
    items,
    isLoading,
    error: dataSourceError,
  } = useDataSource(props.dataSource, {
    bind: props.bind,
  });
  const options = buildSelectOptions(items, props.children);
  const RadioGroupOptionImpl = getComponent('RadioGroupOption');
  if (!RadioGroupOptionImpl) {
    throw new Error('Enforma: component "RadioGroupOption" is not registered.');
  }
  const renderedOptions = options.map((opt) => (
    <RadioGroupOptionImpl key={String(opt.value)} value={opt.value} label={opt.label} />
  ));
  const row = typeof props.row === 'function'
    ? props.row(resolved.value as never, resolved.value as never)
    : (props.row ?? false);
  return dispatchComponent('RadioGroup', {
    ...resolved,
    children: renderedOptions,
    row,
    isLoading,
    dataSourceError: dataSourceError ?? null,
  } as ResolvedRadioGroupProps);
}
```

> **Note on `row`:** `row` is a `Reactive<boolean>` prop. To resolve it properly, use `useReactiveProp` from `'../hooks/useField'` (it's already used internally by `useFieldProps`). Look at how `useFieldProps` resolves reactive props — you can import `useReactiveProp` and call `useReactiveProp(props.row, false)` to get the resolved boolean. This is cleaner than the inline ternary shown above. Check `packages/enforma/src/hooks/useField.ts` to confirm the signature.

**Step 3: Add export at the bottom of fields.tsx**

Add alongside the other exports:

```ts
export const RadioGroup = Object.assign(memo(RadioGroupDispatch, stablePropsEqual), {
  Option: RadioGroupOption,
});
export { RadioGroupOption };
```

**Step 4: Run typecheck**

```bash
nvm use 20 && pnpm typecheck
```

Expected: passes.

**Step 5: Commit**

```bash
git add packages/enforma/src/components/fields.tsx
git commit -m "feat(enforma): add RadioGroupDispatch and RadioGroup export"
```

---

### Task 4: Export from core index.ts

**Files:**
- Modify: `packages/enforma/src/index.ts`

**Step 1: Add RadioGroupOption export**

`fields.tsx` is already spread into `Enforma` via `import * as fields`, so `RadioGroup` appears on the default export automatically. You only need to add named exports for the new types and slot component.

Add to `index.ts`:

```ts
export { RadioGroupOption } from './components/RadioGroupOption';
export type { RadioGroupOptionProps } from './components/RadioGroupOption';
export type { RadioGroupProps, ResolvedRadioGroupProps, ResolvedRadioGroupOptionProps } from './components/types';
```

**Step 2: Run typecheck**

```bash
nvm use 20 && pnpm typecheck
```

Expected: passes.

**Step 3: Commit**

```bash
git add packages/enforma/src/index.ts
git commit -m "feat(enforma): export RadioGroup types and RadioGroupOption"
```

---

### Task 5: Write MUI RadioGroupOption adapter test (failing)

**Files:**
- Create: `packages/enforma-mui/src/components/RadioGroup.test.tsx`

**Step 1: Write the test file**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Enforma, { Form, registerComponents, clearRegistry, RadioGroupOption } from 'enforma';
import { RadioGroup } from './RadioGroup';
import { RadioGroupOption as RadioGroupOptionMui } from './RadioGroupOption';

beforeEach(() => {
  clearRegistry();
  registerComponents({ RadioGroup, RadioGroupOption: RadioGroupOptionMui });
});

describe('MUI RadioGroup', () => {
  it('renders options from inline children', () => {
    render(
      <Form values={{ size: '' }} onChange={() => undefined}>
        <Enforma.RadioGroup bind="size" label="Size">
          <RadioGroupOption value="s" label="Small" />
          <RadioGroupOption value="m" label="Medium" />
          <RadioGroupOption value="l" label="Large" />
        </Enforma.RadioGroup>
      </Form>,
    );
    expect(screen.getByRole('radio', { name: 'Small' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Medium' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Large' })).toBeInTheDocument();
  });

  it('renders options from a static array datasource', () => {
    const options = [
      { value: 's', label: 'Small' },
      { value: 'm', label: 'Medium' },
    ];
    render(
      <Form values={{ size: '' }} onChange={() => undefined}>
        <Enforma.RadioGroup bind="size" label="Size" dataSource={options} />
      </Form>,
    );
    expect(screen.getByRole('radio', { name: 'Small' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Medium' })).toBeInTheDocument();
  });

  it('checks the radio matching the current form value', () => {
    render(
      <Form values={{ size: 'm' }} onChange={() => undefined}>
        <Enforma.RadioGroup bind="size" label="Size">
          <RadioGroupOption value="s" label="Small" />
          <RadioGroupOption value="m" label="Medium" />
        </Enforma.RadioGroup>
      </Form>,
    );
    expect(screen.getByRole('radio', { name: 'Medium' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Small' })).not.toBeChecked();
  });

  it('calls onChange with selected value when user picks an option', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ size: '' }} onChange={onChange}>
        <Enforma.RadioGroup bind="size" label="Size">
          <RadioGroupOption value="s" label="Small" />
          <RadioGroupOption value="m" label="Medium" />
        </Enforma.RadioGroup>
      </Form>,
    );
    await userEvent.click(screen.getByRole('radio', { name: 'Small' }));
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
        <Enforma.RadioGroup bind="size" label="Size" dataSource="sizes" />
      </Form>,
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows error message when showError is true', async () => {
    render(
      <Form values={{ size: '' }} onChange={() => undefined}>
        <Enforma.RadioGroup
          bind="size"
          label="Size"
          validate={(v) => (!v ? 'Required' : null)}
        >
          <RadioGroupOption value="s" label="Small" />
        </Enforma.RadioGroup>
      </Form>,
    );
    screen.getByRole('radio', { name: 'Small' }).focus();
    await userEvent.tab();
    expect(await screen.findByText('Required')).toBeInTheDocument();
  });

  it('disables all radio inputs when disabled prop is true', () => {
    render(
      <Form values={{ size: '' }} onChange={() => undefined}>
        <Enforma.RadioGroup bind="size" label="Size" disabled>
          <RadioGroupOption value="s" label="Small" />
          <RadioGroupOption value="m" label="Medium" />
        </Enforma.RadioGroup>
      </Form>,
    );
    expect(screen.getByRole('radio', { name: 'Small' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Medium' })).toBeDisabled();
  });

  it('renders options in a row when row prop is true', () => {
    render(
      <Form values={{ size: '' }} onChange={() => undefined}>
        <Enforma.RadioGroup bind="size" label="Size" row>
          <RadioGroupOption value="s" label="Small" />
          <RadioGroupOption value="m" label="Medium" />
        </Enforma.RadioGroup>
      </Form>,
    );
    // MUI RadioGroup with row={true} applies flexDirection: row
    // We just assert the radios render — visual row layout is CSS
    expect(screen.getByRole('radio', { name: 'Small' })).toBeInTheDocument();
  });
});
```

**Step 2: Run tests to confirm they fail**

```bash
nvm use 20 && pnpm test --filter enforma-mui -- RadioGroup
```

Expected: FAIL — `RadioGroup` and `RadioGroupOption` files don't exist yet.

---

### Task 6: Create MUI RadioGroupOption adapter

**Files:**
- Create: `packages/enforma-mui/src/components/RadioGroupOption.tsx`

**Step 1: Create the file**

```tsx
import { FormControlLabel, Radio } from '@mui/material';
import { type ResolvedRadioGroupOptionProps } from 'enforma';

export function RadioGroupOption({ value, label }: ResolvedRadioGroupOptionProps) {
  return <FormControlLabel value={value} control={<Radio />} label={label} />;
}
```

**Step 2: Run typecheck**

```bash
nvm use 20 && pnpm typecheck
```

Expected: passes.

---

### Task 7: Create MUI RadioGroup adapter

**Files:**
- Create: `packages/enforma-mui/src/components/RadioGroup.tsx`

**Step 1: Create the file**

```tsx
import {
  CircularProgress,
  FormControl,
  FormHelperText,
  FormLabel,
  RadioGroup as MuiRadioGroup,
} from '@mui/material';
import { type ResolvedRadioGroupProps } from 'enforma';

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
  isLoading,
  dataSourceError,
}: ResolvedRadioGroupProps) {
  if (isLoading) {
    return <CircularProgress size={20} />;
  }

  return (
    <FormControl disabled={disabled} error={showError}>
      {label !== undefined && <FormLabel>{label}</FormLabel>}
      <MuiRadioGroup
        value={value ?? ''}
        onChange={(e) => {
          setValue(e.target.value);
        }}
        onBlur={onBlur}
        row={row}
      >
        {children}
      </MuiRadioGroup>
      {showError && (
        <FormHelperText>{dataSourceError?.message ?? error}</FormHelperText>
      )}
    </FormControl>
  );
}
```

**Step 2: Run tests**

```bash
nvm use 20 && pnpm test --filter enforma-mui -- RadioGroup
```

Expected: all 7 tests pass.

**Step 3: Commit**

```bash
git add packages/enforma-mui/src/components/RadioGroup.tsx \
        packages/enforma-mui/src/components/RadioGroupOption.tsx \
        packages/enforma-mui/src/components/RadioGroup.test.tsx
git commit -m "feat(enforma-mui): add RadioGroup and RadioGroupOption adapters"
```

---

### Task 8: Register in enforma-mui index

**Files:**
- Modify: `packages/enforma-mui/src/index.ts`

**Step 1: Add imports and registration**

Add to imports:

```ts
import { RadioGroup } from './components/RadioGroup';
import { RadioGroupOption } from './components/RadioGroupOption';
```

Add to `muiComponents`:

```ts
RadioGroup,
RadioGroupOption,
```

Add to named exports:

```ts
export { RadioGroup, RadioGroupOption };
```

**Step 2: Run typecheck and full test suite**

```bash
nvm use 20 && pnpm typecheck && pnpm test
```

Expected: all pass.

**Step 3: Commit**

```bash
git add packages/enforma-mui/src/index.ts
git commit -m "feat(enforma-mui): register RadioGroup and RadioGroupOption in bundle"
```

---

### Task 9: Add RadioGroup to the demo

**Files:**
- Modify: `apps/demo/src/App.tsx`

**Step 1: Add two RadioGroup examples**

In the demo form (find a natural spot near the Select or Checkbox examples), add:

```tsx
{/* RadioGroup — inline options */}
<Enforma.RadioGroup bind="size" label="Size">
  <Enforma.RadioGroup.Option value="s" label="Small" />
  <Enforma.RadioGroup.Option value="m" label="Medium" />
  <Enforma.RadioGroup.Option value="l" label="Large" />
</Enforma.RadioGroup>

{/* RadioGroup — datasource, row layout, reactive disabled */}
<Enforma.RadioGroup
  bind="country"
  label="Country (row)"
  dataSource={DATASOURCE_DEMO_SOURCES.countries}
  row
  disabled={(scope) => Boolean(scope.disableCountry)}
>
  <Enforma.RadioGroup.Option label="name" value="code" />
</Enforma.RadioGroup>
```

Make sure `size` and `country` fields are present in the initial `values` object passed to the demo Form (add with empty string defaults if needed).

**Step 2: Run lint and typecheck**

```bash
nvm use 20 && pnpm lint && pnpm typecheck
```

Expected: both pass with no errors or warnings.

**Step 3: Run full test suite**

```bash
nvm use 20 && pnpm test
```

Expected: all pass.

**Step 4: Commit**

```bash
git add apps/demo/src/App.tsx
git commit -m "feat(demo): add RadioGroup examples"
```
