# Core Library Cohesion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rename the `ListWrap` registry key/component to `List`, and mirror List's dispatch pattern in `Select` by pre-rendering options via a registered `SelectOption` component rather than passing a flat array.

**Architecture:** Two independent changes. (1) `ListWrap` → `List` is a mechanical rename across types, core dispatch, and MUI. (2) `SelectOption` registry pattern follows List's approach exactly: `SelectDispatch` calls `getComponent('SelectOption')` per resolved option, collects `ReactNode[]`, passes as `children` to `Select`. The `buildSelectOptions` helper is unchanged — it still resolves the intermediate `{ value, label }[]` from dataSource + slot props; only the final rendering step changes.

**Tech Stack:** TypeScript strict, React 18, Vitest, @testing-library/react, pnpm workspaces

---

### Task 1: Rename `ListWrap` → `List` in core types and dispatch

**Files:**
- Modify: `packages/enforma/src/components/types.ts:43`
- Modify: `packages/enforma/src/components/List.tsx:156-170`

**Step 1: Rename registry key in `types.ts`**

In `packages/enforma/src/components/types.ts`, change line 43 from:
```typescript
  ListWrap: ResolvedListProps;
```
to:
```typescript
  List: ResolvedListProps;
```

**Step 2: Run typecheck to identify all broken call sites**

```bash
nvm use 20 && pnpm typecheck
```
Expected: Errors in `List.tsx` (uses `'ListWrap'` string key) and `packages/enforma-mui/src/index.ts` (`ListWrap` key in registry object). MUI will be fixed in Task 2.

**Step 3: Fix `List.tsx` lines 156-170**

Change:
```typescript
  // Dispatch to registered ListWrap
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
```
to:
```typescript
  // Dispatch to registered List
  const ListImpl = getComponent('List');
  if (!ListImpl) {
    throw new Error('Enforma: component "List" is not registered.');
  }

  return (
    <ListImpl
      items={items}
      addButton={addButton}
      modal={modalNode}
      isEmpty={arr.length === 0}
      disabled={disabled}
    />
  );
```

**Step 4: Run typecheck**

```bash
nvm use 20 && pnpm typecheck
```
Expected: Only MUI error remains (Task 2 fixes it). Core should be clean.

**Step 5: Commit**

```bash
git add packages/enforma/src/components/types.ts packages/enforma/src/components/List.tsx
git commit -m "feat: rename registry key ListWrap → List in core"
```

---

### Task 2: Rename `ListWrap` → `List` in MUI

**Files:**
- Create: `packages/enforma-mui/src/components/List.tsx`
- Delete: `packages/enforma-mui/src/components/ListWrap.tsx`
- Modify: `packages/enforma-mui/src/index.ts`

**Step 1: Create `List.tsx` with renamed export**

Create `packages/enforma-mui/src/components/List.tsx`:
```typescript
import { List as MuiList } from '@mui/material';
import { type ResolvedListProps } from 'enforma';

export function List({ items, addButton, modal }: ResolvedListProps) {
  return (
    <>
      <MuiList>{items}</MuiList>
      {addButton}
      {modal}
    </>
  );
}
```

**Step 2: Delete `ListWrap.tsx`**

```bash
git rm packages/enforma-mui/src/components/ListWrap.tsx
```

**Step 3: Update `packages/enforma-mui/src/index.ts`**

Replace the import line:
```typescript
import { ListWrap } from './components/ListWrap';
```
with:
```typescript
import { List } from './components/List';
```

Replace the `listComponents` object:
```typescript
const listComponents = {
  ListWrap,
  ListItem,
  AddButton,
  FormModal,
} satisfies Partial<EnformaComponentRegistry>;
```
with:
```typescript
const listComponents = {
  List,
  ListItem,
  AddButton,
  FormModal,
} satisfies Partial<EnformaComponentRegistry>;
```

Replace the named export line:
```typescript
export { TextInput, Fieldset, Select, ListWrap, ListItem, AddButton, FormModal };
```
with:
```typescript
export { TextInput, Fieldset, Select, List, ListItem, AddButton, FormModal };
```

**Step 4: Run typecheck and full test suite**

```bash
nvm use 20 && pnpm typecheck && pnpm test --run
```
Expected: All pass. The `List.test.tsx` in enforma-mui exercises the full flow and confirms correctness.

**Step 5: Commit**

```bash
git add packages/enforma-mui/src/components/List.tsx packages/enforma-mui/src/index.ts
git commit -m "feat: rename MUI ListWrap → List component and export"
```

---

### Task 3: Add `SelectOption` to core types, update `ResolvedSelectProps`

**Files:**
- Modify: `packages/enforma/src/components/types.ts`

**Step 1: Add `ResolvedSelectOptionProps` and update `ComponentPropsMap`**

In `packages/enforma/src/components/types.ts`:

1. Add new type after `ResolvedSelectProps` (after line 88):
```typescript
export type ResolvedSelectOptionProps = {
  value: unknown;
  label: string;
};
```

2. Add `SelectOption` to `ComponentPropsMap` (after the `Select` line):
```typescript
  Select: ResolvedSelectProps;
  SelectOption: ResolvedSelectOptionProps;
```

3. Update `ResolvedSelectProps` (lines 81-88) — remove `options`, make `children` required:
```typescript
export type ResolvedSelectProps = ResolvedCommonProps & {
  value: unknown;
  setValue: (value: unknown) => void;
  children: ReactNode;
  isLoading: boolean;
  dataSourceError: Error | null;
};
```

**Step 2: Run typecheck**

```bash
nvm use 20 && pnpm typecheck
```
Expected: Errors in `fields.tsx` (passing `options` to Select, and `children` is now required) and in `packages/enforma-mui/src/components/Select.tsx` (destructuring `options`). These are fixed in Tasks 5 and 6.

**Step 3: Commit type changes**

```bash
git add packages/enforma/src/components/types.ts
git commit -m "feat: add ResolvedSelectOptionProps to registry, update ResolvedSelectProps to use children"
```

---

### Task 4: Export `ResolvedSelectOptionProps` from core index

**Files:**
- Modify: `packages/enforma/src/index.ts:43-54`

**Step 1: Add `ResolvedSelectOptionProps` to the type export block**

In `packages/enforma/src/index.ts`, add `ResolvedSelectOptionProps` to the resolved types export (lines 43-54):
```typescript
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

**Step 2: Run typecheck**

```bash
nvm use 20 && pnpm typecheck
```
Expected: Same errors as before (fields.tsx and MUI Select still broken). No new errors.

**Step 3: Commit**

```bash
git add packages/enforma/src/index.ts
git commit -m "feat: export ResolvedSelectOptionProps from core"
```

---

### Task 5: Create MUI `SelectOption` component

**Files:**
- Create: `packages/enforma-mui/src/components/SelectOption.tsx`
- Modify: `packages/enforma-mui/src/components/Select.test.tsx` (add import + register)

**Step 1: Write the failing test — add `SelectOption` import to Select test**

In `packages/enforma-mui/src/components/Select.test.tsx`, add the import at the top:
```typescript
import { SelectOption } from './SelectOption';
```

Update `beforeEach` to register it:
```typescript
beforeEach(() => {
  clearRegistry();
  registerComponents({ Select, TextInput, SelectOption });
});
```

Run:
```bash
nvm use 20 && pnpm --filter enforma-mui test --run -- Select
```
Expected: FAIL — `./SelectOption` does not exist yet.

**Step 2: Create the component**

Create `packages/enforma-mui/src/components/SelectOption.tsx`:
```typescript
import { MenuItem } from '@mui/material';
import { type ResolvedSelectOptionProps } from 'enforma';

export function SelectOption({ value, label }: ResolvedSelectOptionProps) {
  return <MenuItem value={value as string}>{label}</MenuItem>;
}
```

**Step 3: Run test**

```bash
nvm use 20 && pnpm --filter enforma-mui test --run -- Select
```
Expected: Tests that were passing before still pass (the component is registered but not yet used since `fields.tsx` still passes `options` — this will change in Task 6).

**Step 4: Commit**

```bash
git add packages/enforma-mui/src/components/SelectOption.tsx packages/enforma-mui/src/components/Select.test.tsx
git commit -m "feat: add MUI SelectOption component (renders MenuItem)"
```

---

### Task 6: Update `SelectDispatch` to dispatch per option

**Files:**
- Modify: `packages/enforma/src/components/fields.tsx:125-152`

**Step 1: Update `SelectDispatch`**

In `packages/enforma/src/components/fields.tsx`, replace the `SelectDispatch` function (lines 125-142):

```typescript
function SelectDispatch(props: SelectProps) {
  const resolved = useFieldProps<unknown>(props);
  const {
    items,
    isLoading,
    error: dataSourceError,
  } = useDataSource(props.dataSource, {
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
```

with:

```typescript
function SelectDispatch(props: SelectProps) {
  const resolved = useFieldProps<unknown>(props);
  const {
    items,
    isLoading,
    error: dataSourceError,
  } = useDataSource(props.dataSource, {
    bind: props.bind,
  });
  const options = buildSelectOptions(items, props.children);
  const SelectOptionImpl = getComponent('SelectOption');
  if (!SelectOptionImpl) {
    throw new Error('Enforma: component "SelectOption" is not registered.');
  }
  const renderedOptions = options.map((opt) => (
    <SelectOptionImpl key={String(opt.value)} value={opt.value} label={opt.label} />
  ));
  return dispatchComponent('Select', {
    ...resolved,
    children: renderedOptions,
    isLoading,
    dataSourceError: dataSourceError ?? null,
  });
}
```

Note: `getComponent` is already imported in `fields.tsx` (it's used inside `dispatchComponent`). Verify it is imported at line 3 — if not, add:
```typescript
import { getComponent } from './registry';
```

**Step 2: Run typecheck**

```bash
nvm use 20 && pnpm typecheck
```
Expected: Only the MUI Select error remains (`options` prop no longer exists on `ResolvedSelectProps`). Core should be clean.

**Step 3: Commit**

```bash
git add packages/enforma/src/components/fields.tsx
git commit -m "feat: SelectDispatch dispatches per option to SelectOption registry"
```

---

### Task 7: Update MUI `Select` to render children

**Files:**
- Modify: `packages/enforma-mui/src/components/Select.tsx`

**Step 1: Update the component**

Replace the full content of `packages/enforma-mui/src/components/Select.tsx`:

```typescript
import { useContext } from 'react';
import {
  CircularProgress,
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
  children,
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
        {children}
      </MuiSelect>
      {showError && <FormHelperText>{dataSourceError?.message ?? error}</FormHelperText>}
    </MuiFormControl>
  );
}
```

Note: `MenuItem` import is removed — it is now in `SelectOption.tsx`.

**Step 2: Run typecheck and full test suite**

```bash
nvm use 20 && pnpm typecheck && pnpm test --run
```
Expected: All pass. Select tests confirm rendering still works end-to-end.

**Step 3: Commit**

```bash
git add packages/enforma-mui/src/components/Select.tsx
git commit -m "feat: MUI Select renders children (pre-rendered SelectOption nodes)"
```

---

### Task 8: Register `SelectOption` in MUI presets and update exports

**Files:**
- Modify: `packages/enforma-mui/src/index.ts`

**Step 1: Add `SelectOption` import and registration**

In `packages/enforma-mui/src/index.ts`:

Add import after the `Select` import line:
```typescript
import { SelectOption } from './components/SelectOption';
```

Add `SelectOption` to the preset objects. Change each preset:
```typescript
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

Add `SelectOption` to the named export line:
```typescript
export { TextInput, Fieldset, Select, SelectOption, List, ListItem, AddButton, FormModal };
```

**Step 2: Run typecheck and full test suite**

```bash
nvm use 20 && pnpm typecheck && pnpm test --run
```
Expected: All pass. No errors or warnings.

**Step 3: Run lint**

```bash
nvm use 20 && pnpm lint
```
Expected: No errors or warnings.

**Step 4: Commit**

```bash
git add packages/enforma-mui/src/index.ts
git commit -m "feat: register SelectOption in MUI presets, add to exports"
```

---

### Task 9: Update TODO.md

**Files:**
- Modify: `docs/TODO.md`

**Step 1: Mark core library section complete**

Replace the entire `## Core library` section in `docs/TODO.md`:
```markdown
## Core library

- Move `List.Item` slot definition into the core library (`packages/enforma`) so all adapter implementations are bound by the same contract. Currently `ListItemSlot` lives only in `enforma-mui`.
- Likewise, `Select.Option` (item label/value mapping for DataSource-backed selects) should be defined in core, not per-adapter.
- Review whether `SelectDispatch` should create `SelectOption` elements from its resolved options list and pass them as children to the registered `Select` component, rather than passing a flat `options` array. This would let adapters render children natively (e.g. `<option>` or `<MenuItem>`) without needing to know the options format upfront.
- Why list in mui is called listwrap?
```
with nothing (delete the whole section — all items done).

**Step 2: Run full suite one final time**

```bash
nvm use 20 && pnpm lint && pnpm typecheck && pnpm test --run
```
Expected: All pass with no errors or warnings.

**Step 3: Commit**

```bash
git add docs/TODO.md
git commit -m "chore: mark core library cohesion TODO items as complete"
```
