# Typed Form Values Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Type `onChange` and `onSubmit` at the `Form` boundary so users receive typed `values` via a discriminated union rather than `unknown`.

**Architecture:** Add `LooseValues<T>` (intermediate-state widening) and `OnChangeArg<TValues>` (discriminated union) to `types.ts`; make `Form` and `SubmitDisabledFn` generic; collapse `SubmitDispatch` from 3 args to 2; update all tests. The store remains untyped internally — `TValues` is a compile-time boundary only.

**Tech Stack:** TypeScript strict, React, Vitest, `@testing-library/react`

---

## Chunk 1: Types + Submit helper + SubmitDispatch

### Task 1: Add `LooseValues<T>` and `OnChangeArg<TValues>` to `types.ts`

Purely additive — no existing code breaks.

**Files:**
- Modify: `packages/enforma/src/components/types.ts`

- [ ] **Step 1: Add the two new types to `types.ts`**

  Insert after the `import` block at the top of the file, before `export type Reactive<T>`:

  ```ts
  export type LooseValues<T> = {
    [K in keyof T]?: T[K] extends Date
      ? Date | string | null | undefined
      : T[K] extends (infer U)[]
      ? (U extends Date ? Date | string | null | undefined : LooseValues<U>)[]
      : T[K] extends object
      ? LooseValues<T[K]>
      : T[K] | null | undefined;
  };

  export type OnChangeArg<TValues extends FormValues = FormValues> =
    | { values: TValues; isValid: true; errors: Record<string, string | null> }
    | { values: LooseValues<TValues>; isValid: false; errors: Record<string, string | null> };
  ```

- [ ] **Step 2: Verify no breakage**

  ```bash
  nvm use 20 && pnpm typecheck && pnpm lint
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add packages/enforma/src/components/types.ts
  git commit -m "feat(types): add LooseValues<T> and OnChangeArg<TValues>"
  ```

---

### Task 2: Update `SubmitDisabledFn`, `SubmitProps`, `helpers.ts`, `helpers.test.ts`, and `SubmitDispatch` in `fields.tsx`

`SubmitDisabledFn` signature changes from `(scopeValues, allValues, meta)` (3 args) to `(values, meta)` (2 args). Update types first, then fix all callsites.

> **Note:** `ValidationState` removal from `types.ts` and `index.ts` is intentionally deferred to Task 6 (Chunk 2). It cannot be removed until `Form.tsx` stops importing it (Task 3). Leaving the export in place through Chunk 1 causes no harm — the type still exists.

**Files:**
- Modify: `packages/enforma/src/components/types.ts`
- Modify: `packages/enforma/src/components/helpers.ts`
- Modify: `packages/enforma/src/components/helpers.test.ts`
- Modify: `packages/enforma/src/components/fields.tsx`

- [ ] **Step 1: Update `helpers.test.ts` to 2-arg signature**

  Replace both `(_, __, { formValid })` usages with `(_, { formValid })`:

  ```ts
  // Line 7 — explicit annotation test
  const fn: SubmitDisabledFn = (_, { formValid }) => !formValid;

  // Line 14 — inferred types test
  const fn = submitDisabled((_, { formValid }) => !formValid);
  ```

- [ ] **Step 2: Run tests — expect failures**

  ```bash
  nvm use 20 && pnpm test helpers.test.ts
  ```

  Expected: type errors / test failures because `SubmitDisabledFn` still has 3 args.

- [ ] **Step 3: Update `SubmitDisabledFn` and `SubmitProps` in `types.ts`**

  Replace lines 163–172 (the old `SubmitDisabledFn` and `SubmitProps`):

  ```ts
  export type SubmitDisabledFn<TValues extends FormValues = FormValues> = (
    values: LooseValues<TValues>,
    meta: { formValid: boolean },
  ) => boolean;

  export type SubmitProps<TValues extends FormValues = FormValues> = {
    children?: ReactNode;
    disabled?: boolean | SubmitDisabledFn<TValues>;
  };
  ```

- [ ] **Step 4: Update `helpers.ts` — make `submitDisabled` generic**

  Full file content:

  ```ts
  import type { FormValues } from '../store/FormStore';
  import type { SubmitDisabledFn } from './types';

  export function submitDisabled<TValues extends FormValues = FormValues>(
    fn: SubmitDisabledFn<TValues>,
  ): SubmitDisabledFn<TValues> {
    return fn;
  }
  ```

- [ ] **Step 5: Update `SubmitDispatch` in `fields.tsx`**

  The dispatch function currently reads `prefix` and `scopeValues` from the store. Those are no longer needed — `Submit` is always at the form root so `scopeValues === allValues`. Replace the entire function with the version below, then remove the now-unused `import type { FormValues } from '../store/FormStore'` import at line 45.

  Changes vs. current code: `prefix` removed from `useScope()` destructure; the `raw`/`scopeValues` block removed; `d(scopeValues, allValues, ...)` collapsed to `d(allValues, ...)`.

  **5a.** Inside `useSyncExternalStore`, the removed/changed lines for reference:

  ```ts
  // Remove these lines:
  const raw = store.getField(prefix);
  const scopeValues: FormValues =
    prefix === '' || raw === null || typeof raw !== 'object' ? allValues : (raw as FormValues);

  // ...and change the call from:
  const resolvedDisabled =
    typeof d === 'function' ? d(scopeValues, allValues, { formValid: fv }) : d;

  // to:
  const resolvedDisabled =
    typeof d === 'function' ? d(allValues, { formValid: fv }) : d;
  ```

  The full updated `SubmitDispatch` function (lines 773–810 replacement):

  ```ts
  function SubmitDispatch({ children = 'Submit', disabled }: SubmitProps) {
    const { store } = useScope();

    const disabledRef = React.useRef(disabled);
    disabledRef.current = disabled;

    const lastRef = React.useRef<{ disabled: boolean | undefined; formValid: boolean } | null>(null);

    const subscribe = React.useCallback((cb: () => void) => store.subscribe(cb), [store]);

    const snapshot = React.useSyncExternalStore(subscribe, () => {
      const allValues = store.getSnapshot();
      const fv = store.isValid();
      const d = disabledRef.current;
      const resolvedDisabled =
        typeof d === 'function' ? d(allValues, { formValid: fv }) : d;

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
    } as ResolvedSubmitProps);
  }
  ```

- [ ] **Step 6: Run tests and typecheck**

  ```bash
  nvm use 20 && pnpm test && pnpm typecheck && pnpm lint
  ```

  Expected: all pass.

- [ ] **Step 7: Commit**

  ```bash
  git add packages/enforma/src/components/types.ts \
          packages/enforma/src/components/helpers.ts \
          packages/enforma/src/components/helpers.test.ts \
          packages/enforma/src/components/fields.tsx
  git commit -m "feat(types): SubmitDisabledFn<TValues> collapses to 2 args; submitDisabled generic"
  ```

---

## Chunk 2: Form<TValues>, test updates, and export cleanup

### Task 3: Make `Form<TValues>` generic and update `Form.tsx`

**Files:**
- Modify: `packages/enforma/src/components/Form.tsx`

- [ ] **Step 1: Replace `Form.tsx` with the updated generic version**

  Full file:

  ```tsx
  import { useRef, useMemo, type ReactNode, type FormEvent } from 'react';
  import { FormStore, type FormValues } from '../store/FormStore';
  import { FormContext } from '../context/FormContext';
  import { FormSettingsContext } from '../context/FormSettingsContext';
  import { ScopeContext } from '../context/ScopeContext';
  import { DataSourceContext } from '../context/DataSourceContext';
  import type { DataSourceDefinition } from '../datasource/types';
  import { getComponent } from './registry';
  import type { LooseValues, OnChangeArg } from './types';

  const emptyMessages: Partial<Record<string, string>> = {};
  const emptyDataSources: Record<string, DataSourceDefinition<unknown>> = {};

  type FormProps<TValues extends FormValues = FormValues> = {
    values?: TValues;
    onChange?: (arg: OnChangeArg<TValues>) => void;
    onSubmit?: (arg: OnChangeArg<TValues>) => void;
    showErrors?: boolean;
    messages?: Partial<Record<string, string>>;
    children: ReactNode;
    'aria-label'?: string;
    dataSources?: Record<string, DataSourceDefinition<unknown>>;
  };

  export function Form<TValues extends FormValues = FormValues>({
    values,
    onChange,
    onSubmit,
    showErrors = false,
    messages = emptyMessages,
    children,
    'aria-label': ariaLabel = 'form',
    dataSources = emptyDataSources,
  }: FormProps<TValues>) {
    const onChangeRef = useRef<((arg: OnChangeArg<TValues>) => void) | undefined>(onChange);
    onChangeRef.current = onChange;

    const onSubmitRef = useRef<((arg: OnChangeArg<TValues>) => void) | undefined>(onSubmit);
    onSubmitRef.current = onSubmit;

    const storeRef = useRef<FormStore | null>(null);
    if (storeRef.current === null) {
      const store = new FormStore(values ?? {});
      store.subscribe(() => {
        const snapshot = store.getSnapshot();
        const isValid = store.isValid();
        const errors = store.getErrors();
        const arg: OnChangeArg<TValues> = isValid
          ? { values: snapshot as TValues, isValid: true, errors }
          : { values: snapshot as LooseValues<TValues>, isValid: false, errors };
        onChangeRef.current?.(arg);
      });
      storeRef.current = store;
    }

    const store = storeRef.current;
    const scopeValue = useMemo(() => ({ store, prefix: '' }), [store]);
    const formSettings = useMemo(() => ({ showErrors, messages }), [showErrors, messages]);

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      store.setSubmitted();
      const snapshot = store.getSnapshot();
      const isValid = store.isValid();
      const errors = store.getErrors();
      const arg: OnChangeArg<TValues> = isValid
        ? { values: snapshot as TValues, isValid: true, errors }
        : { values: snapshot as LooseValues<TValues>, isValid: false, errors };
      onSubmitRef.current?.(arg);
    };

    const FormWrap = getComponent('FormWrap');
    const wrappedChildren = FormWrap ? <FormWrap>{children}</FormWrap> : children;

    return (
      <DataSourceContext.Provider value={dataSources}>
        <FormContext.Provider value={store}>
          <FormSettingsContext.Provider value={formSettings}>
            <ScopeContext.Provider value={scopeValue}>
              <form aria-label={ariaLabel} onSubmit={handleSubmit}>
                {wrappedChildren}
              </form>
            </ScopeContext.Provider>
          </FormSettingsContext.Provider>
        </FormContext.Provider>
      </DataSourceContext.Provider>
    );
  }
  ```

- [ ] **Step 2: Run typecheck**

  ```bash
  nvm use 20 && pnpm typecheck
  ```

  Expected: type errors in `Form.test.tsx` and `constraints.test.tsx` — this is expected; we fix them next.

---

### Task 4: Update `Form.test.tsx`

The test file needs updates in three areas:
1. `onChange` callbacks passed as `setValues` (wrong type after API change)
2. `onChange` assertions that used 2 positional args
3. `onSubmit` assertions — `onSubmit` now always fires and receives `OnChangeArg`

**Files:**
- Modify: `packages/enforma/src/components/Form.test.tsx`

- [ ] **Step 1: Fix `onChange` in render isolation test (line ~152)**

  Change:

  ```tsx
  <Form values={values} onChange={setValues}>
  ```

  to:

  ```tsx
  <Form values={values} onChange={(arg) => setValues(arg.values as Record<string, unknown>)}>
  ```

  And in the second isolation test (line ~191), change:

  ```tsx
  <Form values={values1} onChange={setValues1}>
  ```

  to:

  ```tsx
  <Form values={values1} onChange={(arg) => setValues1(arg.values as Record<string, unknown>)}>
  ```

- [ ] **Step 2: Update `onSubmit` called-with-valid-form test**

  Change (line ~41):

  ```ts
  expect(onSubmit).toHaveBeenCalledWith({ name: 'Alice' });
  ```

  to:

  ```ts
  expect(onSubmit).toHaveBeenCalledWith(
    expect.objectContaining({ values: { name: 'Alice' }, isValid: true }),
  );
  ```

- [ ] **Step 3: Update "does not call onSubmit" test — `onSubmit` now always fires**

  The test at line ~44 currently asserts `onSubmit` is NOT called when there's a validation error. With the new behavior, `onSubmit` IS called but with `isValid: false`. Rename and update:

  ```ts
  it('calls onSubmit with isValid false when form has a validation error', async () => {
    const onSubmit = vi.fn();
    render(
      <Form values={{ name: '' }} onChange={vi.fn()} onSubmit={onSubmit}>
        <TextInput bind="name" label="Name" validate={(v) => (v === '' ? 'required' : null)} />
        <button type="submit">Submit</button>
      </Form>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ isValid: false }),
    );
  });
  ```

- [ ] **Step 4: Update `onChange` single-object-arg tests**

  There are several tests that called `onChange` with 2 positional args. Update each:

  **4a.** "passes isValid and errors as second argument" test (line ~73). Change description and assertion:

  ```ts
  it('passes values and isValid as a single object arg', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ name: '' }} onChange={onChange}>
        <TextInput bind="name" label="Name" validate={(v) => (v === '' ? 'required' : null)} />
      </Form>,
    );
    await userEvent.type(screen.getByLabelText('Name'), 'A');
    expect(onChange).toHaveBeenLastCalledWith({
      values: { name: 'A' },
      isValid: true,
      errors: { name: null },
    });
  });
  ```

  **4b.** The `typeValidator` `isValid=false` onChange test (line ~308):

  ```ts
  // Before:
  expect(onChange).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ isValid: false }),
  );

  // After:
  expect(onChange).toHaveBeenCalledWith(
    expect.objectContaining({ isValid: false }),
  );
  ```

  **4c.** The `DatePicker` `isValid=false` onChange test (line ~446):

  ```ts
  // Before:
  expect(onChange).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ isValid: false }),
  );

  // After:
  expect(onChange).toHaveBeenCalledWith(
    expect.objectContaining({ isValid: false }),
  );
  ```

  **4d.** The partial props `onChange` test (line ~603):

  ```ts
  // Before:
  expect(onChange).toHaveBeenLastCalledWith(
    { name: 'A' },
    expect.objectContaining({ isValid: true }),
  );

  // After:
  expect(onChange).toHaveBeenLastCalledWith(
    expect.objectContaining({ values: { name: 'A' }, isValid: true }),
  );
  ```

- [ ] **Step 5: Update uncontrolled `onSubmit` test (line ~530)**

  ```ts
  // Before:
  expect(onSubmit).toHaveBeenCalledWith({});

  // After:
  expect(onSubmit).toHaveBeenCalledWith(
    expect.objectContaining({ values: {}, isValid: true }),
  );
  ```

- [ ] **Step 6: Run tests**

  ```bash
  nvm use 20 && pnpm test Form.test.tsx
  ```

  Expected: all tests in `Form.test.tsx` pass.

---

### Task 5: Update `constraints.test.tsx`

Four `onSubmit` assertions need updating: `onSubmit` now fires even when the form has errors (with `isValid: false`).

**Files:**
- Modify: `packages/enforma/src/components/constraints.test.tsx`

- [ ] **Step 1: Update "blocks submit" tests to reflect new behavior**

  There are 3 tests with `expect(onSubmit).not.toHaveBeenCalled()` that relied on the old gate. Change each:

  **Test at line ~79** — rename and update assertion (keep the alert assertion):

  ```ts
  it('shows default validation message on submit when value is empty string', async () => {
    const onSubmit = vi.fn();
    render(
      <Form values={{ name: '' }} onChange={vi.fn()} onSubmit={onSubmit}>
        <TextInput bind="name" label="Name" required />
        <button type="submit">Submit</button>
      </Form>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ isValid: false }));
    expect(screen.getByRole('alert')).toHaveTextContent('This field is required');
  });
  ```

  **Test at line ~92** — update assertion (no alert check in original):

  ```ts
  it('shows validation error on submit when value is undefined', async () => {
    const onSubmit = vi.fn();
    render(
      <Form values={{}} onChange={vi.fn()} onSubmit={onSubmit}>
        <TextInput bind="name" label="Name" required />
        <button type="submit">Submit</button>
      </Form>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ isValid: false }));
  });
  ```

  **Test at line ~356** — rename and update assertion (keep the alert assertion):

  ```ts
  it('calls onSubmit with isValid false when required list is empty', async () => {
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
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ isValid: false }));
    expect(screen.getByRole('alert')).toHaveTextContent('This field is required');
  });
  ```

- [ ] **Step 2: Run all tests**

  ```bash
  nvm use 20 && pnpm test && pnpm typecheck && pnpm lint
  ```

  Expected: all tests pass, no type or lint errors.

- [ ] **Step 3: Commit Form.tsx + all test updates**

  ```bash
  git add packages/enforma/src/components/Form.tsx \
          packages/enforma/src/components/Form.test.tsx \
          packages/enforma/src/components/constraints.test.tsx
  git commit -m "feat(enforma): Form<TValues> generic; onChange/onSubmit use OnChangeArg; onSubmit always fires"
  ```

---

### Task 6: Remove `ValidationState`, update `index.ts` exports

`ValidationState` is now unused — `Form.tsx` no longer imports it. Remove it from `types.ts` and update the public exports.

**Files:**
- Modify: `packages/enforma/src/components/types.ts`
- Modify: `packages/enforma/src/index.ts`

- [ ] **Step 1: Remove `ValidationState` from `types.ts`**

  Delete lines 208–211 (the `ValidationState` type):

  ```ts
  // DELETE:
  export type ValidationState = {
    isValid: boolean;
    errors: Record<string, string | null>;
  };
  ```

- [ ] **Step 2: Update exports in `index.ts`**

  **2a.** Remove `ValidationState` from the export list (line 27).

  **2b.** Add `LooseValues` and `OnChangeArg` to the exports. The existing block that exports from `'./components/types'` — add both names:

  ```ts
  export type {
    Reactive,
    CommonProps,
    // ... existing exports ...
    LooseValues,
    OnChangeArg,
  } from './components/types';
  ```

  Note: `ValidationState` was in a separate named export block (line 27). Remove that line entirely. Add `LooseValues` and `OnChangeArg` to the first types export block (after `Reactive`, `CommonProps`, etc.).

- [ ] **Step 3: Run full check**

  ```bash
  nvm use 20 && pnpm test && pnpm typecheck && pnpm lint
  ```

  Expected: all pass.

- [ ] **Step 4: Commit**

  ```bash
  git add packages/enforma/src/components/types.ts \
          packages/enforma/src/index.ts
  git commit -m "feat(enforma): export LooseValues and OnChangeArg; remove ValidationState"
  ```
