# Calculated Component Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a generic `Calculated` component that derives a value from form state, optionally syncing the result back into the store via `bind`.

**Architecture:** Follow the exact same dispatch → registry → adapter pattern as all existing field components. The dispatch component resolves the reactive `value` prop using `useReactiveProp`, writes to the store in a `useEffect` when `bind` is present, and passes the resolved value to the registered adapter. The MUI adapter renders a read-only `TextField` matching all other fields.

**Tech Stack:** TypeScript generics, React `useEffect`, `useSyncExternalStore`, `useReactiveProp`, MUI `TextField` with `readOnly`, Vitest + @testing-library/react.

---

### Task 1: Add types to `packages/enforma/src/components/types.ts`

**Files:**
- Modify: `packages/enforma/src/components/types.ts:147-170` (ComponentPropsMap)

**Step 1: Add `CalculatedProps<T>` and `ResolvedCalculatedProps` types**

Insert after the closing brace of `ResolvedAddButtonProps` (line 298), before the end of file:

```typescript
export type CalculatedProps<T = unknown> = {
  bind?: string;
  value: Reactive<T>;
  label?: Reactive<string>;
  description?: Reactive<string>;
  disabled?: Reactive<boolean>;
};

export type ResolvedCalculatedProps = {
  value: unknown;
  label: string | undefined;
  description: string | undefined;
  disabled: boolean | undefined;
};
```

**Step 2: Add `Calculated` to `ComponentPropsMap`**

In the `ComponentPropsMap` type (starting at line 147), add after `ExclusiveToggleOption`:

```typescript
  Calculated: ResolvedCalculatedProps;
```

**Step 3: Run typecheck to verify**

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm typecheck
```
Expected: no errors

**Step 4: Commit**

```bash
git add packages/enforma/src/components/types.ts
git commit -m "feat(enforma): add CalculatedProps and ResolvedCalculatedProps types"
```

---

### Task 2: Add `CalculatedDispatch` to `packages/enforma/src/components/fields.tsx`

**Files:**
- Modify: `packages/enforma/src/components/fields.tsx`

**Step 1: Add import for `joinPath` and `useScope`**

The file already imports `useReactiveProp` from `../hooks/useField`. Add `useEffect` and `useScope` + `joinPath`:

At the top of the file, `react` is already imported. Add `useEffect` to the React import:
```typescript
import { memo, useEffect } from 'react';
```

In the types import block, add `CalculatedProps` and `ResolvedCalculatedProps`:
```typescript
import type {
  // ... existing imports ...
  CalculatedProps,
  ResolvedCalculatedProps,
} from './types';
```

Add `useScope` and `joinPath` to the hook imports:
```typescript
import { useFieldProps, useReactiveProp, useScope } from '../hooks/useField';
```

Wait — `useScope` and `joinPath` are imported from `../context/ScopeContext`, not from `../hooks/useField`. Check the existing fields.tsx for the import — it currently only imports from `../hooks/useField` and `../context/DataSourceContext`. Add a new import:

```typescript
import { useScope, joinPath } from '../context/ScopeContext';
```

**Step 2: Write the `CalculatedDispatch` function**

Add after `ExclusiveToggleDispatch` (before the memo exports, around line 376):

```typescript
function CalculatedDispatch<T = unknown>({ bind, value, label, description, disabled }: CalculatedProps<T>) {
  const resolvedValue = useReactiveProp(value);
  const resolvedLabel = useReactiveProp(label);
  const resolvedDescription = useReactiveProp(description);
  const resolvedDisabled = useReactiveProp(disabled);
  const { store, prefix } = useScope();

  useEffect(() => {
    if (bind == null) return;
    const fullPath = joinPath(prefix, bind);
    store.setField(fullPath, resolvedValue);
  }, [resolvedValue, bind, store, prefix]);

  return dispatchComponent('Calculated', {
    value: resolvedValue,
    label: resolvedLabel,
    description: resolvedDescription,
    disabled: resolvedDisabled,
  } as ResolvedCalculatedProps);
}
```

**Step 3: Export as `Calculated` with memo**

Add to the memo exports block (after the ExclusiveToggle export):

```typescript
export const Calculated = memo(CalculatedDispatch, stablePropsEqual) as typeof CalculatedDispatch;
```

The `as typeof CalculatedDispatch` cast preserves the generic type signature on the exported component.

**Step 4: Run typecheck**

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm typecheck
```
Expected: no errors

**Step 5: Commit**

```bash
git add packages/enforma/src/components/fields.tsx
git commit -m "feat(enforma): add Calculated dispatch component"
```

---

### Task 3: Export from `packages/enforma/src/index.ts`

**Files:**
- Modify: `packages/enforma/src/index.ts`

`Calculated` is already re-exported via `...fields` on line 7 (`const Enforma = { Form, ...fields, Scope, List }`), so the component itself is available on the `Enforma` namespace automatically.

**Step 1: Export the types**

In the resolved types export block (lines 57–82), add:

```typescript
  CalculatedProps,
  ResolvedCalculatedProps,
```

**Step 2: Run typecheck**

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm typecheck
```
Expected: no errors

**Step 3: Commit**

```bash
git add packages/enforma/src/index.ts
git commit -m "feat(enforma): export CalculatedProps and ResolvedCalculatedProps types"
```

---

### Task 4: Write the MUI adapter test first (TDD)

**Files:**
- Create: `packages/enforma-mui/src/components/Calculated.test.tsx`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Enforma, { Form, registerComponents, clearRegistry } from 'enforma';
import { Calculated } from './Calculated';

beforeEach(() => {
  clearRegistry();
  registerComponents({ Calculated });
});

describe('MUI Calculated', () => {
  it('renders the computed value as text', () => {
    render(
      <Form values={{ a: 3, b: 4 }} onChange={() => undefined}>
        <Enforma.Calculated value={(v) => (v.a as number) + (v.b as number)} label="Total" />
      </Form>,
    );
    expect(screen.getByDisplayValue('7')).toBeInTheDocument();
  });

  it('renders the label', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.Calculated value={() => 42} label="Score" />
      </Form>,
    );
    expect(screen.getByLabelText('Score')).toBeInTheDocument();
  });

  it('is read-only (cannot be edited)', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.Calculated value={() => 42} label="Score" />
      </Form>,
    );
    const input = screen.getByLabelText('Score') as HTMLInputElement;
    expect(input.readOnly).toBe(true);
  });

  it('syncs computed value into form state when bind is set', () => {
    const onChange = vi.fn();
    render(
      <Form values={{ a: 2, b: 3, total: 0 }} onChange={onChange}>
        <Enforma.Calculated<number>
          bind="total"
          value={(v) => (v.a as number) + (v.b as number)}
          label="Total"
        />
      </Form>,
    );
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ total: 5 }),
      expect.anything(),
    );
  });

  it('updates displayed value when form state changes', () => {
    const { rerender } = render(
      <Form values={{ a: 1, b: 2 }} onChange={() => undefined}>
        <Enforma.Calculated value={(v) => (v.a as number) + (v.b as number)} label="Total" />
      </Form>,
    );
    expect(screen.getByDisplayValue('3')).toBeInTheDocument();

    rerender(
      <Form values={{ a: 10, b: 20 }} onChange={() => undefined}>
        <Enforma.Calculated value={(v) => (v.a as number) + (v.b as number)} label="Total" />
      </Form>,
    );
    expect(screen.getByDisplayValue('30')).toBeInTheDocument();
  });

  it('renders description as helper text', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.Calculated value={() => 0} label="Total" description="Sum of all items" />
      </Form>,
    );
    expect(screen.getByText('Sum of all items')).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.Calculated value={() => 0} label="Score" disabled />
      </Form>,
    );
    expect(screen.getByLabelText('Score')).toBeDisabled();
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm --filter enforma-mui test -- --reporter=verbose Calculated
```
Expected: FAIL — `Cannot find module './Calculated'`

---

### Task 5: Implement the MUI `Calculated` adapter

**Files:**
- Create: `packages/enforma-mui/src/components/Calculated.tsx`

**Step 1: Create the file**

```typescript
import { useContext, useId } from 'react';
import { FormLabel, TextField } from '@mui/material';
import type { ResolvedCalculatedProps } from 'enforma';
import { ComponentWrap } from './ComponentWrap';
import { MuiVariantContext } from '../context/MuiVariantContext';

export function Calculated({
  value,
  label,
  description,
  disabled = false,
}: ResolvedCalculatedProps) {
  const variant = useContext(MuiVariantContext);
  const id = useId();
  const displayValue = value != null ? String(value) : '';

  if (variant === 'classic') {
    return (
      <ComponentWrap disabled={disabled}>
        {label !== undefined && <FormLabel htmlFor={id}>{label}</FormLabel>}
        <TextField
          value={displayValue}
          label={undefined}
          helperText={description}
          disabled={disabled}
          slotProps={{ input: { readOnly: true }, htmlInput: { id } }}
          fullWidth
          variant="outlined"
          size="small"
        />
      </ComponentWrap>
    );
  }

  return (
    <ComponentWrap disabled={disabled}>
      <TextField
        value={displayValue}
        label={label}
        helperText={description}
        disabled={disabled}
        slotProps={{ input: { readOnly: true } }}
        fullWidth
        variant={variant}
      />
    </ComponentWrap>
  );
}
```

**Step 2: Run tests to verify they pass**

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm --filter enforma-mui test -- --reporter=verbose Calculated
```
Expected: all tests PASS

**Step 3: Run full test suite**

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm test
```
Expected: all tests PASS

**Step 4: Run typecheck and lint**

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm typecheck && pnpm lint
```
Expected: no errors or warnings

**Step 5: Commit**

```bash
git add packages/enforma-mui/src/components/Calculated.tsx packages/enforma-mui/src/components/Calculated.test.tsx
git commit -m "feat(enforma-mui): add Calculated adapter component"
```

---

### Task 6: Register `Calculated` in `packages/enforma-mui/src/index.ts`

**Files:**
- Modify: `packages/enforma-mui/src/index.ts`

**Step 1: Add the import**

After the existing imports, add:
```typescript
import { Calculated } from './components/Calculated';
```

**Step 2: Add to `muiComponents` object**

In the `muiComponents` object, add:
```typescript
  Calculated,
```

**Step 3: Add to the named exports**

In the `export { ... }` block at the bottom, add:
```typescript
  Calculated,
```

**Step 4: Run typecheck and full test suite**

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm typecheck && pnpm test
```
Expected: no errors, all tests pass

**Step 5: Commit**

```bash
git add packages/enforma-mui/src/index.ts
git commit -m "feat(enforma-mui): register Calculated in component registry"
```

---

### Task 7: Add a demo example in `apps/demo/src/App.tsx`

**Files:**
- Modify: `apps/demo/src/App.tsx`

**Step 1: Find a suitable location**

Find a section in `App.tsx` that demonstrates numeric or computed values. Add a small demo section that uses `Calculated` with and without `bind`.

Add a section showing:
```typescript
<Enforma.Calculated<number>
  bind="total"
  value={(v) => ((v.q1 as number) ?? 0) + ((v.q2 as number) ?? 0)}
  label="Computed Total (synced)"
/>
<Enforma.Calculated<number>
  value={(v) => ((v.q1 as number) ?? 0) + ((v.q2 as number) ?? 0)}
  label="Computed Total (display only)"
/>
```

**Step 2: Run typecheck and lint**

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm typecheck && pnpm lint
```
Expected: no errors or warnings

**Step 3: Commit**

```bash
git add apps/demo/src/App.tsx
git commit -m "feat(demo): add Calculated component example"
```
