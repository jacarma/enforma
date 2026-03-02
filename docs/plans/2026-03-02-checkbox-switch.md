# Checkbox & Switch Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `Checkbox` and `Switch` boolean field components to enforma core and the enforma-mui adapter.

**Architecture:** Follow the existing dispatch + adapter pattern. Update types in enforma core (add `labelPlacement`, Switch aliases, registry entry), add the Switch dispatch component, implement TDD-driven MUI adapters, register them in all three bundles (classic/outlined/standard), and add a demo section.

**Tech Stack:** TypeScript strict, React, Vitest, @testing-library/react, @mui/material (FormControlLabel, Checkbox, Switch, FormHelperText)

---

### Task 1: Update types in enforma core

**Files:**
- Modify: `packages/enforma/src/components/types.ts`

**Step 1: Add `labelPlacement` to `CheckboxProps` and add `SwitchProps` alias**

In `packages/enforma/src/components/types.ts`, replace line 42:
```ts
export type CheckboxProps = CommonProps;
```
with:
```ts
export type CheckboxProps = CommonProps & {
  labelPlacement?: Reactive<'end' | 'start' | 'top' | 'bottom'>;
};
export type SwitchProps = CheckboxProps;
```

**Step 2: Add `labelPlacement` to `ResolvedCheckboxProps` and add `ResolvedSwitchProps` alias**

Replace lines 96–99:
```ts
export type ResolvedCheckboxProps = Omit<ResolvedCommonProps, 'value' | 'setValue'> & {
  value: boolean | undefined;
  setValue: (value: boolean) => void;
};
```
with:
```ts
export type ResolvedCheckboxProps = Omit<ResolvedCommonProps, 'value' | 'setValue'> & {
  value: boolean | undefined;
  setValue: (value: boolean) => void;
  labelPlacement?: 'end' | 'start' | 'top' | 'bottom';
};
export type ResolvedSwitchProps = ResolvedCheckboxProps;
```

**Step 3: Add `Switch` to `ComponentPropsMap`**

Replace lines 54–66:
```ts
export type ComponentPropsMap = {
  TextInput: ResolvedTextInputProps;
  Textarea: ResolvedTextareaProps;
  Select: ResolvedSelectProps;
  SelectOption: ResolvedSelectOptionProps;
  Checkbox: ResolvedCheckboxProps;
  Fieldset: ResolvedFieldsetProps;
  FormWrap: FormWrapProps;
  List: ResolvedListProps;
  ListItem: ResolvedListItemProps;
  FormModal: ResolvedFormModalProps;
  AddButton: ResolvedAddButtonProps;
};
```
with:
```ts
export type ComponentPropsMap = {
  TextInput: ResolvedTextInputProps;
  Textarea: ResolvedTextareaProps;
  Select: ResolvedSelectProps;
  SelectOption: ResolvedSelectOptionProps;
  Checkbox: ResolvedCheckboxProps;
  Switch: ResolvedSwitchProps;
  Fieldset: ResolvedFieldsetProps;
  FormWrap: FormWrapProps;
  List: ResolvedListProps;
  ListItem: ResolvedListItemProps;
  FormModal: ResolvedFormModalProps;
  AddButton: ResolvedAddButtonProps;
};
```

**Step 4: Run typecheck**
```
nvm use 20 && pnpm typecheck
```
Expected: no errors.

**Step 5: Commit**
```
git add packages/enforma/src/components/types.ts
git commit -m "feat(enforma): add labelPlacement to CheckboxProps, add SwitchProps and Switch to ComponentPropsMap"
```

---

### Task 2: Add Switch dispatch and update exports

**Files:**
- Modify: `packages/enforma/src/components/fields.tsx`
- Modify: `packages/enforma/src/index.ts`

**Step 1: Update imports in `fields.tsx`**

Replace the import block at lines 6–17:
```ts
import type {
  CheckboxProps,
  ComponentPropsMap,
  FieldsetProps,
  SelectProps,
  TextareaProps,
  TextInputProps,
  ResolvedCheckboxProps,
  ResolvedTextInputProps,
  ResolvedTextareaProps,
  FieldResolved,
} from './types';
```
with:
```ts
import type {
  CheckboxProps,
  ComponentPropsMap,
  FieldsetProps,
  SelectProps,
  SwitchProps,
  TextareaProps,
  TextInputProps,
  ResolvedCheckboxProps,
  ResolvedSwitchProps,
  ResolvedTextInputProps,
  ResolvedTextareaProps,
  FieldResolved,
} from './types';
```

**Step 2: Add `SwitchDispatch` after `CheckboxDispatch` (after line 63)**

```ts
function SwitchDispatch(props: SwitchProps) {
  return dispatchComponent('Switch', useFieldProps<ResolvedSwitchProps>(props));
}
```

**Step 3: Export `Switch` in the exports block (after line 156)**

After `export const Checkbox = memo(CheckboxDispatch, stablePropsEqual);`, add:
```ts
export const Switch = memo(SwitchDispatch, stablePropsEqual);
```

**Step 4: Update `packages/enforma/src/index.ts` — add `SwitchProps` to the props type exports**

Replace:
```ts
export type {
  Reactive,
  CommonProps,
  TextInputProps,
  TextareaProps,
  SelectProps,
  CheckboxProps,
  ComponentPropsMap,
  FieldsetProps,
  FormWrapProps,
  ValidationState,
  ToComponentProps,
  FieldResolved,
} from './components/types';
```
with:
```ts
export type {
  Reactive,
  CommonProps,
  TextInputProps,
  TextareaProps,
  SelectProps,
  CheckboxProps,
  SwitchProps,
  ComponentPropsMap,
  FieldsetProps,
  FormWrapProps,
  ValidationState,
  ToComponentProps,
  FieldResolved,
} from './components/types';
```

**Step 5: Add `ResolvedSwitchProps` to the resolved type exports in `index.ts`**

Replace:
```ts
export type {
  ResolvedCommonProps,
  ResolvedTextInputProps,
  ResolvedTextareaProps,
  ResolvedCheckboxProps,
  ResolvedSelectProps,
  ResolvedSelectOptionProps,
  ResolvedFieldsetProps,
  ResolvedListProps,
  ResolvedListItemProps,
  ResolvedFormModalProps,
  ResolvedAddButtonProps,
} from './components/types';
```
with:
```ts
export type {
  ResolvedCommonProps,
  ResolvedTextInputProps,
  ResolvedTextareaProps,
  ResolvedCheckboxProps,
  ResolvedSwitchProps,
  ResolvedSelectProps,
  ResolvedSelectOptionProps,
  ResolvedFieldsetProps,
  ResolvedListProps,
  ResolvedListItemProps,
  ResolvedFormModalProps,
  ResolvedAddButtonProps,
} from './components/types';
```

**Step 6: Run typecheck**
```
nvm use 20 && pnpm typecheck
```
Expected: no errors.

**Step 7: Commit**
```
git add packages/enforma/src/components/fields.tsx packages/enforma/src/index.ts
git commit -m "feat(enforma): add Switch dispatch component and exports"
```

---

### Task 3: Implement MUI Checkbox adapter (TDD)

**Files:**
- Create: `packages/enforma-mui/src/components/Checkbox.test.tsx`
- Create: `packages/enforma-mui/src/components/Checkbox.tsx`

**Step 1: Write the failing test**

Create `packages/enforma-mui/src/components/Checkbox.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Enforma, { Form, registerComponents, clearRegistry } from 'enforma';
import { Checkbox } from './Checkbox';

beforeEach(() => {
  clearRegistry();
  registerComponents({ Checkbox });
});

describe('MUI Checkbox', () => {
  it('renders a checkbox accessible by role and label', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.Checkbox bind="agree" label="Agree" />
      </Form>,
    );
    expect(screen.getByRole('checkbox', { name: 'Agree' })).toBeInTheDocument();
  });

  it('is unchecked when form value is false', () => {
    render(
      <Form values={{ agree: false }} onChange={() => undefined}>
        <Enforma.Checkbox bind="agree" label="Agree" />
      </Form>,
    );
    expect(screen.getByRole('checkbox', { name: 'Agree' })).not.toBeChecked();
  });

  it('is checked when form value is true', () => {
    render(
      <Form values={{ agree: true }} onChange={() => undefined}>
        <Enforma.Checkbox bind="agree" label="Agree" />
      </Form>,
    );
    expect(screen.getByRole('checkbox', { name: 'Agree' })).toBeChecked();
  });

  it('calls onChange with true when user checks the box', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ agree: false }} onChange={onChange}>
        <Enforma.Checkbox bind="agree" label="Agree" />
      </Form>,
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'Agree' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ agree: true }),
      expect.anything(),
    );
  });

  it('calls onChange with false when user unchecks the box', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ agree: true }} onChange={onChange}>
        <Enforma.Checkbox bind="agree" label="Agree" />
      </Form>,
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'Agree' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ agree: false }),
      expect.anything(),
    );
  });

  it('is disabled when disabled prop is true', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.Checkbox bind="agree" label="Agree" disabled />
      </Form>,
    );
    expect(screen.getByRole('checkbox', { name: 'Agree' })).toBeDisabled();
  });

  it('shows error message after blur when validate fails', async () => {
    render(
      <Form values={{ agree: false }} onChange={() => undefined}>
        <Enforma.Checkbox
          bind="agree"
          label="Agree"
          validate={(v) => (!v ? 'You must agree' : null)}
        />
      </Form>,
    );
    screen.getByRole('checkbox', { name: 'Agree' }).focus();
    await userEvent.tab();
    expect(await screen.findByText('You must agree')).toBeInTheDocument();
  });

  it('shows description when there is no error', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.Checkbox bind="agree" label="Agree" description="You must be 18+" />
      </Form>,
    );
    expect(screen.getByText('You must be 18+')).toBeInTheDocument();
  });

  it('renders without error when labelPlacement is set to start', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.Checkbox bind="agree" label="Agree" labelPlacement="start" />
      </Form>,
    );
    expect(screen.getByRole('checkbox', { name: 'Agree' })).toBeInTheDocument();
  });
});
```

**Step 2: Run the test to verify it fails**
```
nvm use 20 && pnpm --filter enforma-mui test
```
Expected: FAIL — `Cannot find module './Checkbox'`

**Step 3: Write the implementation**

Create `packages/enforma-mui/src/components/Checkbox.tsx`:
```tsx
import { FormControlLabel, Checkbox as MuiCheckbox, FormHelperText } from '@mui/material';
import { type ResolvedCheckboxProps } from 'enforma';
import { ComponentWrap } from './ComponentWrap';

export function Checkbox({
  value,
  setValue,
  label,
  disabled = false,
  description,
  error,
  showError,
  onBlur,
  labelPlacement = 'end',
}: ResolvedCheckboxProps) {
  return (
    <ComponentWrap error={showError} disabled={disabled}>
      <FormControlLabel
        label={label ?? ''}
        labelPlacement={labelPlacement}
        disabled={disabled}
        control={
          <MuiCheckbox
            checked={value ?? false}
            onChange={(e) => {
              setValue(e.target.checked);
            }}
            onBlur={onBlur}
          />
        }
      />
      {showError && error && <FormHelperText>{error}</FormHelperText>}
      {!showError && description !== undefined && (
        <FormHelperText>{description}</FormHelperText>
      )}
    </ComponentWrap>
  );
}
```

**Step 4: Run the tests to verify they pass**
```
nvm use 20 && pnpm --filter enforma-mui test
```
Expected: all Checkbox tests pass.

**Step 5: Commit**
```
git add packages/enforma-mui/src/components/Checkbox.tsx packages/enforma-mui/src/components/Checkbox.test.tsx
git commit -m "feat(enforma-mui): add Checkbox adapter with tests"
```

---

### Task 4: Implement MUI Switch adapter (TDD)

**Files:**
- Create: `packages/enforma-mui/src/components/Switch.test.tsx`
- Create: `packages/enforma-mui/src/components/Switch.tsx`

**Step 1: Write the failing test**

Create `packages/enforma-mui/src/components/Switch.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Enforma, { Form, registerComponents, clearRegistry } from 'enforma';
import { Switch } from './Switch';

beforeEach(() => {
  clearRegistry();
  registerComponents({ Switch });
});

describe('MUI Switch', () => {
  it('renders a checkbox role accessible by label', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.Switch bind="enabled" label="Enable notifications" />
      </Form>,
    );
    expect(screen.getByRole('checkbox', { name: 'Enable notifications' })).toBeInTheDocument();
  });

  it('is unchecked when form value is false', () => {
    render(
      <Form values={{ enabled: false }} onChange={() => undefined}>
        <Enforma.Switch bind="enabled" label="Enable" />
      </Form>,
    );
    expect(screen.getByRole('checkbox', { name: 'Enable' })).not.toBeChecked();
  });

  it('is checked when form value is true', () => {
    render(
      <Form values={{ enabled: true }} onChange={() => undefined}>
        <Enforma.Switch bind="enabled" label="Enable" />
      </Form>,
    );
    expect(screen.getByRole('checkbox', { name: 'Enable' })).toBeChecked();
  });

  it('calls onChange with true when user toggles on', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ enabled: false }} onChange={onChange}>
        <Enforma.Switch bind="enabled" label="Enable" />
      </Form>,
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'Enable' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true }),
      expect.anything(),
    );
  });

  it('calls onChange with false when user toggles off', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ enabled: true }} onChange={onChange}>
        <Enforma.Switch bind="enabled" label="Enable" />
      </Form>,
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'Enable' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
      expect.anything(),
    );
  });

  it('is disabled when disabled prop is true', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.Switch bind="enabled" label="Enable" disabled />
      </Form>,
    );
    expect(screen.getByRole('checkbox', { name: 'Enable' })).toBeDisabled();
  });

  it('shows error message after blur when validate fails', async () => {
    render(
      <Form values={{ enabled: false }} onChange={() => undefined}>
        <Enforma.Switch
          bind="enabled"
          label="Enable"
          validate={(v) => (!v ? 'Must be enabled' : null)}
        />
      </Form>,
    );
    screen.getByRole('checkbox', { name: 'Enable' }).focus();
    await userEvent.tab();
    expect(await screen.findByText('Must be enabled')).toBeInTheDocument();
  });

  it('shows description when there is no error', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.Switch bind="enabled" label="Enable" description="Enables email alerts" />
      </Form>,
    );
    expect(screen.getByText('Enables email alerts')).toBeInTheDocument();
  });

  it('renders without error when labelPlacement is set to start', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.Switch bind="enabled" label="Enable" labelPlacement="start" />
      </Form>,
    );
    expect(screen.getByRole('checkbox', { name: 'Enable' })).toBeInTheDocument();
  });
});
```

**Step 2: Run the test to verify it fails**
```
nvm use 20 && pnpm --filter enforma-mui test
```
Expected: FAIL — `Cannot find module './Switch'`

**Step 3: Write the implementation**

Create `packages/enforma-mui/src/components/Switch.tsx`:
```tsx
import { FormControlLabel, Switch as MuiSwitch, FormHelperText } from '@mui/material';
import { type ResolvedSwitchProps } from 'enforma';
import { ComponentWrap } from './ComponentWrap';

export function Switch({
  value,
  setValue,
  label,
  disabled = false,
  description,
  error,
  showError,
  onBlur,
  labelPlacement = 'end',
}: ResolvedSwitchProps) {
  return (
    <ComponentWrap error={showError} disabled={disabled}>
      <FormControlLabel
        label={label ?? ''}
        labelPlacement={labelPlacement}
        disabled={disabled}
        control={
          <MuiSwitch
            checked={value ?? false}
            onChange={(e) => {
              setValue(e.target.checked);
            }}
            onBlur={onBlur}
          />
        }
      />
      {showError && error && <FormHelperText>{error}</FormHelperText>}
      {!showError && description !== undefined && (
        <FormHelperText>{description}</FormHelperText>
      )}
    </ComponentWrap>
  );
}
```

**Step 4: Run the tests to verify they pass**
```
nvm use 20 && pnpm --filter enforma-mui test
```
Expected: all Switch tests pass.

**Step 5: Commit**
```
git add packages/enforma-mui/src/components/Switch.tsx packages/enforma-mui/src/components/Switch.test.tsx
git commit -m "feat(enforma-mui): add Switch adapter with tests"
```

---

### Task 5: Register Checkbox and Switch in enforma-mui bundles

**Files:**
- Modify: `packages/enforma-mui/src/index.ts`

**Step 1: Add imports for Checkbox and Switch**

In `packages/enforma-mui/src/index.ts`, add after the `import { TextInput }` line:
```ts
import { Checkbox } from './components/Checkbox';
import { Switch } from './components/Switch';
```

**Step 2: Add to all three registry bundles**

Replace:
```ts
export const classic: Partial<EnformaComponentRegistry> = {
  TextInput,
  Select,
  SelectOption,
  Fieldset,
  FormWrap: ClassicProvider,
  ...listComponents,
};

export const outlined: Partial<EnformaComponentRegistry> = {
  TextInput,
  Select,
  SelectOption,
  Fieldset,
  FormWrap: OutlinedProvider,
  ...listComponents,
};

export const standard: Partial<EnformaComponentRegistry> = {
  TextInput,
  Select,
  SelectOption,
  Fieldset,
  FormWrap: StandardProvider,
  ...listComponents,
};
```
with:
```ts
const booleanComponents = { Checkbox, Switch } satisfies Partial<EnformaComponentRegistry>;

export const classic: Partial<EnformaComponentRegistry> = {
  TextInput,
  Select,
  SelectOption,
  Fieldset,
  FormWrap: ClassicProvider,
  ...listComponents,
  ...booleanComponents,
};

export const outlined: Partial<EnformaComponentRegistry> = {
  TextInput,
  Select,
  SelectOption,
  Fieldset,
  FormWrap: OutlinedProvider,
  ...listComponents,
  ...booleanComponents,
};

export const standard: Partial<EnformaComponentRegistry> = {
  TextInput,
  Select,
  SelectOption,
  Fieldset,
  FormWrap: StandardProvider,
  ...listComponents,
  ...booleanComponents,
};
```

**Step 3: Add Checkbox and Switch to the named exports line**

Replace:
```ts
export { TextInput, Fieldset, Select, SelectOption, List, ListItem, AddButton, FormModal };
```
with:
```ts
export { TextInput, Checkbox, Switch, Fieldset, Select, SelectOption, List, ListItem, AddButton, FormModal };
```

**Step 4: Run typecheck and tests**
```
nvm use 20 && pnpm typecheck && pnpm test
```
Expected: no errors, all tests pass.

**Step 5: Commit**
```
git add packages/enforma-mui/src/index.ts
git commit -m "feat(enforma-mui): register Checkbox and Switch in all bundles"
```

---

### Task 6: Add demo section for Checkbox and Switch

**Files:**
- Modify: `apps/demo/src/App.tsx`

**Step 1: Add state for the boolean fields demo**

In `App.tsx`, after the existing `useState` declarations (around line 103–109), add:
```tsx
const [boolValues, setBoolValues] = useState<FormValues>({});
```

**Step 2: Add the Boolean Fields demo section**

In the JSX, after the `<hr>` that follows the `<h2>Reactive Attributes</h2>` section (around line 221), insert a new section:

```tsx
<hr style={{ margin: '2rem 0' }} />

<h2>Boolean Fields</h2>
<p style={{ color: '#555', marginBottom: '1rem' }}>
  <code>Checkbox</code> and <code>Switch</code> both bind to a boolean value.{' '}
  The <code>labelPlacement</code> prop controls where the label appears.
</p>

<Enforma.Form values={boolValues} onChange={setBoolValues} aria-label="boolean fields demo form">
  <Enforma.Checkbox bind="agree" label="I agree to the terms" description="Required to continue" />
  <Enforma.Checkbox
    bind="newsletter"
    label="Subscribe to newsletter"
    labelPlacement="start"
    disabled={({ agree }) => !agree}
  />
  <Enforma.Switch bind="darkMode" label="Dark mode" />
  <Enforma.Switch
    bind="notifications"
    label="Email notifications"
    labelPlacement="start"
    validate={(v) => (!v ? 'Notifications must be enabled' : null)}
  />
</Enforma.Form>

<pre style={{ marginTop: '2rem', background: '#f4f4f4', padding: '1rem' }}>
  {JSON.stringify(boolValues, null, 2)}
</pre>
```

**Step 3: Run lint and typecheck**
```
nvm use 20 && pnpm lint && pnpm typecheck
```
Expected: no errors.

**Step 4: Commit**
```
git add apps/demo/src/App.tsx
git commit -m "feat(demo): add Boolean Fields section with Checkbox and Switch examples"
```

---

### Task 7: Final verification

**Step 1: Run all checks**
```
nvm use 20 && pnpm lint && pnpm typecheck && pnpm test
```
Expected: lint clean, typecheck clean, all tests pass.

**Step 2: If everything passes, mark todo.md items as done**

In `todo.md`, mark Checkbox and Switch as completed:
```
- [x] Checkbox — boolean check
- [x] Switch — styled boolean toggle, same value shape as Checkbox
```

**Step 3: Commit**
```
git add todo.md
git commit -m "chore: mark Checkbox and Switch as done in todo"
```
