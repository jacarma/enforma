# Enforma.Submit Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `Enforma.Submit` as a first-class registry-dispatched component with a MUI adapter that renders a `variant="contained"` button, replacing the plain `<button>` in HeroDemo.

**Architecture:** Follows the existing dispatch pattern: `types.ts` defines props/resolved types, `fields.tsx` adds a `SubmitDispatch` function, `enforma-mui` provides the adapter. `SubmitDispatch` uses a single `useSyncExternalStore` call (with ref-cache) to resolve both `formValid` from the store and the `disabled` prop, which accepts an optional function `(scopeValues, allValues, { formValid }) => boolean`.

**Tech Stack:** React, TypeScript strict, MUI `Button`, Vitest + @testing-library/react, pnpm workspaces monorepo.

---

## Chunk 1: Core types, dispatch, MUI adapter, tests, wiring, docs update

### File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `packages/enforma/src/components/types.ts` | Add `SubmitDisabledFn`, `SubmitProps`, `ResolvedSubmitProps`; add `Submit` to `ComponentPropsMap` |
| Modify | `packages/enforma/src/components/fields.tsx` | Add `SubmitDispatch` + `Submit` export |
| Modify | `packages/enforma/src/index.ts` | Export new types |
| Create | `packages/enforma-mui/src/components/Submit.tsx` | MUI `<Button variant="contained" type="submit">` adapter |
| Create | `packages/enforma-mui/src/components/Submit.test.tsx` | Integration tests |
| Modify | `packages/enforma-mui/src/index.ts` | Register `Submit` in component map |
| Modify | `apps/docs/src/components/HeroDemo.tsx` | Replace `<button>` with `<Enforma.Submit />` |
| Modify | `apps/docs/src/pages/index.astro` | Update hero code snippet |

---

### Task 1: Add types to enforma core

**Files:**
- Modify: `packages/enforma/src/components/types.ts`

- [ ] **Step 1: Add `SubmitDisabledFn`, `SubmitProps`, `ResolvedSubmitProps`, and update `ComponentPropsMap`**

  Open `packages/enforma/src/components/types.ts`. The `ComponentPropsMap` type is around line 163. Add the three new types **directly before** `ComponentPropsMap` (so `ResolvedSubmitProps` is defined before it is used in the map), then add `Submit` to the map:

  ```ts
  // Add these three types immediately before the ComponentPropsMap block:
  export type SubmitDisabledFn = (
    scopeValues: FormValues,
    allValues: FormValues,
    meta: { formValid: boolean },
  ) => boolean;

  export type SubmitProps = {
    children?: ReactNode;
    disabled?: boolean | SubmitDisabledFn;
  };

  export type ResolvedSubmitProps = {
    children: ReactNode;
    disabled: boolean | undefined;
    formValid: boolean;
  };

  // Then inside ComponentPropsMap, add after the Output entry:
  export type ComponentPropsMap = {
    // ... existing entries ...
    Output: ResolvedOutputProps;
    Submit: ResolvedSubmitProps;  // add this line
  };
  ```

  Important: `ResolvedSubmitProps` must appear in the file before `ComponentPropsMap` references it, so place the new types above the map — not at the bottom of the file.

- [ ] **Step 3: Verify typecheck passes**

  ```bash
  nvm use 20 && cd packages/enforma && pnpm typecheck
  ```
  Expected: no errors.

---

### Task 2: Write the failing test

**Files:**
- Create: `packages/enforma-mui/src/components/Submit.test.tsx`

- [ ] **Step 1: Create `Submit.test.tsx`**

  ```tsx
  import { describe, it, expect, beforeEach } from 'vitest';
  import { render, screen, fireEvent } from '@testing-library/react';
  import Enforma, { Form, registerComponents, clearRegistry } from 'enforma';
  import type { ResolvedTextInputProps } from 'enforma';
  import { Submit } from './Submit';

  function MinimalInput({ value, setValue }: ResolvedTextInputProps) {
    return (
      <input
        data-testid="name-input"
        value={value ?? ''}
        onChange={(e) => {
          setValue(e.target.value);
        }}
      />
    );
  }

  beforeEach(() => {
    clearRegistry();
    registerComponents({ Submit });
  });

  describe('MUI Submit', () => {
    it('renders a button with default label "Submit"', () => {
      render(
        <Form values={{}} onChange={() => undefined}>
          <Enforma.Submit />
        </Form>,
      );
      expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
    });

    it('renders a button with custom children', () => {
      render(
        <Form values={{}} onChange={() => undefined}>
          <Enforma.Submit>Save changes</Enforma.Submit>
        </Form>,
      );
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
    });

    it('is disabled when disabled={true}', () => {
      render(
        <Form values={{}} onChange={() => undefined}>
          <Enforma.Submit disabled={true} />
        </Form>,
      );
      expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
    });

    it('is not disabled when disabled={false}', () => {
      render(
        <Form values={{}} onChange={() => undefined}>
          <Enforma.Submit disabled={false} />
        </Form>,
      );
      expect(screen.getByRole('button', { name: 'Submit' })).not.toBeDisabled();
    });

    it('disabled fn receives formValid=false when form has validation errors', () => {
      registerComponents({ TextInput: MinimalInput, Submit });
      render(
        <Form values={{}} onChange={() => undefined}>
          <Enforma.TextInput bind="name" label="Name" required />
          <Enforma.Submit disabled={(_, __, { formValid }) => !formValid} />
        </Form>,
      );
      // Empty required field → formValid=false → disabled=true
      expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
    });

    it('disabled fn receives formValid=true when form is valid', () => {
      registerComponents({ TextInput: MinimalInput, Submit });
      render(
        <Form values={{ name: 'Alice' }} onChange={() => undefined}>
          <Enforma.TextInput bind="name" label="Name" required />
          <Enforma.Submit disabled={(_, __, { formValid }) => !formValid} />
        </Form>,
      );
      // Filled required field → formValid=true → disabled=false
      expect(screen.getByRole('button', { name: 'Submit' })).not.toBeDisabled();
    });

    it('re-evaluates disabled fn when form validity changes', () => {
      registerComponents({ TextInput: MinimalInput, Submit });
      render(
        <Form values={{}} onChange={() => undefined}>
          <Enforma.TextInput bind="name" label="Name" required />
          <Enforma.Submit disabled={(_, __, { formValid }) => !formValid} />
        </Form>,
      );

      expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();

      fireEvent.change(screen.getByTestId('name-input'), { target: { value: 'Alice' } });

      expect(screen.getByRole('button', { name: 'Submit' })).not.toBeDisabled();
    });

    it('renders as type="submit"', () => {
      render(
        <Form values={{}} onChange={() => undefined}>
          <Enforma.Submit />
        </Form>,
      );
      expect(screen.getByRole('button', { name: 'Submit' })).toHaveAttribute('type', 'submit');
    });
  });
  ```

- [ ] **Step 2: Run tests — expect failure**

  ```bash
  nvm use 20 && cd packages/enforma-mui && pnpm test -- --reporter=verbose Submit
  ```
  Expected: FAIL — `Enforma.Submit` is not a function / Submit not defined.

---

### Task 3: Add SubmitDispatch to fields.tsx

**Files:**
- Modify: `packages/enforma/src/components/fields.tsx`

- [ ] **Step 1: Add imports to fields.tsx**

  In `packages/enforma/src/components/fields.tsx`, add `SubmitProps` and `ResolvedSubmitProps` to the import from `'./types'` (the big import block starting around line 9):

  ```ts
  import type {
    // ... existing imports ...
    SubmitProps,
    ResolvedSubmitProps,
  } from './types';
  ```

  Also add `FormValues` to the import from `'../store/FormStore'` at the top of the file. Check the existing import — it currently imports nothing from that module, so add a new line:

  ```ts
  import type { FormValues } from '../store/FormStore';
  ```

- [ ] **Step 2: Add `SubmitDispatch` function before the export block at the bottom of fields.tsx**

  Add this function after `OutputDispatch` (around line 768), before the export lines:

  ```tsx
  function SubmitDispatch({ children = 'Submit', disabled }: SubmitProps) {
    const { store, prefix } = useScope();

    const disabledRef = React.useRef(disabled);
    disabledRef.current = disabled;

    const lastRef = React.useRef<{ disabled: boolean | undefined; formValid: boolean } | null>(null);

    const subscribe = React.useCallback((cb: () => void) => store.subscribe(cb), [store]);

    const snapshot = React.useSyncExternalStore(subscribe, () => {
      const allValues = store.getSnapshot();
      const raw = store.getField(prefix);
      const scopeValues: FormValues =
        prefix === '' || raw === null || typeof raw !== 'object' ? allValues : (raw as FormValues);

      const fv = store.isValid();
      const d = disabledRef.current;
      const resolvedDisabled =
        typeof d === 'function' ? d(scopeValues, allValues, { formValid: fv }) : d;

      const last = lastRef.current;
      if (
        last !== null &&
        Object.is(last.disabled, resolvedDisabled) &&
        Object.is(last.formValid, fv)
      ) {
        return last;
      }
      return (lastRef.current = { disabled: resolvedDisabled, formValid: fv });
    });

    return dispatchComponent('Submit', {
      children,
      disabled: snapshot.disabled,
      formValid: snapshot.formValid,
    });
  }

  export const Submit = memo(SubmitDispatch, stablePropsEqual);
  ```

  Note: `React.useRef`, `React.useCallback`, `React.useSyncExternalStore` are used via the existing `import React from 'react'` namespace import. `FormValues` requires the new type import added in Step 1.

- [ ] **Step 3: Verify typecheck passes**

  ```bash
  nvm use 20 && cd packages/enforma && pnpm typecheck
  ```
  Expected: no errors.

---

### Task 4: Export new types and Submit from enforma index.ts

**Files:**
- Modify: `packages/enforma/src/index.ts`

- [ ] **Step 1: Export new types from index.ts**

  In `packages/enforma/src/index.ts`, add `SubmitDisabledFn`, `SubmitProps`, and `ResolvedSubmitProps` to the large `export type { ... }` block at the bottom:

  ```ts
  export type {
    // ... existing exports ...
    SubmitDisabledFn,
    SubmitProps,
    ResolvedSubmitProps,
  } from './components/types';
  ```

  `Submit` is already covered by `...fields` in the `Enforma` default export — no additional wiring needed there.

- [ ] **Step 2: Verify typecheck passes**

  ```bash
  nvm use 20 && cd packages/enforma && pnpm typecheck
  ```
  Expected: no errors.

---

### Task 5: Create MUI Submit adapter

**Files:**
- Create: `packages/enforma-mui/src/components/Submit.tsx`

- [ ] **Step 1: Create the adapter**

  ```tsx
  import { Button } from '@mui/material';
  import type { ResolvedSubmitProps } from 'enforma';

  export function Submit({ children, disabled }: ResolvedSubmitProps) {
    return (
      <Button type="submit" variant="contained" disabled={disabled}>
        {children}
      </Button>
    );
  }
  ```

  `formValid` is available in props for custom adapters but intentionally unused here — the MUI default does not auto-disable.

---

### Task 6: Register Submit in enforma-mui

**Files:**
- Modify: `packages/enforma-mui/src/index.ts`

- [ ] **Step 1: Import and register Submit**

  Add `Submit` import after the other component imports:

  ```ts
  import { Submit } from './components/Submit';
  ```

  Add `Submit` to the `muiComponents` object:

  ```ts
  const muiComponents = {
    // ... existing entries ...
    Submit,
  } satisfies Partial<EnformaComponentRegistry>;
  ```

  Add `Submit` to the named exports at the bottom:

  ```ts
  export {
    // ... existing exports ...
    Submit,
  };
  ```

- [ ] **Step 2: Run tests — expect all passing**

  ```bash
  nvm use 20 && cd packages/enforma-mui && pnpm test -- --reporter=verbose Submit
  ```
  Expected: all 8 tests PASS.

- [ ] **Step 3: Run lint, typecheck, and full test suite**

  ```bash
  nvm use 20 && pnpm lint && pnpm typecheck && pnpm test
  ```
  Expected: all pass with no errors or warnings across all packages.

- [ ] **Step 4: Commit**

  ```bash
  git add \
    packages/enforma/src/components/types.ts \
    packages/enforma/src/components/fields.tsx \
    packages/enforma/src/index.ts \
    packages/enforma-mui/src/components/Submit.tsx \
    packages/enforma-mui/src/components/Submit.test.tsx \
    packages/enforma-mui/src/index.ts
  git commit -m "feat(enforma): add Enforma.Submit component with formValid metadata"
  ```

---

### Task 7: Update HeroDemo and docs code snippet

**Files:**
- Modify: `apps/docs/src/components/HeroDemo.tsx`
- Modify: `apps/docs/src/pages/index.astro`

- [ ] **Step 1: Update HeroDemo.tsx**

  Replace the `<button>` element in `apps/docs/src/components/HeroDemo.tsx`:

  Before:
  ```tsx
  <button type="submit" style={{ marginTop: '0.5rem' }}>
    Submit
  </button>
  ```

  After:
  ```tsx
  <Enforma.Submit />
  ```

  Remove the `style={{ marginTop: '0.5rem' }}` — MUI `Button` has its own spacing. Add a `sx` prop if extra top margin is needed:
  ```tsx
  <Enforma.Submit />
  ```
  (MUI Button's default margin is sufficient here; check visually.)

- [ ] **Step 2: Update the hero code snippet in index.astro**

  In `apps/docs/src/pages/index.astro`, update the `heroCode` string to replace `<button type="submit">Submit</button>` with `<Enforma.Submit />`:

  Before:
  ```ts
  const heroCode = `
  <Enforma.Form values={values} onChange={setValues}>
    <Enforma.TextInput
      bind="name"
      label="Name"
      placeholder="Your name"
    />
    <Enforma.TextInput
      bind="email"
      label="Email"
      placeholder="your@email.com"
      disabled={({ name }) => !name}
    />
    <button type="submit">Submit</button>
  </Enforma.Form>
  `.trim();
  ```

  After:
  ```ts
  const heroCode = `
  <Enforma.Form values={values} onChange={setValues}>
    <Enforma.TextInput
      bind="name"
      label="Name"
      placeholder="Your name"
    />
    <Enforma.TextInput
      bind="email"
      label="Email"
      placeholder="your@email.com"
      disabled={({ name }) => !name}
    />
    <Enforma.Submit />
  </Enforma.Form>
  `.trim();
  ```

- [ ] **Step 3: Run lint, typecheck, and tests**

  ```bash
  nvm use 20 && pnpm lint && pnpm typecheck && pnpm test
  ```
  Expected: all pass with no errors or warnings.

- [ ] **Step 4: Commit**

  ```bash
  git add \
    apps/docs/src/components/HeroDemo.tsx \
    apps/docs/src/pages/index.astro
  git commit -m "feat(docs): use Enforma.Submit in HeroDemo"
  ```
