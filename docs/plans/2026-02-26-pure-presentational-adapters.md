# Pure Presentational Adapters Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move all hook calls and orchestration into core dispatch, so adapter components receive fully-resolved props and are free of enforma imports.

**Architecture:** Core dispatch wrappers call `useFieldProps`/`useDataSource` before dispatching to the registry. Complex components (List) own their orchestration in core and dispatch pre-built named slot nodes (`items`, `addButton`, `modal`) to a registered `ListWrap`. The registry is extended with `ListWrap`, `ListItem`, `AddButton`, `FormModal` for UI-agnostic slot implementations.

**Tech Stack:** TypeScript strict, React, Vitest + @testing-library/react, pnpm workspaces, `nvm use 20` before any pnpm/node command.

---

### Task 1: Add Resolved types to enforma

**Files:**
- Modify: `packages/enforma/src/components/types.ts`

No behavior change. Purely additive — existing types remain unchanged.

**Step 1: Add the resolved types**

Append to `packages/enforma/src/components/types.ts`:

```typescript
// Resolved types — what registered adapter components receive.
// Core dispatch calls hooks and passes these; adapters have no enforma imports.

export type ResolvedCommonProps = {
  value: unknown;
  setValue: (value: unknown) => void;
  label?: string;
  disabled?: boolean;
  placeholder?: string;
  description?: string;
  error: string | null;
  showError: boolean;
  onBlur: () => void;
};

export type ResolvedTextInputProps = ResolvedCommonProps & {
  value: string | undefined;
  setValue: (value: string) => void;
};

export type ResolvedTextareaProps = ResolvedTextInputProps;

export type ResolvedCheckboxProps = ResolvedCommonProps & {
  value: boolean | undefined;
  setValue: (value: boolean) => void;
};

export type ResolvedSelectProps = ResolvedCommonProps & {
  value: unknown;
  setValue: (value: unknown) => void;
  options: { value: unknown; label: string }[];
  isLoading: boolean;
  dataSourceError: Error | null;
  children?: ReactNode;
};

export type ResolvedFieldsetProps = {
  children: ReactNode;
  title?: string;
};

export type ResolvedListProps = {
  items: ReactNode[];
  addButton: ReactNode;
  modal: ReactNode;
  isEmpty: boolean;
  disabled: boolean;
};

export type ResolvedListItemProps = {
  item: FormValues;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  disabled: boolean;
  title: string;
  subtitle?: string;
  avatar?: string;
  showDeleteButton: boolean;
};

export type ResolvedFormModalProps = {
  open: boolean;
  mode: 'CREATE' | 'UPDATE' | 'DISPLAY';
  title: string;
  children: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  onDelete?: () => void;
};

export type ResolvedAddButtonProps = {
  onClick: () => void;
  disabled: boolean;
};
```

**Step 2: Run typecheck**

```bash
nvm use 20 && pnpm --filter enforma typecheck
```
Expected: PASS (additive change)

**Step 3: Commit**

```bash
git add packages/enforma/src/components/types.ts
git commit -m "feat: add Resolved* prop types for adapter contract"
```

---

### Task 2: Update registry to use Resolved types + new entries

**Files:**
- Modify: `packages/enforma/src/components/registry.ts`
- Modify: `packages/enforma/src/components/types.ts` (update `ComponentPropsMap`)
- Modify: `packages/enforma/src/index.ts` (export new types)

**Step 1: Update `ComponentPropsMap` in types.ts**

Replace the existing `ComponentPropsMap`:

```typescript
export type ComponentPropsMap = {
  TextInput: ResolvedTextInputProps;
  Textarea: ResolvedTextareaProps;
  Select: ResolvedSelectProps;
  Checkbox: ResolvedCheckboxProps;
  Fieldset: ResolvedFieldsetProps;
  FormWrap: FormWrapProps;
  ListWrap: ResolvedListProps;
  ListItem: ResolvedListItemProps;
  FormModal: ResolvedFormModalProps;
  AddButton: ResolvedAddButtonProps;
};
```

**Step 2: Run typecheck — expect failures**

```bash
nvm use 20 && pnpm typecheck
```
Expected: FAIL — `enforma-mui` components now pass wrong prop types to registry.
This is expected. Fix in Tasks 3–7.

**Step 3: Export new types from enforma index**

Add to `packages/enforma/src/index.ts`:

```typescript
export type {
  ResolvedCommonProps,
  ResolvedTextInputProps,
  ResolvedTextareaProps,
  ResolvedCheckboxProps,
  ResolvedSelectProps,
  ResolvedFieldsetProps,
  ResolvedListProps,
  ResolvedListItemProps,
  ResolvedFormModalProps,
  ResolvedAddButtonProps,
} from './components/types';
```

**Step 4: Commit (with typecheck failures noted — will be fixed in Task 3+)**

```bash
git add packages/enforma/src/components/types.ts packages/enforma/src/index.ts
git commit -m "feat: update ComponentPropsMap to Resolved types, add slot entries"
```

---

### Task 3: Update core dispatch for simple fields

Update `fields.tsx` so TextInput, Textarea, Checkbox call `useFieldProps` before dispatching.

**Files:**
- Modify: `packages/enforma/src/components/fields.tsx`

**Step 1: Rewrite the simple field dispatchers in fields.tsx**

Replace the entire file content:

```typescript
import { memo } from 'react';
import { getComponent } from './registry';
import { SelectOption } from './SelectOption';
import {
  CheckboxProps,
  ComponentPropsMap,
  FieldsetProps,
  SelectProps,
  TextareaProps,
  TextInputProps,
} from './types';
import { useFieldProps } from '../hooks/useField';
import { Scope } from './Scope';

function isEmptyRef(v: unknown): boolean {
  if (Array.isArray(v)) return v.length === 0;
  if (v !== null && typeof v === 'object') return Object.keys(v).length === 0;
  return false;
}

function stablePropsEqual<P extends object>(prev: P, next: P): boolean {
  const prevKeys = Object.keys(prev);
  const nextKeys = Object.keys(next);
  if (prevKeys.length !== nextKeys.length) return false;
  for (const key of nextKeys) {
    const p = prev[key as keyof P];
    const n = next[key as keyof P];
    if (typeof p === 'function' && typeof n === 'function') continue;
    if (isEmptyRef(p) && isEmptyRef(n) && Array.isArray(p) === Array.isArray(n)) continue;
    if (!Object.is(p, n)) return false;
  }
  return true;
}

function dispatchComponent<K extends keyof ComponentPropsMap>(
  componentType: K,
  props: ComponentPropsMap[K],
) {
  const Impl = getComponent(componentType);
  if (!Impl) {
    throw new Error(`Enforma: component "${componentType}" is not registered.`);
  }
  return <Impl {...props} />;
}

function TextInputDispatch(props: TextInputProps) {
  const resolved = useFieldProps<string>(props);
  return dispatchComponent('TextInput', resolved);
}

function TextareaDispatch(props: TextareaProps) {
  const resolved = useFieldProps<string>(props);
  return dispatchComponent('Textarea', resolved);
}

function CheckboxDispatch(props: CheckboxProps) {
  const resolved = useFieldProps<boolean>(props);
  return dispatchComponent('Checkbox', resolved);
}

function FieldsetDispatch({ bind, children, title }: FieldsetProps) {
  const content = bind !== undefined ? <Scope bind={bind}>{children}</Scope> : children;
  return dispatchComponent('Fieldset', { children: content, title });
}

export const TextInput = memo(TextInputDispatch, stablePropsEqual);
export const Textarea = memo(TextareaDispatch, stablePropsEqual);
export const Checkbox = memo(CheckboxDispatch, stablePropsEqual);
export const Fieldset = memo(FieldsetDispatch, stablePropsEqual);

// Select and List are in separate files — stubs to be replaced in Tasks 4–5
export const Select = Object.assign(
  memo((props: SelectProps) => dispatchComponent('Select', props as never), stablePropsEqual),
  { Option: SelectOption },
);

export { SelectOption };
```

Note: Select is a temporary stub here — it will be properly updated in Task 4. The `as never` keeps TypeScript quiet until that task.

**Step 2: Run typecheck on enforma**

```bash
nvm use 20 && pnpm --filter enforma typecheck
```
Expected: PASS

**Step 3: Run enforma tests**

```bash
nvm use 20 && pnpm --filter enforma test
```
Expected: PASS (core behavior unchanged)

**Step 4: Commit**

```bash
git add packages/enforma/src/components/fields.tsx
git commit -m "feat: core dispatch calls useFieldProps before passing to registry"
```

---

### Task 4: Update enforma-mui TextInput and Fieldset

**Files:**
- Modify: `packages/enforma-mui/src/components/TextInput.tsx`
- Modify: `packages/enforma-mui/src/components/Fieldset.tsx`

**Step 1: Update MUI TextInput to receive resolved props**

Replace `packages/enforma-mui/src/components/TextInput.tsx`:

```typescript
import { useId, useContext } from 'react';
import { FormLabel, TextField } from '@mui/material';
import { type ResolvedTextInputProps } from 'enforma';
import { ComponentWrap } from './ComponentWrap';
import { MuiVariantContext } from '../context/MuiVariantContext';

export function TextInput({
  value,
  setValue,
  label,
  disabled = false,
  placeholder,
  description,
  error,
  showError,
  onBlur,
}: ResolvedTextInputProps) {
  const variant = useContext(MuiVariantContext);
  const id = useId();

  const commonProps = {
    value: value ?? '',
    disabled,
    onBlur,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
    },
    fullWidth: true,
    placeholder: placeholder ?? '',
    type: 'text',
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
          slotProps={{ htmlInput: { id } }}
          variant="outlined"
          size="small"
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
```

**Step 2: Update MUI Fieldset to receive resolved props**

Replace `packages/enforma-mui/src/components/Fieldset.tsx`:

```typescript
import { FormGroup, FormLabel } from '@mui/material';
import { type ResolvedFieldsetProps } from 'enforma';
import { ComponentWrap } from './ComponentWrap';

export function Fieldset({ children, title }: ResolvedFieldsetProps) {
  return (
    <ComponentWrap component="fieldset" margin={title ? 'dense' : 'none'}>
      <FormLabel component="legend">{title}</FormLabel>
      <FormGroup>{children}</FormGroup>
    </ComponentWrap>
  );
}
```

**Step 3: Run tests**

```bash
nvm use 20 && pnpm --filter enforma-mui test
```
Expected: PASS (public API unchanged, same behavior)

**Step 4: Run typecheck**

```bash
nvm use 20 && pnpm --filter enforma-mui typecheck
```
Expected: PASS

**Step 5: Commit**

```bash
git add packages/enforma-mui/src/components/TextInput.tsx packages/enforma-mui/src/components/Fieldset.tsx
git commit -m "feat: mui TextInput and Fieldset receive resolved props, remove hook imports"
```

---

### Task 5: Implement Select (core dispatch + MUI adapter)

Select resolves datasource items and `SelectOption` children into a flat options list before dispatching.

**Files:**
- Modify: `packages/enforma/src/components/fields.tsx`
- Create: `packages/enforma-mui/src/components/Select.tsx`
- Create: `packages/enforma-mui/src/components/Select.test.tsx`

**Step 1: Write the failing test**

Create `packages/enforma-mui/src/components/Select.test.tsx`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Form, registerComponents, clearRegistry, SelectOption } from 'enforma';
import Enforma from 'enforma';
import { Select } from './Select';
import { TextInput } from './TextInput';

beforeEach(() => {
  clearRegistry();
  registerComponents({ Select, TextInput });
});

describe('MUI Select', () => {
  it('renders a select accessible by label', () => {
    render(
      <Form values={{ country: '' }} onChange={() => undefined}>
        <Enforma.Select bind="country" label="Country">
          <SelectOption value="au" label="Australia" />
          <SelectOption value="nz" label="New Zealand" />
        </Enforma.Select>
      </Form>,
    );
    expect(screen.getByLabelText('Country')).toBeInTheDocument();
  });

  it('renders inline options', () => {
    render(
      <Form values={{ country: '' }} onChange={() => undefined}>
        <Enforma.Select bind="country" label="Country">
          <SelectOption value="au" label="Australia" />
          <SelectOption value="nz" label="New Zealand" />
        </Enforma.Select>
      </Form>,
    );
    // MUI Select options appear in DOM (may be hidden until opened)
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders with static array datasource', () => {
    const options = [
      { value: 'au', label: 'Australia' },
      { value: 'nz', label: 'New Zealand' },
    ];
    render(
      <Form values={{ country: '' }} onChange={() => undefined}>
        <Enforma.Select bind="country" label="Country" dataSource={options} />
      </Form>,
    );
    expect(screen.getByLabelText('Country')).toBeInTheDocument();
  });

  it('shows loading state when datasource is loading', () => {
    const queryDataSource = {
      query: () => new Promise(() => undefined), // never resolves
    };
    render(
      <Form values={{ country: '' }} onChange={() => undefined}>
        <Enforma.Select bind="country" label="Country" dataSource={queryDataSource} />
      </Form>,
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
nvm use 20 && pnpm --filter enforma-mui test Select
```
Expected: FAIL — `Select` not found / not registered

**Step 3: Add Select helper to core and update fields.tsx**

Add `buildSelectOptions` to `packages/enforma/src/components/fields.tsx` and update the Select dispatcher. Add these imports at the top of fields.tsx:

```typescript
import React from 'react';
import { useDataSource } from '../hooks/useDataSource';
import type { SelectOptionProps } from './SelectOption';
```

Replace the Select stub with:

```typescript
function buildSelectOptions(
  items: unknown[],
  children: React.ReactNode,
): { value: unknown; label: string }[] {
  const fromChildren: { value: unknown; label: string }[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    const props = child.props as SelectOptionProps;
    fromChildren.push({ value: props.value, label: props.label as string });
  });

  if (fromChildren.length > 0) return fromChildren;

  return items.map((item) => {
    if (typeof item === 'object' && item !== null && 'value' in item && 'label' in item) {
      return { value: (item as { value: unknown }).value, label: String((item as { label: unknown }).label) };
    }
    return { value: item, label: String(item) };
  });
}

function SelectDispatch(props: SelectProps) {
  const resolved = useFieldProps<unknown>(props);
  const { items, isLoading, error: dataSourceError } = useDataSource(props.dataSource, {
    bind: props.bind,
  });
  const options = buildSelectOptions(items, props.children);
  return dispatchComponent('Select', {
    ...resolved,
    options,
    isLoading,
    dataSourceError: dataSourceError ?? null,
    children: props.children,
  });
}

export const Select = Object.assign(
  memo(SelectDispatch, stablePropsEqual),
  { Option: SelectOption },
);
```

**Step 4: Create MUI Select component**

Create `packages/enforma-mui/src/components/Select.tsx`:

```typescript
import { useContext } from 'react';
import {
  CircularProgress,
  FormLabel,
  MenuItem,
  Select as MuiSelect,
  InputLabel,
  FormHelperText,
  FormControl as MuiFormControl,
} from '@mui/material';
import { type ResolvedSelectProps } from 'enforma';
import { MuiVariantContext } from '../context/MuiVariantContext';

export function Select({
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
}: ResolvedSelectProps) {
  const variant = useContext(MuiVariantContext);
  const labelId = `select-label-${Math.random().toString(36).slice(2)}`;

  if (isLoading) {
    return <CircularProgress size={20} />;
  }

  return (
    <MuiFormControl fullWidth margin="dense" error={showError} disabled={disabled}>
      {label !== undefined && <InputLabel id={labelId}>{label}</InputLabel>}
      <MuiSelect
        labelId={labelId}
        label={label}
        value={value ?? ''}
        onChange={(e) => {
          setValue(e.target.value);
        }}
        onBlur={onBlur}
        variant={variant === 'classic' ? 'outlined' : variant}
        size={variant === 'classic' ? 'small' : 'medium'}
      >
        {options.map((opt) => (
          <MenuItem key={String(opt.value)} value={opt.value as string}>
            {opt.label}
          </MenuItem>
        ))}
      </MuiSelect>
      {showError && <FormHelperText>{dataSourceError?.message ?? error}</FormHelperText>}
    </MuiFormControl>
  );
}
```

**Step 5: Run tests**

```bash
nvm use 20 && pnpm --filter enforma-mui test Select
```
Expected: PASS

**Step 6: Run all tests**

```bash
nvm use 20 && pnpm test
```
Expected: PASS

**Step 7: Commit**

```bash
git add packages/enforma/src/components/fields.tsx \
        packages/enforma-mui/src/components/Select.tsx \
        packages/enforma-mui/src/components/Select.test.tsx
git commit -m "feat: Select resolves options in core dispatch, MUI adapter receives resolved props"
```

---

### Task 6: Create MUI List slot components

Split the 150-line MUI List into four focused components. The tests for these come from the existing `List.test.tsx` which will be updated to use the registry pattern.

**Files:**
- Create: `packages/enforma-mui/src/components/ListWrap.tsx`
- Create: `packages/enforma-mui/src/components/ListItem.tsx`
- Create: `packages/enforma-mui/src/components/AddButton.tsx`
- Create: `packages/enforma-mui/src/components/FormModal.tsx`

**Step 1: Create ListItem**

Create `packages/enforma-mui/src/components/ListItem.tsx`:

```typescript
import {
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
} from '@mui/material';
import { type ResolvedListItemProps } from 'enforma';

export function ListItem({
  item,
  title,
  subtitle,
  avatar,
  onEdit,
  onDelete,
  disabled,
  showDeleteButton,
}: ResolvedListItemProps) {
  return (
    <ListItemButton onClick={onEdit}>
      {avatar !== undefined && (
        <ListItemAvatar>
          <Avatar src={avatar} />
        </ListItemAvatar>
      )}
      <ListItemText primary={title} secondary={subtitle} />
      {showDeleteButton && !disabled && (
        <IconButton
          edge="end"
          aria-label="delete"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          ✕
        </IconButton>
      )}
    </ListItemButton>
  );
}
```

**Step 2: Create AddButton**

Create `packages/enforma-mui/src/components/AddButton.tsx`:

```typescript
import { Button } from '@mui/material';
import { type ResolvedAddButtonProps } from 'enforma';

export function AddButton({ onClick, disabled }: ResolvedAddButtonProps) {
  if (disabled) return null;
  return (
    <Button onClick={onClick}>
      Add
    </Button>
  );
}
```

**Step 3: Create FormModal**

Create `packages/enforma-mui/src/components/FormModal.tsx`:

```typescript
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import { type ResolvedFormModalProps } from 'enforma';

export function FormModal({
  open,
  mode,
  title,
  children,
  onConfirm,
  onCancel,
  onDelete,
}: ResolvedFormModalProps) {
  return (
    <Dialog open={open} onClose={onCancel}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>{children}</DialogContent>
      <DialogActions>
        {onDelete !== undefined && mode !== 'CREATE' && (
          <Button color="error" onClick={onDelete}>
            Delete
          </Button>
        )}
        {mode !== 'DISPLAY' && (
          <>
            <Button onClick={onCancel}>Cancel</Button>
            <Button onClick={onConfirm} variant="contained">
              Confirm
            </Button>
          </>
        )}
        {mode === 'DISPLAY' && <Button onClick={onCancel}>Close</Button>}
      </DialogActions>
    </Dialog>
  );
}
```

**Step 4: Create ListWrap**

Create `packages/enforma-mui/src/components/ListWrap.tsx`:

```typescript
import { List as MuiList } from '@mui/material';
import { type ResolvedListProps } from 'enforma';

export function ListWrap({ items, addButton, modal }: ResolvedListProps) {
  return (
    <>
      <MuiList>{items}</MuiList>
      {addButton}
      {modal}
    </>
  );
}
```

**Step 5: Run typecheck**

```bash
nvm use 20 && pnpm --filter enforma-mui typecheck
```
Expected: PASS

**Step 6: Commit**

```bash
git add packages/enforma-mui/src/components/ListItem.tsx \
        packages/enforma-mui/src/components/AddButton.tsx \
        packages/enforma-mui/src/components/FormModal.tsx \
        packages/enforma-mui/src/components/ListWrap.tsx
git commit -m "feat: add MUI ListWrap, ListItem, AddButton, FormModal slot components"
```

---

### Task 7: Move ListItemSlot and ListFormSlot to core

These slot marker components are currently in `enforma-mui` but core `List` needs them. Move them to `packages/enforma` so core can import them without a circular dependency.

**Files:**
- Create: `packages/enforma/src/components/ListItemSlot.tsx`
- Create: `packages/enforma/src/components/ListFormSlot.tsx`
- Modify: `packages/enforma/src/index.ts`
- Modify: `packages/enforma-mui/src/components/List.tsx` (update imports)
- Delete: `packages/enforma-mui/src/components/ListItemSlot.tsx`
- Delete: `packages/enforma-mui/src/components/ListFormSlot.tsx`

**Step 1: Create ListItemSlot in core**

Create `packages/enforma/src/components/ListItemSlot.tsx`:

```typescript
// packages/enforma/src/components/ListItemSlot.tsx
import type { FormValues } from '../store/FormStore';

export type ListItemSlotProps = {
  title: string | ((item: FormValues) => string);
  subtitle?: string | ((item: FormValues) => string);
  avatar?: string | ((item: FormValues) => string);
  showDeleteButton?: boolean;
};

// Props are read externally by the parent via React.Children — not used in the body
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ListItemSlot(_: ListItemSlotProps): null {
  return null;
}
```

**Step 2: Create ListFormSlot in core**

Create `packages/enforma/src/components/ListFormSlot.tsx`:

```typescript
// packages/enforma/src/components/ListFormSlot.tsx
import { type ReactNode } from 'react';

export type ListFormSlotMode = 'CREATE' | 'UPDATE' | 'DISPLAY';

export type ListFormSlotProps = {
  mode?: ListFormSlotMode;
  showDeleteButton?: boolean;
  children: ReactNode;
};

// Props are read externally by the parent via React.Children — not used in the body
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ListFormSlot(_: ListFormSlotProps): null {
  return null;
}
```

**Step 3: Export from enforma index**

Add to `packages/enforma/src/index.ts`:

```typescript
export { ListItemSlot } from './components/ListItemSlot';
export type { ListItemSlotProps } from './components/ListItemSlot';
export { ListFormSlot } from './components/ListFormSlot';
export type { ListFormSlotProps, ListFormSlotMode } from './components/ListFormSlot';
```

**Step 4: Update enforma-mui List.tsx to import from 'enforma'**

In `packages/enforma-mui/src/components/List.tsx`, replace the local imports:

```typescript
// remove these:
import { ListItemSlot, type ListItemSlotProps } from './ListItemSlot';
import { ListFormSlot, type ListFormSlotProps, type ListFormSlotMode } from './ListFormSlot';

// replace with:
import {
  ListItemSlot,
  type ListItemSlotProps,
  ListFormSlot,
  type ListFormSlotProps,
  type ListFormSlotMode,
} from 'enforma';
```

**Step 5: Delete the local enforma-mui slot files**

```bash
git rm packages/enforma-mui/src/components/ListItemSlot.tsx \
        packages/enforma-mui/src/components/ListFormSlot.tsx
```

**Step 6: Run typecheck**

```bash
nvm use 20 && pnpm typecheck
```
Expected: PASS

**Step 7: Run tests**

```bash
nvm use 20 && pnpm test
```
Expected: PASS (no behavior change)

**Step 8: Commit**

```bash
git add packages/enforma/src/components/ListItemSlot.tsx \
        packages/enforma/src/components/ListFormSlot.tsx \
        packages/enforma/src/index.ts \
        packages/enforma-mui/src/components/List.tsx
git commit -m "feat: move ListItemSlot and ListFormSlot to enforma core"
```

---

### Task 8: Rewrite core List to own orchestration

Move all modal orchestration from the MUI adapter to the core `List` component. The core List dispatches to registered slot components. ListItemSlot and ListFormSlot are now in core (Task 7).

**Files:**
- Modify: `packages/enforma/src/components/List.tsx`

**Step 1: Rewrite `packages/enforma/src/components/List.tsx`**

```typescript
// packages/enforma/src/components/List.tsx
import { useState, type ReactNode } from 'react';
import React from 'react';
import { Form } from './Form';
import type { FormValues } from '../store/FormStore';
import { useListState } from '../hooks/useListState';
import { ListItemSlot, type ListItemSlotProps } from './ListItemSlot';
import { ListFormSlot, type ListFormSlotProps, type ListFormSlotMode } from './ListFormSlot';
import { getComponent } from './registry';
import type { ResolvedListItemProps } from './types';

type ListProps = {
  bind: string;
  defaultItem: Record<string, unknown>;
  disabled?: boolean;
  children: ReactNode;
};

type ModalState = { open: false } | { open: true; index: number; mode: ListFormSlotMode };

function resolveForm(
  forms: ListFormSlotProps[],
  mode: ListFormSlotMode,
): ListFormSlotProps | undefined {
  return forms.find((f) => f.mode === mode) ?? forms.find((f) => f.mode === undefined);
}

function evalProp(prop: string | ((item: FormValues) => string), item: unknown): string {
  if (typeof prop === 'function') return prop(item as FormValues);
  const value = (item as FormValues)[prop];
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
    return '';
  }
  return String(value);
}

export function List({ bind, defaultItem, disabled = false, children }: ListProps) {
  const { arr, keys, append, remove, update } = useListState(bind, defaultItem);
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [draftValues, setDraftValues] = useState<FormValues>({});

  // Parse slot children
  let itemSlot: ListItemSlotProps | undefined;
  const formSlots: ListFormSlotProps[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === ListItemSlot) {
      itemSlot = child.props as ListItemSlotProps;
    } else if (child.type === ListFormSlot) {
      formSlots.push(child.props as ListFormSlotProps);
    }
  });

  const openModal = (index: number, mode: ListFormSlotMode) => {
    const draft =
      mode === 'CREATE' ? { ...defaultItem } : { ...(arr[index] as Record<string, unknown>) };
    setDraftValues(draft);
    setModal({ open: true, index, mode });
  };

  const handleConfirm = () => {
    if (!modal.open) return;
    if (modal.mode === 'CREATE') {
      append(draftValues as Record<string, unknown>);
    } else {
      update(modal.index, draftValues as Record<string, unknown>);
    }
    setModal({ open: false });
  };

  const handleCancel = () => {
    setModal({ open: false });
  };

  const handleDelete = (index: number) => {
    remove(index);
    setModal({ open: false });
  };

  // Build slot nodes
  const ListItemImpl = getComponent('ListItem');
  const items: ReactNode[] = arr.map((item, index) => {
    if (!ListItemImpl) return null;
    const itemProps: ResolvedListItemProps = {
      item: item as FormValues,
      index,
      onEdit: () => {
        openModal(index, disabled ? 'DISPLAY' : 'UPDATE');
      },
      onDelete: () => {
        handleDelete(index);
      },
      disabled,
      title: itemSlot !== undefined ? evalProp(itemSlot.title, item) : '',
      subtitle:
        itemSlot?.subtitle !== undefined ? evalProp(itemSlot.subtitle, item) : undefined,
      avatar: itemSlot?.avatar !== undefined ? evalProp(itemSlot.avatar, item) : undefined,
      showDeleteButton: itemSlot?.showDeleteButton ?? false,
    };
    return <ListItemImpl key={keys[index]} {...itemProps} />;
  });

  const AddButtonImpl = getComponent('AddButton');
  const addButton = AddButtonImpl ? (
    <AddButtonImpl onClick={() => { openModal(arr.length, 'CREATE'); }} disabled={disabled} />
  ) : null;

  const activeForm = modal.open ? resolveForm(formSlots, modal.mode) : undefined;
  const dialogTitle = modal.open
    ? modal.mode === 'CREATE'
      ? 'Add item'
      : modal.mode === 'UPDATE'
        ? 'Edit item'
        : 'View item'
    : '';

  const FormModalImpl = getComponent('FormModal');
  const modalNode = FormModalImpl ? (
    <FormModalImpl
      open={modal.open}
      mode={modal.open ? modal.mode : 'CREATE'}
      title={dialogTitle}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      onDelete={
        modal.open && modal.mode !== 'CREATE' && !disabled && activeForm?.showDeleteButton === true
          ? () => { handleDelete(modal.index); }
          : undefined
      }
    >
      {modal.open && activeForm !== undefined && (
        <Form
          values={draftValues}
          onChange={(v) => {
            setDraftValues(v);
          }}
          aria-label={dialogTitle}
        >
          {activeForm.children}
        </Form>
      )}
    </FormModalImpl>
  ) : null;

  const ListWrapImpl = getComponent('ListWrap');
  if (!ListWrapImpl) {
    throw new Error('Enforma: component "ListWrap" is not registered.');
  }

  return (
    <ListWrapImpl
      items={items}
      addButton={addButton}
      modal={modalNode}
      isEmpty={arr.length === 0}
      disabled={disabled}
    />
  );
}
```

**Step 2: Run typecheck**

```bash
nvm use 20 && pnpm typecheck
```
Expected: PASS

**Step 3: Update List.test.tsx to use registry pattern**

The existing `List.test.tsx` imports `List` from `'./List'` (MUI). After this refactor, `List` comes from core and dispatches via registry. Update `packages/enforma-mui/src/components/List.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Enforma, { Form, clearRegistry, registerComponents } from 'enforma';
import { TextInput } from './TextInput';
import { ListWrap } from './ListWrap';
import { ListItem } from './ListItem';
import { AddButton } from './AddButton';
import { FormModal } from './FormModal';

beforeEach(() => {
  clearRegistry();
  registerComponents({ TextInput, ListWrap, ListItem, AddButton, FormModal });
});

const defaultProps = {
  bind: 'items',
  defaultItem: { name: '' },
};

function renderList(
  listProps: Partial<typeof defaultProps & { disabled?: boolean }> = {},
  extraChildren?: React.ReactNode,
) {
  const onChange = vi.fn();
  render(
    <Form values={{ items: [{ name: 'Alice' }, { name: 'Bob' }] }} onChange={onChange}>
      <Enforma.List {...defaultProps} {...listProps}>
        <Enforma.List.Item title="name" />
        <Enforma.List.Form>
          <Enforma.TextInput bind="name" label="Name" />
        </Enforma.List.Form>
        {extraChildren}
      </Enforma.List>
    </Form>,
  );
  return { onChange };
}
```

All test cases remain the same — just update imports and the `renderList` helper above.

**Step 4: Run tests**

```bash
nvm use 20 && pnpm --filter enforma-mui test List
```
Expected: PASS (same behavior, new architecture)

**Step 5: Run full test suite**

```bash
nvm use 20 && pnpm test
```
Expected: PASS

**Step 6: Commit**

```bash
git add packages/enforma/src/components/List.tsx \
        packages/enforma-mui/src/components/List.test.tsx
git commit -m "feat: core List owns modal orchestration, dispatches to registered slot components"
```

---

### Task 9: Update enforma-mui index and remove old MUI List

**Files:**
- Modify: `packages/enforma-mui/src/index.ts`
- Delete: `packages/enforma-mui/src/components/List.tsx` (replaced by slot components in Task 6; local slot files already removed in Task 7)

**Step 1: Update enforma-mui index.ts**

Replace `packages/enforma-mui/src/index.ts`:

```typescript
import type { EnformaComponentRegistry } from 'enforma';
import { TextInput } from './components/TextInput';
import { Fieldset } from './components/Fieldset';
import { Select } from './components/Select';
import { ListWrap } from './components/ListWrap';
import { ListItem } from './components/ListItem';
import { AddButton } from './components/AddButton';
import { FormModal } from './components/FormModal';
import { ClassicProvider } from './context/ClassicProvider';
import { OutlinedProvider } from './context/OutlinedProvider';
import { StandardProvider } from './context/StandardProvider';

const listComponents = { ListWrap, ListItem, AddButton, FormModal } satisfies Partial<EnformaComponentRegistry>;

export const classic: Partial<EnformaComponentRegistry> = {
  TextInput,
  Select,
  Fieldset,
  FormWrap: ClassicProvider,
  ...listComponents,
};

export const outlined: Partial<EnformaComponentRegistry> = {
  TextInput,
  Select,
  Fieldset,
  FormWrap: OutlinedProvider,
  ...listComponents,
};

export const standard: Partial<EnformaComponentRegistry> = {
  TextInput,
  Select,
  Fieldset,
  FormWrap: StandardProvider,
  ...listComponents,
};

export { TextInput, Fieldset, Select, ListWrap, ListItem, AddButton, FormModal };
export { ClassicProvider, OutlinedProvider, StandardProvider };
export type { MuiVariant } from './context/MuiVariantContext';
```

**Step 2: Delete old MUI List**

```bash
git rm packages/enforma-mui/src/components/List.tsx
```

**Step 3: Run full test suite**

```bash
nvm use 20 && pnpm test
```
Expected: PASS

**Step 4: Run lint**

```bash
nvm use 20 && pnpm lint
```
Expected: PASS

**Step 5: Run typecheck**

```bash
nvm use 20 && pnpm typecheck
```
Expected: PASS

**Step 6: Commit**

```bash
git add packages/enforma-mui/src/index.ts
git rm packages/enforma-mui/src/components/List.tsx \
       packages/enforma-mui/src/components/ListItemSlot.tsx \
       packages/enforma-mui/src/components/ListFormSlot.tsx
git commit -m "feat: update enforma-mui exports, remove old List (replaced by slot components)"
```

---

### Task 10: Final verification

**Step 1: Run full test suite**

```bash
nvm use 20 && pnpm test
```
Expected: All tests PASS

**Step 2: Run lint**

```bash
nvm use 20 && pnpm lint
```
Expected: No errors or warnings

**Step 3: Run typecheck**

```bash
nvm use 20 && pnpm typecheck
```
Expected: No errors

**Step 4: Update demo app if needed**

Check `apps/demo/src/App.tsx` — if it imports `List` from `enforma-mui` directly, update to use `Enforma.List` from core and register slot components.

```bash
nvm use 20 && pnpm --filter demo dev
```
Verify the demo renders correctly.

**Step 5: Final commit**

```bash
git add -A
git commit -m "chore: verify pure presentational adapters refactor complete"
```
