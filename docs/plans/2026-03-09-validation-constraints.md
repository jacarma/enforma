# Validation Constraints Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `required`, `minLength`/`maxLength`, and `minItems`/`maxItems` as component props that validate and flow to adapters.

**Architecture:** Each dispatch function resolves constraint props reactively, builds a `constraintMessages` map with interpolated defaults, merges it with the user's `messages` (user wins), and passes a `typeValidator` that returns message keys. List registers its own store validator and exposes `error`/`showError` in `ResolvedListProps`. No changes to `useFieldValidation` or `useFieldProps` signatures.

**Tech Stack:** TypeScript strict, React, Vitest + @testing-library/react, `useSyncExternalStore`, `useReactiveProp`

---

### Task 1: Add constraint props to types

**Files:**
- Modify: `packages/enforma/src/components/types.ts`

**Step 1: Add `required` to `CommonProps` and `ResolvedCommonProps`**

In `CommonProps` (around line 23), add after `messages?`:
```ts
required?: Reactive<boolean>;
```

In `ResolvedCommonProps` (around line 191), add after `onBlur`:
```ts
required: boolean | undefined;
```

**Step 2: Add `minLength`/`maxLength` to `TextInputProps` and resolved type**

In `TextInputProps` (around line 34), add:
```ts
export type TextInputProps = CommonProps & {
  mask?: Reactive<string | RegExp>;
  minLength?: Reactive<number>;
  maxLength?: Reactive<number>;
};
```

In `ResolvedTextInputProps` (around line 203), add:
```ts
export type ResolvedTextInputProps = Omit<ResolvedCommonProps, 'value' | 'setValue'> & {
  value: string | undefined;
  setValue: (value: string) => void;
  mask?: string | RegExp;
  minLength?: number;
  maxLength?: number;
};
```

`ResolvedTextareaProps` is a type alias for `ResolvedTextInputProps` so it inherits these automatically.

**Step 3: Add `error`/`showError` to `ResolvedListProps` and constraint props to `ListProps` (local type in List.tsx)**

In `ResolvedListProps` (around line 279), add:
```ts
export type ResolvedListProps = {
  items: ReactNode[];
  addButton: ReactNode;
  modal: ReactNode;
  isEmpty: boolean;
  disabled: boolean;
  error: string | null;
  showError: boolean;
};
```

The local `ListProps` type in `List.tsx` will be extended in Task 5.

**Step 4: Run typecheck to see what breaks**

```bash
nvm use 20 && pnpm typecheck
```

Expected: errors in `List.tsx` (missing `error`/`showError`), MUI `List.tsx` (missing props), `fields.tsx` (nothing yet). Fix nothing — just note the affected files.

**Step 5: Commit**

```bash
git add packages/enforma/src/components/types.ts
git commit -m "feat(enforma): add constraint prop types to CommonProps, TextInputProps, ResolvedListProps"
```

---

### Task 2: required for text and selection fields

**Files:**
- Modify: `packages/enforma/src/components/fields.tsx`
- Test: `packages/enforma/src/components/constraints.test.tsx` (new file)

Affected dispatches: `TextInputDispatch`, `TextareaDispatch`, `SelectDispatch`, `RadioGroupDispatch`, `AutocompleteDispatch`, `ExclusiveToggleDispatch`.

For all of these, `required` fails when value is `undefined` or `null`. For text fields, also when `''`.

**Step 1: Write the failing tests**

Create `packages/enforma/src/components/constraints.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Form } from './Form';
import { TextInput, Checkbox } from './fields';
import { registerComponents } from './registry';
import type { ResolvedTextInputProps, ResolvedCheckboxProps } from './types';

// Minimal adapter that renders the error and exposes required via aria
function StubTextInput({ value, setValue, label, error, showError, onBlur, required }: ResolvedTextInputProps) {
  return (
    <div>
      <label htmlFor="f">{label}</label>
      <input
        id="f"
        aria-label={label ?? ''}
        aria-required={required}
        value={value ?? ''}
        onChange={(e) => { setValue(e.target.value); }}
        onBlur={onBlur}
      />
      {showError && <span role="alert">{error}</span>}
    </div>
  );
}

function StubCheckbox({ value, setValue, label, error, showError, onBlur, required }: ResolvedCheckboxProps) {
  return (
    <div>
      <input
        type="checkbox"
        aria-label={label ?? ''}
        aria-required={required}
        checked={value ?? false}
        onChange={(e) => { setValue(e.target.checked); }}
        onBlur={onBlur}
      />
      {showError && <span role="alert">{error}</span>}
    </div>
  );
}

beforeEach(() => {
  registerComponents({ TextInput: StubTextInput, Checkbox: StubCheckbox });
});

describe('required on TextInput', () => {
  it('blocks submit and shows default message when value is empty string', async () => {
    const onSubmit = vi.fn();
    render(
      <Form values={{ name: '' }} onChange={vi.fn()} onSubmit={onSubmit}>
        <TextInput bind="name" label="Name" required />
        <button type="submit">Submit</button>
      </Form>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('This field is required');
  });

  it('blocks submit when value is undefined', async () => {
    const onSubmit = vi.fn();
    render(
      <Form values={{}} onChange={vi.fn()} onSubmit={onSubmit}>
        <TextInput bind="name" label="Name" required />
        <button type="submit">Submit</button>
      </Form>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not show error when value is provided', () => {
    render(
      <Form values={{ name: 'Alice' }} onChange={vi.fn()} showErrors>
        <TextInput bind="name" label="Name" required />
      </Form>,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('passes required to the adapter', () => {
    render(
      <Form values={{}} onChange={vi.fn()}>
        <TextInput bind="name" label="Name" required />
      </Form>,
    );
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAttribute('aria-required', 'true');
  });

  it('message is customizable via messages prop', () => {
    render(
      <Form values={{ name: '' }} onChange={vi.fn()} showErrors>
        <TextInput bind="name" label="Name" required messages={{ required: 'Name cannot be empty' }} />
      </Form>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Name cannot be empty');
  });

  it('message is customizable via Form-level messages', () => {
    render(
      <Form values={{ name: '' }} onChange={vi.fn()} showErrors messages={{ required: 'Global required message' }}>
        <TextInput bind="name" label="Name" required />
      </Form>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Global required message');
  });

  it('field-level messages override Form-level messages', () => {
    render(
      <Form values={{ name: '' }} onChange={vi.fn()} showErrors messages={{ required: 'Global' }}>
        <TextInput bind="name" label="Name" required messages={{ required: 'Local' }} />
      </Form>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Local');
  });
});

describe('required on Checkbox', () => {
  it('shows error when value is false', () => {
    render(
      <Form values={{ accepted: false }} onChange={vi.fn()} showErrors>
        <Checkbox bind="accepted" label="Accept" required />
      </Form>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('This field is required');
  });

  it('shows error when value is undefined', () => {
    render(
      <Form values={{}} onChange={vi.fn()} showErrors>
        <Checkbox bind="accepted" label="Accept" required />
      </Form>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('This field is required');
  });

  it('does not show error when value is true', () => {
    render(
      <Form values={{ accepted: true }} onChange={vi.fn()} showErrors>
        <Checkbox bind="accepted" label="Accept" required />
      </Form>,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
```

**Step 2: Run to verify the tests fail**

```bash
nvm use 20 && pnpm test --reporter=verbose packages/enforma/src/components/constraints.test.tsx
```

Expected: many failures — `required` prop doesn't validate yet.

**Step 3: Implement required in dispatch functions**

In `packages/enforma/src/components/fields.tsx`, update the affected dispatches. The pattern is:

1. Call `useReactiveProp(props.required)` to get the current resolved boolean
2. Build a `constraintMessages` object with default messages; merge with `props.messages` (user overrides take priority)
3. Pass a `typeValidator` that returns `'required'` when the constraint fails

**`TextInputDispatch`** — replace the current one-liner dispatch:

```tsx
function TextInputDispatch(props: TextInputProps) {
  const required = useReactiveProp(props.required);
  const constraintMessages: Partial<Record<string, string>> = {
    required: 'This field is required',
  };
  const mergedMessages: Partial<Record<string, string>> = { ...constraintMessages, ...props.messages };
  return dispatchComponent(
    'TextInput',
    useFieldProps<ResolvedTextInputProps>(
      { ...props, messages: mergedMessages },
      {
        typeValidator: (v): string | null => {
          if (required && (v === undefined || v === null || v === '')) return 'required';
          return null;
        },
      },
    ),
  );
}
```

**`TextareaDispatch`** — same pattern (identical logic):

```tsx
function TextareaDispatch(props: TextareaProps) {
  const required = useReactiveProp(props.required);
  const constraintMessages: Partial<Record<string, string>> = {
    required: 'This field is required',
  };
  const mergedMessages: Partial<Record<string, string>> = { ...constraintMessages, ...props.messages };
  return dispatchComponent(
    'Textarea',
    useFieldProps<ResolvedTextareaProps>(
      { ...props, messages: mergedMessages },
      {
        typeValidator: (v): string | null => {
          if (required && (v === undefined || v === null || v === '')) return 'required';
          return null;
        },
      },
    ),
  );
}
```

**`CheckboxDispatch`** — required means must be `true`:

```tsx
function CheckboxDispatch(props: CheckboxProps) {
  const required = useReactiveProp(props.required);
  const constraintMessages: Partial<Record<string, string>> = {
    required: 'This field is required',
  };
  const mergedMessages: Partial<Record<string, string>> = { ...constraintMessages, ...props.messages };
  return dispatchComponent(
    'Checkbox',
    useFieldProps<ResolvedCheckboxProps>(
      { ...props, messages: mergedMessages },
      {
        typeValidator: (v): string | null => {
          if (required && v !== true) return 'required';
          return null;
        },
      },
    ),
  );
}
```

**`SwitchDispatch`** — same as Checkbox:

```tsx
function SwitchDispatch(props: SwitchProps) {
  const required = useReactiveProp(props.required);
  const constraintMessages: Partial<Record<string, string>> = {
    required: 'This field is required',
  };
  const mergedMessages: Partial<Record<string, string>> = { ...constraintMessages, ...props.messages };
  return dispatchComponent(
    'Switch',
    useFieldProps<ResolvedSwitchProps>(
      { ...props, messages: mergedMessages },
      {
        typeValidator: (v): string | null => {
          if (required && v !== true) return 'required';
          return null;
        },
      },
    ),
  );
}
```

**`SelectDispatch`**, **`RadioGroupDispatch`**, **`AutocompleteDispatch`**, **`ExclusiveToggleDispatch`** — for selection components, value is required unless it's `undefined` or `null`. These dispatches are more complex (they build options, manage open-choice state). Add `required` constraint at the top of each, passing to `useFieldProps` via merged messages and typeValidator, similar to the pattern above. The typeValidator for selection fields:

```ts
typeValidator: (v): string | null => {
  if (required && (v === undefined || v === null)) return 'required';
  return null;
},
```

For `SelectDispatch`, `useFieldProps` is called as `useFieldProps<FieldResolved<unknown>>(props)` — add the options argument:

```tsx
const required = useReactiveProp(props.required);
const constraintMessages: Partial<Record<string, string>> = { required: 'This field is required' };
const mergedMessages: Partial<Record<string, string>> = { ...constraintMessages, ...props.messages };
const resolved = useFieldProps<FieldResolved<unknown>>(
  { ...props, messages: mergedMessages },
  {
    typeValidator: (v): string | null => {
      if (required && (v === undefined || v === null)) return 'required';
      return null;
    },
  },
);
```

Apply the same pattern to `RadioGroupDispatch`, `AutocompleteDispatch`, and `ExclusiveToggleDispatch`.

**Step 4: Run the tests**

```bash
nvm use 20 && pnpm test --reporter=verbose packages/enforma/src/components/constraints.test.tsx
```

Expected: all tests in the `required on TextInput` and `required on Checkbox` describe blocks pass.

**Step 5: Run full test suite**

```bash
nvm use 20 && pnpm test
```

Expected: all pass.

**Step 6: Run lint + typecheck**

```bash
nvm use 20 && pnpm lint && pnpm typecheck
```

Expected: no errors.

**Step 7: Commit**

```bash
git add packages/enforma/src/components/fields.tsx packages/enforma/src/components/constraints.test.tsx
git commit -m "feat(enforma): add required prop validation for text, selection, and boolean fields"
```

---

### Task 3: required for NumberInput, DatePicker, TimePicker, DateTimePicker

**Files:**
- Modify: `packages/enforma/src/components/fields.tsx`
- Modify: `packages/enforma/src/components/constraints.test.tsx`

These dispatches already have a `typeValidator`. The constraint check must run **after** the type check — i.e., we chain: type check first (return key if invalid type), then required check.

**Step 1: Add tests for required on NumberInput and DatePicker**

Add to `constraints.test.tsx` (requires `beforeEach` registering `NumberInput` and `DatePicker` adapters — register stub adapters that show `error` when `showError` is true):

```tsx
describe('required on NumberInput', () => {
  beforeEach(() => {
    registerComponents({
      NumberInput: ({ value, error, showError, onBlur }: ResolvedNumberInputProps) => (
        <div>
          <button aria-label="field" onBlur={onBlur} />
          {showError && <span role="alert">{error}</span>}
        </div>
      ),
    });
  });

  it('shows error when value is undefined', () => {
    render(
      <Form values={{}} onChange={vi.fn()} showErrors>
        <NumberInput bind="qty" required />
      </Form>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('This field is required');
  });

  it('does not show error when value is 0', () => {
    render(
      <Form values={{ qty: 0 }} onChange={vi.fn()} showErrors>
        <NumberInput bind="qty" required />
      </Form>,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
```

**Step 2: Run to verify tests fail**

```bash
nvm use 20 && pnpm test --reporter=verbose packages/enforma/src/components/constraints.test.tsx
```

**Step 3: Update NumberInputDispatch**

The existing `typeValidator` checks for `invalidNumber`. Chain the `required` check after it:

```tsx
function NumberInputDispatch(props: NumberInputProps) {
  const required = useReactiveProp(props.required);
  const constraintMessages: Partial<Record<string, string>> = { required: 'This field is required' };
  const mergedMessages: Partial<Record<string, string>> = { ...constraintMessages, ...props.messages };
  return dispatchComponent(
    'NumberInput',
    useFieldProps<ResolvedNumberInputProps>(
      { ...props, messages: mergedMessages },
      {
        typeValidator: (v): string | null => {
          if (v === undefined) return required ? 'required' : null;
          if (typeof v !== 'number' || isNaN(v)) return 'invalidNumber';
          return null;
        },
      },
    ),
  );
}
```

Note the logic: `undefined` is handled first — if required, fail with `'required'`; otherwise, it's fine (no value yet). Then check type validity.

Update `DatePickerDispatch`, `TimePickerDispatch`, and `DateTimePickerDispatch` with the same pattern. For date/time, `undefined` means no date entered; `required` fails; a non-Date/non-string value means invalid type.

**`DatePickerDispatch`:**
```tsx
function DatePickerDispatch(props: DatePickerProps) {
  const required = useReactiveProp(props.required);
  const constraintMessages: Partial<Record<string, string>> = { required: 'This field is required' };
  const mergedMessages: Partial<Record<string, string>> = { ...constraintMessages, ...props.messages };
  return dispatchComponent(
    'DatePicker',
    useFieldProps<ResolvedDatePickerProps>(
      { ...props, messages: mergedMessages },
      {
        typeValidator: (v): string | null => {
          if (v === undefined) return required ? 'required' : null;
          if (v instanceof Date) return null;
          return 'invalidDate';
        },
      },
    ),
  );
}
```

**`TimePickerDispatch`:**
```tsx
function TimePickerDispatch(props: TimePickerProps) {
  const required = useReactiveProp(props.required);
  const constraintMessages: Partial<Record<string, string>> = { required: 'This field is required' };
  const mergedMessages: Partial<Record<string, string>> = { ...constraintMessages, ...props.messages };
  return dispatchComponent(
    'TimePicker',
    useFieldProps<ResolvedTimePickerProps>(
      { ...props, messages: mergedMessages },
      {
        typeValidator: (v): string | null => {
          if (v === undefined) return required ? 'required' : null;
          if (typeof v === 'string' && /^\d{2}:\d{2}$/.test(v)) return null;
          return 'invalidTime';
        },
      },
    ),
  );
}
```

**`DateTimePickerDispatch`:** same as DatePicker, returning `'invalidDateTime'` for non-Date.

**Step 4: Run tests, lint, typecheck**

```bash
nvm use 20 && pnpm test && pnpm lint && pnpm typecheck
```

Expected: all pass.

**Step 5: Commit**

```bash
git add packages/enforma/src/components/fields.tsx packages/enforma/src/components/constraints.test.tsx
git commit -m "feat(enforma): add required prop to NumberInput, DatePicker, TimePicker, DateTimePicker"
```

---

### Task 4: minLength and maxLength for TextInput and Textarea

**Files:**
- Modify: `packages/enforma/src/components/fields.tsx`
- Modify: `packages/enforma/src/components/constraints.test.tsx`

**Step 1: Add tests**

Add to `constraints.test.tsx`:

```tsx
describe('minLength / maxLength on TextInput', () => {
  it('shows tooShort when value is shorter than minLength', () => {
    render(
      <Form values={{ code: 'ab' }} onChange={vi.fn()} showErrors>
        <TextInput bind="code" label="Code" minLength={3} />
      </Form>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Must be at least 3 characters');
  });

  it('does not show tooShort when value meets minLength', () => {
    render(
      <Form values={{ code: 'abc' }} onChange={vi.fn()} showErrors>
        <TextInput bind="code" label="Code" minLength={3} />
      </Form>,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not show tooShort when value is undefined', () => {
    render(
      <Form values={{}} onChange={vi.fn()} showErrors>
        <TextInput bind="code" label="Code" minLength={3} />
      </Form>,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows tooLong when value exceeds maxLength', () => {
    render(
      <Form values={{ name: 'HelloWorld' }} onChange={vi.fn()} showErrors>
        <TextInput bind="name" label="Name" maxLength={5} />
      </Form>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Must be 5 characters or fewer');
  });

  it('does not show tooLong when value is within maxLength', () => {
    render(
      <Form values={{ name: 'Hello' }} onChange={vi.fn()} showErrors>
        <TextInput bind="name" label="Name" maxLength={5} />
      </Form>,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('minLength message is customizable', () => {
    render(
      <Form values={{ code: 'a' }} onChange={vi.fn()} showErrors>
        <TextInput bind="code" label="Code" minLength={3} messages={{ tooShort: 'Too short!' }} />
      </Form>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Too short!');
  });

  it('maxLength message is customizable', () => {
    render(
      <Form values={{ name: 'TooLongName' }} onChange={vi.fn()} showErrors>
        <TextInput bind="name" label="Name" maxLength={5} messages={{ tooLong: 'Too long!' }} />
      </Form>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Too long!');
  });

  it('passes minLength and maxLength to the adapter', () => {
    const received: { minLength?: number; maxLength?: number }[] = [];
    registerComponents({
      TextInput: (props: ResolvedTextInputProps) => {
        received.push({ minLength: props.minLength, maxLength: props.maxLength });
        return <input aria-label={props.label ?? ''} />;
      },
    });
    render(
      <Form values={{}} onChange={vi.fn()}>
        <TextInput bind="code" label="Code" minLength={3} maxLength={10} />
      </Form>,
    );
    expect(received[0]).toEqual({ minLength: 3, maxLength: 10 });
  });

  it('required and minLength together: required fires first on empty string', () => {
    render(
      <Form values={{ code: '' }} onChange={vi.fn()} showErrors>
        <TextInput bind="code" label="Code" required minLength={3} />
      </Form>,
    );
    // empty string fails required before minLength is checked
    expect(screen.getByRole('alert')).toHaveTextContent('This field is required');
  });
});
```

**Step 2: Run to verify tests fail**

```bash
nvm use 20 && pnpm test --reporter=verbose packages/enforma/src/components/constraints.test.tsx
```

**Step 3: Update TextInputDispatch and TextareaDispatch**

```tsx
function TextInputDispatch(props: TextInputProps) {
  const required = useReactiveProp(props.required);
  const minLength = useReactiveProp(props.minLength);
  const maxLength = useReactiveProp(props.maxLength);

  const constraintMessages: Partial<Record<string, string>> = {
    required: 'This field is required',
    ...(minLength !== undefined ? { tooShort: `Must be at least ${minLength} characters` } : {}),
    ...(maxLength !== undefined ? { tooLong: `Must be ${maxLength} characters or fewer` } : {}),
  };
  const mergedMessages: Partial<Record<string, string>> = { ...constraintMessages, ...props.messages };

  return dispatchComponent(
    'TextInput',
    useFieldProps<ResolvedTextInputProps>(
      { ...props, messages: mergedMessages },
      {
        typeValidator: (v): string | null => {
          if (required && (v === undefined || v === null || v === '')) return 'required';
          if (typeof v === 'string') {
            if (minLength !== undefined && v.length < minLength) return 'tooShort';
            if (maxLength !== undefined && v.length > maxLength) return 'tooLong';
          }
          return null;
        },
      },
    ),
  );
}
```

Apply the same change to `TextareaDispatch` (identical, dispatches to `'Textarea'`).

**Step 4: Run tests, lint, typecheck**

```bash
nvm use 20 && pnpm test && pnpm lint && pnpm typecheck
```

Expected: all pass.

**Step 5: Commit**

```bash
git add packages/enforma/src/components/fields.tsx packages/enforma/src/components/constraints.test.tsx
git commit -m "feat(enforma): add minLength and maxLength props to TextInput and Textarea"
```

---

### Task 5: List constraints (required, minItems, maxItems)

**Files:**
- Modify: `packages/enforma/src/components/List.tsx`
- Modify: `packages/enforma/src/components/constraints.test.tsx`
- Modify: `packages/enforma-mui/src/components/List.tsx` (add error display)

**Step 1: Add tests**

In `constraints.test.tsx`, add the List tests. This requires stub adapter setup from `List.test.tsx`. Import and register stub List adapters:

```tsx
import { List } from './List';
import { ListItemSlot } from './ListItemSlot';
import { ListFormSlot } from './ListFormSlot';
import type { ResolvedListProps, ResolvedListItemProps, ResolvedAddButtonProps, ResolvedFormModalProps } from './types';

function StubList({ items, addButton, error, showError }: ResolvedListProps) {
  return (
    <div>
      <div data-testid="list-rows">{items}</div>
      {addButton}
      {showError && <span role="alert">{error}</span>}
    </div>
  );
}

function StubListItem({ title }: ResolvedListItemProps) {
  return <div>{title}</div>;
}

function StubAddButton({ onClick, disabled }: ResolvedAddButtonProps) {
  return <button type="button" onClick={onClick} disabled={disabled}>Add</button>;
}

function StubFormModal({ open, children, onConfirm, onCancel }: ResolvedFormModalProps) {
  if (!open) return null;
  return (
    <div>
      {children}
      <button onClick={onConfirm}>Confirm</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  );
}

describe('List constraints', () => {
  beforeEach(() => {
    registerComponents({
      List: StubList,
      ListItem: StubListItem,
      AddButton: StubAddButton,
      FormModal: StubFormModal,
    });
  });

  it('required blocks submit when list is empty', async () => {
    const onSubmit = vi.fn();
    render(
      <Form values={{ items: [] }} onChange={vi.fn()} onSubmit={onSubmit}>
        <List bind="items" defaultItem={{ name: '' }} required>
          <ListItemSlot title="name" />
          <ListFormSlot>
            <TextInput bind="name" label="Name" />
          </ListFormSlot>
        </List>
        <button type="submit">Submit</button>
      </Form>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('This field is required');
  });

  it('required does not show error when list has items', async () => {
    const onSubmit = vi.fn();
    render(
      <Form values={{ items: [{ name: 'Alice' }] }} onChange={vi.fn()} onSubmit={onSubmit}>
        <List bind="items" defaultItem={{ name: '' }} required>
          <ListItemSlot title="name" />
          <ListFormSlot>
            <TextInput bind="name" label="Name" />
          </ListFormSlot>
        </List>
        <button type="submit">Submit</button>
      </Form>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onSubmit).toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('minItems shows error when below minimum', async () => {
    render(
      <Form values={{ items: [] }} onChange={vi.fn()} showErrors>
        <List bind="items" defaultItem={{ name: '' }} minItems={2}>
          <ListItemSlot title="name" />
          <ListFormSlot><TextInput bind="name" label="Name" /></ListFormSlot>
        </List>
      </Form>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Must have at least 2 item(s)');
  });

  it('maxItems shows error when above maximum', async () => {
    render(
      <Form
        values={{ items: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] }}
        onChange={vi.fn()}
        showErrors
      >
        <List bind="items" defaultItem={{ name: '' }} maxItems={2}>
          <ListItemSlot title="name" />
          <ListFormSlot><TextInput bind="name" label="Name" /></ListFormSlot>
        </List>
      </Form>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Must have 2 item(s) or fewer');
  });

  it('minItems message is customizable via Form messages', () => {
    render(
      <Form
        values={{ items: [] }}
        onChange={vi.fn()}
        showErrors
        messages={{ tooFewItems: 'Add more!' }}
      >
        <List bind="items" defaultItem={{ name: '' }} minItems={1}>
          <ListItemSlot title="name" />
          <ListFormSlot><TextInput bind="name" label="Name" /></ListFormSlot>
        </List>
      </Form>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Add more!');
  });
});
```

**Step 2: Run to verify tests fail**

```bash
nvm use 20 && pnpm test --reporter=verbose packages/enforma/src/components/constraints.test.tsx
```

**Step 3: Update `packages/enforma/src/components/List.tsx`**

Add imports at top:
```ts
import { useEffect, useSyncExternalStore, useRef } from 'react';
import { useScope, joinPath } from '../context/ScopeContext';
import { useFormSettings } from '../context/FormSettingsContext';
```

Update local `ListProps` type:
```ts
type ListProps = {
  bind: string;
  defaultItem: Record<string, unknown>;
  disabled?: boolean;
  children: ReactNode;
  required?: boolean;
  minItems?: number;
  maxItems?: number;
};
```

Update `ListMain` function signature to accept new props, and add validation logic:

```tsx
function ListMain({ bind, defaultItem, disabled = false, children, required, minItems, maxItems }: ListProps) {
  const { arr, keys, append, remove, update } = useListState(bind, defaultItem);
  const { store, prefix } = useScope();
  const fullPath = joinPath(prefix, bind);
  const { showErrors: formShowErrors, messages: formMessages } = useFormSettings();

  // Always-current refs for use inside the registered validator closure
  const formMessagesRef = useRef(formMessages);
  formMessagesRef.current = formMessages;

  const constraintRef = useRef({ required, minItems, maxItems });
  constraintRef.current = { required, minItems, maxItems };

  // Build constraint messages with interpolated defaults
  const constraintMessages: Partial<Record<string, string>> = {
    required: 'This field is required',
    ...(minItems !== undefined ? { tooFewItems: `Must have at least ${minItems} item(s)` } : {}),
    ...(maxItems !== undefined ? { tooManyItems: `Must have ${maxItems} item(s) or fewer` } : {}),
  };
  const constraintMessagesRef = useRef(constraintMessages);
  constraintMessagesRef.current = constraintMessages;

  useEffect(() => {
    if (!required && minItems === undefined && maxItems === undefined) return;

    const validator = (): string | null => {
      const val = store.getField(fullPath);
      const count = Array.isArray(val) ? val.length : 0;
      const { required: req, minItems: min, maxItems: max } = constraintRef.current;

      let key: string | null = null;
      if (req && count === 0) key = 'required';
      else if (min !== undefined && count < min) key = 'tooFewItems';
      else if (max !== undefined && count > max) key = 'tooManyItems';

      if (key === null) return null;
      return (
        constraintMessagesRef.current[key] ?? formMessagesRef.current[key] ?? key
      );
    };

    return store.registerValidator(fullPath, validator);
  }, [store, fullPath, required, minItems, maxItems]);

  const error = useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => store.getError(fullPath),
  );

  const isSubmitted = useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => store.isSubmitted(),
  );

  const showError = (isSubmitted || formShowErrors) && error !== null;

  // ... (rest of existing ListMain unchanged, except the final ListImpl call)

  return (
    <ListImpl
      items={items}
      addButton={addButton}
      modal={modalNode}
      isEmpty={arr.length === 0}
      disabled={disabled}
      error={error}
      showError={showError}
    />
  );
}
```

Note: List errors show after submit or `showErrors=true` — there's no blur event for lists.

**Step 4: Update the MUI `List` adapter to display error**

In `packages/enforma-mui/src/components/List.tsx`:

```tsx
import { Card, CardActions, CardContent, List as MuiList, FormHelperText } from '@mui/material';
import { type ResolvedListProps } from 'enforma';

export function List({ items, addButton, modal, error, showError }: ResolvedListProps) {
  return (
    <>
      <Card variant="outlined">
        <CardContent>
          <MuiList>{items}</MuiList>
        </CardContent>
        <CardActions>{addButton}</CardActions>
      </Card>
      {showError && <FormHelperText error>{error}</FormHelperText>}
      {modal}
    </>
  );
}
```

**Step 5: Run tests, lint, typecheck**

```bash
nvm use 20 && pnpm test && pnpm lint && pnpm typecheck
```

Expected: all pass.

**Step 6: Commit**

```bash
git add packages/enforma/src/components/List.tsx packages/enforma/src/components/constraints.test.tsx packages/enforma-mui/src/components/List.tsx
git commit -m "feat(enforma): add required, minItems, maxItems to List component"
```

---

### Task 6: MUI adapter visual enhancements

**Files:**
- Modify: `packages/enforma-mui/src/components/TextInput.tsx`
- Modify: `packages/enforma-mui/src/components/Checkbox.tsx` (and Switch)

MUI's `TextField` has a `required` prop that shows an asterisk on the label. MUI's `FormControlLabel` also supports `required`. Pass the resolved `required` through.

**Step 1: Update MUI TextInput**

In `UnmaskedTextInput`, add `required` to the destructured props and pass to MUI `TextField`:

```tsx
export function UnmaskedTextInput({
  // ... existing props ...
  required,
  minLength,
  maxLength,
  inputComponent,
}: ResolvedTextInputProps & { inputComponent?: React.ComponentType<object> }) {
  // ...
  const commonProps = {
    // ... existing ...
    required: required ?? false,
    inputProps: {
      minLength,
      maxLength,
    },
  };
  // ...
}
```

Note: MUI's `inputProps` passes HTML attributes to the `<input>` element, so `minLength`/`maxLength` become native HTML attributes (for browser-level validation visual hints).

**Step 2: Update MUI Checkbox and Switch**

Look at the existing Checkbox.tsx and add `required` to its props, passing it to `FormControlLabel` or `Checkbox` MUI component.

**Step 3: Run tests, lint, typecheck**

```bash
nvm use 20 && pnpm test && pnpm lint && pnpm typecheck
```

**Step 4: Commit**

```bash
git add packages/enforma-mui/src/components/TextInput.tsx packages/enforma-mui/src/components/Checkbox.tsx packages/enforma-mui/src/components/Switch.tsx
git commit -m "feat(enforma-mui): pass required/minLength/maxLength to MUI components"
```

---

### Task 7: Demo examples and index.ts exports

**Files:**
- Modify: `apps/demo/src/App.tsx`
- Review: `packages/enforma/src/index.ts` (no changes expected — constraint props are already part of existing exported types)

**Step 1: Add a validation demo section to App.tsx**

Add a demo form showing:
- A required `TextInput` (with minLength/maxLength)
- A required `Checkbox` (accept terms)
- A `List` with `minItems`/`maxItems`

```tsx
<Form
  values={constraintValues}
  onChange={setConstraintValues}
  onSubmit={(v) => { console.log('Submitted:', v); }}
>
  <TextInput bind="username" label="Username" required minLength={3} maxLength={20} />
  <Checkbox bind="acceptTerms" label="I accept the terms and conditions" required />
  <List bind="tags" defaultItem={{ name: '' }} minItems={1} maxItems={3}>
    <List.Item title="name" />
    <List.Form>
      <TextInput bind="name" label="Tag name" required />
    </List.Form>
  </List>
  <button type="submit">Submit</button>
</Form>
```

**Step 2: Run lint, typecheck, full test suite**

```bash
nvm use 20 && pnpm lint && pnpm typecheck && pnpm test
```

Expected: all pass.

**Step 3: Final commit**

```bash
git add apps/demo/src/App.tsx
git commit -m "feat(demo): add validation constraints examples"
```

---

### Task 8: Update todo.md

Mark the completed items in `todo.md`:

```md
- [x] **required** — fails if value is `null`, `undefined`, or empty string; works for all field types
- [x] **minLength / maxLength** — string length bounds; intended for TextInput and Textarea
- [x] **minItems / maxItems** — array length bounds; intended for List and multi-select fields
```

```bash
git add todo.md
git commit -m "docs: mark validation helpers complete in todo.md"
```
