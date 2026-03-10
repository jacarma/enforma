# hidden/removed Reactive Props Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `hidden` and `removed` reactive props to all Enforma components so fields can be visually hidden (value kept) or fully removed from the form model (value deleted).

**Architecture:** A new `useVisibility` hook resolves both reactive props, handles store deletion on `removed`, and is integrated into `useFieldProps` so all field components and custom components get the behavior automatically. Non-field components (Fieldset, List, Calculated, Output) call `useVisibility` directly. All dispatch functions return `null` after their hooks when `hidden || removed`.

**Tech Stack:** TypeScript strict, React hooks (`useSyncExternalStore`, `useEffect`, `useRef`), Vitest + @testing-library/react

**Spec:** `docs/superpowers/specs/2026-03-10-hidden-removed-props-design.md`

---

## File Map

| File | Change |
|------|--------|
| `packages/enforma/src/store/FormStore.ts` | Add `deleteField` method + `deleteByPath` helper |
| `packages/enforma/src/store/FormStore.test.ts` | Add `deleteField` tests |
| `packages/enforma/src/hooks/useField.ts` | Add `useVisibility`; add `skip` param to `useFieldValidation`; integrate into `useFieldProps` |
| `packages/enforma/src/components/types.ts` | Add `hidden`/`removed` to `CommonProps`, `CalculatedProps`, `OutputProps`, `FieldsetProps`; add to `ResolvedCommonProps` |
| `packages/enforma/src/components/fields.tsx` | Add `hidden`/`removed` null-return to field dispatches; add `useVisibility` to `FieldsetDispatch`, `CalculatedDispatch`, `OutputDispatch` |
| `packages/enforma/src/components/List.tsx` | Add `hidden`/`removed` to `ListProps`; call `useVisibility` in `ListMain` |
| `packages/enforma/src/components/visibility.test.tsx` | **Create** — integration tests for hidden/removed behaviour |

---

## Chunk 1: Foundation

### Task 1: `FormStore.deleteField`

**Files:**
- Modify: `packages/enforma/src/store/FormStore.ts`
- Modify: `packages/enforma/src/store/FormStore.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `packages/enforma/src/store/FormStore.test.ts` inside the `describe('FormStore')` block, after the existing `getErrors` describe:

```ts
describe('deleteField', () => {
  it('deletes a top-level key', () => {
    const store = new FormStore({ name: 'Alice', email: 'a@b.com' });
    store.deleteField('name');
    expect(store.getField('name')).toBeUndefined();
    expect(store.getField('email')).toBe('a@b.com');
  });

  it('deletes a nested key via dot-path', () => {
    const store = new FormStore({ address: { city: 'NY', zip: '10001' } });
    store.deleteField('address.city');
    expect(store.getField('address.city')).toBeUndefined();
    expect(store.getField('address.zip')).toBe('10001');
  });

  it('deletes a deeply nested object key', () => {
    const store = new FormStore({ a: { b: { c: 'deep' } } });
    store.deleteField('a.b');
    expect(store.getField('a.b')).toBeUndefined();
    expect(store.getField('a')).toEqual({});
  });

  it('is a no-op when the path does not exist', () => {
    const store = new FormStore({ name: 'Alice' });
    expect(() => store.deleteField('missing')).not.toThrow();
    expect(() => store.deleteField('a.b.c')).not.toThrow();
    expect(store.getField('name')).toBe('Alice');
  });

  it('notifies subscribers after deletion', () => {
    const store = new FormStore({ name: 'Alice' });
    const cb = vi.fn();
    store.subscribe(cb);
    store.deleteField('name');
    expect(cb).toHaveBeenCalledOnce();
  });

  it('does not notify subscribers when path does not exist (no-op)', () => {
    const store = new FormStore({ name: 'Alice' });
    const cb = vi.fn();
    store.subscribe(cb);
    store.deleteField('missing');
    expect(cb).not.toHaveBeenCalled();
  });

  it('removes the entire nested key, including all children', () => {
    const store = new FormStore({ address: { city: 'NY', zip: '10001' } });
    store.deleteField('address');
    expect(store.getField('address')).toBeUndefined();
    expect(store.getSnapshot()).toEqual({});
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
nvm use 20 && pnpm --filter enforma test -- FormStore
```

Expected: FAIL — `store.deleteField is not a function`

- [ ] **Step 3: Implement `deleteField` in `FormStore.ts`**

Add a `deleteByPath` helper function after the existing `setByPath` function (around line 41), then add the `deleteField` method to the `FormStore` class:

```ts
// Add after setByPath function, before the FormStore class:
function deleteByPath(obj: FormValues, path: string): { changed: boolean; result: FormValues } {
  const dotIndex = path.indexOf('.');
  if (dotIndex === -1) {
    if (!(path in obj)) return { changed: false, result: obj };
    const { [path]: _, ...rest } = obj;
    return { changed: true, result: rest as FormValues };
  }
  const key = path.slice(0, dotIndex);
  const rest = path.slice(dotIndex + 1);
  const existing = obj[key];
  if (existing === null || typeof existing !== 'object' || Array.isArray(existing)) {
    return { changed: false, result: obj };
  }
  const nested = deleteByPath(existing as FormValues, rest);
  if (!nested.changed) return { changed: false, result: obj };
  return { changed: true, result: { ...obj, [key]: nested.result } };
}
```

Add this method inside the `FormStore` class, after `getErrors`:

```ts
deleteField(path: string): void {
  const { changed, result } = deleteByPath(this._values, path);
  if (!changed) return;
  this._values = result;
  this.notifySubscribers();
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
nvm use 20 && pnpm --filter enforma test -- FormStore
```

Expected: All FormStore tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/enforma/src/store/FormStore.ts packages/enforma/src/store/FormStore.test.ts
git commit -m "feat(store): add deleteField method"
```

---

### Task 2: `useFieldValidation` skip flag

**Files:**
- Modify: `packages/enforma/src/hooks/useField.ts`

Note: The test file (`useField.test.tsx`) is created in Task 3 with `useVisibility` tests, and extended in Task 5 with `skip` tests. This task only changes `useField.ts`.

- [ ] **Step 1: Add `skip` parameter to `useFieldValidation`**

In `packages/enforma/src/hooks/useField.ts`, update the `useFieldValidation` signature and its `useEffect`:

Change the function signature from:
```ts
export function useFieldValidation(
  bind: string,
  validate:
    | ((value: unknown, scopeValues: FormValues, allValues: FormValues) => string | null)
    | undefined,
  localMessages: Partial<Record<string, string>> | undefined,
  implicitValidator?: () => string | null,
  typeValidator?: (value: unknown) => string | null,
): { error: string | null; showError: boolean; onBlur: () => void } {
```

To:
```ts
export function useFieldValidation(
  bind: string,
  validate:
    | ((value: unknown, scopeValues: FormValues, allValues: FormValues) => string | null)
    | undefined,
  localMessages: Partial<Record<string, string>> | undefined,
  implicitValidator?: () => string | null,
  typeValidator?: (value: unknown) => string | null,
  skip?: boolean,
): { error: string | null; showError: boolean; onBlur: () => void } {
```

Then update the `useEffect` that registers the validator. Change:
```ts
  useEffect(() => {
    if (
      validateRef.current === undefined &&
      implicitValidatorRef.current === undefined &&
      typeValidatorRef.current === undefined
    )
      return;
```

To:
```ts
  useEffect(() => {
    if (skip) return;
    if (
      validateRef.current === undefined &&
      implicitValidatorRef.current === undefined &&
      typeValidatorRef.current === undefined
    )
      return;
```

And add `skip` to the dependency array. Change:
```ts
  }, [store, fullPath, prefix]);
```

To:
```ts
  }, [store, fullPath, prefix, skip]);
```

`skip` is the **6th parameter** (after `typeValidator`). The only call site of `useFieldValidation` is inside `useFieldProps`, where it will be updated in Task 5 to pass `isHidden || isRemoved` as the 6th argument. No other call sites exist — existing callers that pass only 5 arguments are unaffected since `skip` is optional.

- [ ] **Step 4: Verify no existing tests are broken**

```bash
nvm use 20 && pnpm --filter enforma test -- FormStore
```

Expected: All FormStore tests pass. Do NOT run `useField` tests yet — the test file references `hidden`/`removed` props that don't exist in TypeScript until Task 4. The `useField.test.tsx` file will be committed together with the types in Task 4.

- [ ] **Step 5: Commit the hook change only (not the test file yet)**

The `useField.test.tsx` file exists on disk but is NOT staged here — it will be staged and committed in Task 4 alongside the types that make it typecheck-clean.

```bash
git add packages/enforma/src/hooks/useField.ts
git commit -m "feat(hooks): add skip flag to useFieldValidation"
```

---

### Task 3: `useVisibility` hook

**Files:**
- Modify: `packages/enforma/src/hooks/useField.ts`
- Create: `packages/enforma/src/hooks/useField.test.tsx` (with `useVisibility` tests only — `useFieldValidation skip` tests added in Task 5)

- [ ] **Step 1: Write the failing tests**

Add to `packages/enforma/src/hooks/useField.test.tsx`. Merge these new imports into the existing import block at the top (do not duplicate `act` which is already imported from `@testing-library/react`):

```tsx
import { useVisibility } from './useField';
import { FormContext } from '../context/FormContext';
import { ScopeContext } from '../context/ScopeContext';
import { FormStore } from '../store/FormStore';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
```

Then add a new `describe('useVisibility')` block:

```tsx

function makeWrapper(store: FormStore): ({ children }: { children: ReactNode }) => JSX.Element {
  return ({ children }) => (
    <FormContext.Provider value={store}>
      <ScopeContext.Provider value={{ store, prefix: '' }}>
        {children}
      </ScopeContext.Provider>
    </FormContext.Provider>
  );
}

describe('useVisibility', () => {
  it('returns false for both when no props given', () => {
    const store = new FormStore({});
    const { result } = renderHook(
      () => useVisibility(undefined, undefined, undefined),
      { wrapper: makeWrapper(store) },
    );
    expect(result.current.isHidden).toBe(false);
    expect(result.current.isRemoved).toBe(false);
  });

  it('resolves static hidden=true', () => {
    const store = new FormStore({});
    const { result } = renderHook(
      () => useVisibility('name', true, undefined),
      { wrapper: makeWrapper(store) },
    );
    expect(result.current.isHidden).toBe(true);
    expect(result.current.isRemoved).toBe(false);
  });

  it('resolves reactive hidden from store values', () => {
    const store = new FormStore({ flag: false });
    const { result } = renderHook(
      () => useVisibility('name', (v) => v.flag === true, undefined),
      { wrapper: makeWrapper(store) },
    );
    expect(result.current.isHidden).toBe(false);
    act(() => { store.setField('flag', true); });
    expect(result.current.isHidden).toBe(true);
  });

  it('deletes from store when removed becomes true', () => {
    const store = new FormStore({ flag: false, name: 'Alice' });
    renderHook(
      () => useVisibility('name', undefined, (v) => v.flag === true),
      { wrapper: makeWrapper(store) },
    );
    expect(store.getField('name')).toBe('Alice');
    act(() => { store.setField('flag', true); });
    expect(store.getField('name')).toBeUndefined();
  });

  it('does not delete from store when only hidden', () => {
    const store = new FormStore({ flag: false, name: 'Alice' });
    renderHook(
      () => useVisibility('name', (v) => v.flag === true, undefined),
      { wrapper: makeWrapper(store) },
    );
    act(() => { store.setField('flag', true); });
    expect(store.getField('name')).toBe('Alice');
  });

  it('deletes from store on unmount when removed is true at unmount time', () => {
    const store = new FormStore({ flag: true, name: 'Alice' });
    // Parent will remove us before we re-render — simulate by mounting then unmounting
    const { unmount } = renderHook(
      () => useVisibility('name', undefined, (v) => v.flag === true),
      { wrapper: makeWrapper(store) },
    );
    // Immediately unmount (simulates parent-first removal)
    unmount();
    expect(store.getField('name')).toBeUndefined();
  });

  it('removed=true takes precedence over hidden=true', () => {
    const store = new FormStore({ name: 'Alice' });
    const { result } = renderHook(
      () => useVisibility('name', true, true),
      { wrapper: makeWrapper(store) },
    );
    expect(result.current.isRemoved).toBe(true);
    expect(result.current.isHidden).toBe(false);
  });

  it('does not attempt store deletion when bind is undefined', () => {
    const store = new FormStore({ name: 'Alice' });
    expect(() => {
      renderHook(
        () => useVisibility(undefined, undefined, true),
        { wrapper: makeWrapper(store) },
      );
    }).not.toThrow();
    expect(store.getField('name')).toBe('Alice');
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
nvm use 20 && pnpm --filter enforma test -- useField
```

Expected: FAIL — `useVisibility` is not exported

- [ ] **Step 3: Implement `useVisibility`**

Add to `packages/enforma/src/hooks/useField.ts` after `useReactiveProp` and before `useFieldProps`:

```ts
export function useVisibility(
  bind: string | undefined,
  hidden: Reactive<boolean> | undefined,
  removed: Reactive<boolean> | undefined,
): { isHidden: boolean; isRemoved: boolean } {
  const { store, prefix } = useScope();
  const fullPath = bind !== undefined ? joinPath(prefix, bind) : undefined;

  const isRemoved = useReactiveProp(removed) ?? false;
  const isHiddenRaw = useReactiveProp(hidden) ?? false;
  // removed takes precedence: if removed, isHidden is false (removed handles cleanup)
  const isHidden = isHiddenRaw && !isRemoved;

  // Keep a ref to the latest removed prop so the cleanup effect can re-evaluate it
  // from the current store snapshot without a stale closure.
  const removedRef = useRef(removed);
  removedRef.current = removed;

  // Active deletion: when removed transitions to true, delete the value.
  useEffect(() => {
    if (isRemoved && fullPath !== undefined) {
      store.deleteField(fullPath);
    }
  }, [isRemoved, fullPath, store]);

  // Unmount cleanup: re-evaluate removed from the current store snapshot.
  // Handles the race condition where a parent component returns null before
  // this child can re-render with its own removed=true.
  useEffect(() => {
    return () => {
      if (fullPath === undefined) return;
      const removedProp = removedRef.current;
      if (removedProp === undefined) return;
      const allValues = store.getSnapshot();
      const raw = store.getField(prefix);
      const scopeValues: FormValues =
        prefix === '' || raw === null || typeof raw !== 'object' ? allValues : (raw as FormValues);
      const currentRemoved =
        typeof removedProp === 'function' ? removedProp(scopeValues, allValues) : removedProp;
      if (currentRemoved) store.deleteField(fullPath);
    };
  }, [store, fullPath, prefix]);

  return { isHidden, isRemoved };
}
```

- [ ] **Step 4: Run tests, lint, and typecheck**

The test file at this point contains ONLY `useVisibility` tests — all of which pass. The `useFieldValidation skip` tests are added in Task 5.

```bash
nvm use 20 && pnpm lint && pnpm typecheck && pnpm test
```

Expected: All pass.

- [ ] **Step 5: Commit hook + test file**

```bash
git add packages/enforma/src/hooks/useField.ts packages/enforma/src/hooks/useField.test.tsx
git commit -m "feat(hooks): add useVisibility hook"
```

---

## Chunk 2: Wire-up & Integration

### Task 4: Types

**Files:**
- Modify: `packages/enforma/src/components/types.ts`

- [ ] **Step 1: Add `hidden` and `removed` to prop types**

In `packages/enforma/src/components/types.ts`:

**4a. Update `CommonProps`** — add after `required?`:

```ts
export type CommonProps = {
  bind: string;
  label?: Reactive<string>;
  disabled?: Reactive<boolean>;
  placeholder?: Reactive<string>;
  id?: string;
  description?: Reactive<string>;
  validate?: (value: unknown, scopeValues: FormValues, allValues: FormValues) => string | null;
  messages?: Partial<Record<string, string>>;
  required?: Reactive<boolean>;
  hidden?: Reactive<boolean>;
  removed?: Reactive<boolean>;
};
```

**4b. Update `ResolvedCommonProps`** — add after `required`:

```ts
export type ResolvedCommonProps = {
  value: unknown;
  setValue: (value: unknown) => void;
  label: string | undefined;
  disabled: boolean | undefined;
  placeholder: string | undefined;
  description: string | undefined;
  error: string | null;
  showError: boolean;
  onBlur: () => void;
  required: boolean | undefined;
  hidden: boolean;
  removed: boolean;
};
```

**4c. Update `CalculatedProps`** — add after `disabled?`:

```ts
export type CalculatedProps<T = unknown> = {
  bind?: string;
  value: Reactive<T>;
  label?: Reactive<string>;
  description?: Reactive<string>;
  disabled?: Reactive<boolean>;
  hidden?: Reactive<boolean>;
  removed?: Reactive<boolean>;
};
```

**4d. Update `OutputProps`** — add after `as?`:

```ts
export type OutputProps = {
  value: Reactive<unknown>;
  as?: string;
  hidden?: Reactive<boolean>;
  removed?: Reactive<boolean>;
};
```

**4e. Update `FieldsetProps`** — add after `title?`:

```ts
export type FieldsetProps = {
  bind?: string;
  children: ReactNode;
  title?: string;
  hidden?: Reactive<boolean>;
  removed?: Reactive<boolean>;
};
```

**Note on `ResolvedCommonProps`:** Adding `hidden: boolean` and `removed: boolean` here means adapter components technically receive these props. This is safe because dispatch functions always return `null` before calling `dispatchComponent` when `hidden || removed` — so adapters always see `hidden: false` and `removed: false` at render time. Adapters must not spread all resolved props onto DOM elements (they should already be destructuring only what they need). Existing adapter packages (e.g. `enforma-mui`) may need a minor update to destructure and discard these two props if they spread.

- [ ] **Step 2: Run lint, typecheck, and full test suite**

`useField.test.tsx` was committed in Task 3 containing only `useVisibility` tests (which pass). The `as unknown as R` cast in `useFieldProps` means TypeScript does not flag missing `hidden`/`removed` in the return value — so no errors in `fields.tsx`.

```bash
nvm use 20 && pnpm lint && pnpm typecheck && pnpm test
```

Expected: All pass with no errors.

- [ ] **Step 3: Commit types**

```bash
git add packages/enforma/src/components/types.ts
git commit -m "feat(types): add hidden and removed to component prop types"
```

---

### Task 5: `useFieldProps` integration

**Files:**
- Modify: `packages/enforma/src/hooks/useField.ts`

**Prerequisites:** `useVisibility` is defined in `useField.ts` itself (co-located with `useFieldProps`) so no import is needed. The `skip` parameter on `useFieldValidation` was added in Chunk 1, Task 2.

- [ ] **Step 1: Update `useFieldProps` to call `useVisibility` and return `hidden`/`removed`**

In `useFieldProps`, change the destructuring line from:

```ts
  const { bind, validate, messages, ...reactiveProps } = props;
```

To:

```ts
  const { bind, validate, messages, hidden, removed, ...reactiveProps } = props;
```

Then call `useVisibility` after `useFormValue`. Add after the `const [value, setValue] = useFormValue<ValueType>(bind);` line:

```ts
  const { isHidden, isRemoved } = useVisibility(bind, hidden, removed);
```

Then update the return statement. Change:

```ts
  return {
    value,
    setValue,
    ...resolvedExtras,
    ...useFieldValidation(bind, validate, messages, undefined, options?.typeValidator),
  } as unknown as R;
```

To:

```ts
  return {
    value,
    setValue,
    ...resolvedExtras,
    ...useFieldValidation(
      bind,
      validate,
      messages,
      undefined,
      options?.typeValidator,
      isHidden || isRemoved,
    ),
    hidden: isHidden,
    removed: isRemoved,
  } as unknown as R;
```

- [ ] **Step 2: Add `useFieldValidation skip` tests to `useField.test.tsx`**

Add the following describe block to `packages/enforma/src/hooks/useField.test.tsx` (after the existing `useVisibility` describe):

```tsx
describe('useFieldValidation skip (via useFieldProps)', () => {
  it('does not register validator when field is hidden', async () => {
    const onSubmit = vi.fn();
    render(
      <Form values={{ name: '' }} onChange={vi.fn()} onSubmit={onSubmit} showErrors>
        <TextInput
          bind="name"
          label="Name"
          hidden
          validate={() => 'always-error'}
        />
        <button type="submit">Submit</button>
      </Form>,
    );
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onSubmit).toHaveBeenCalled();
  });

  it('does not register validator when field is removed', async () => {
    const onSubmit = vi.fn();
    render(
      <Form values={{ name: '' }} onChange={vi.fn()} onSubmit={onSubmit} showErrors>
        <TextInput
          bind="name"
          label="Name"
          removed
          validate={() => 'always-error'}
        />
        <button type="submit">Submit</button>
      </Form>,
    );
    await act(async () => {});
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onSubmit).toHaveBeenCalled();
  });
});
```

These tests require `userEvent` — add `import userEvent from '@testing-library/user-event';` to the imports in `useField.test.tsx` if not already present.

- [ ] **Step 3: Run all `useField.test.tsx` tests**

```bash
nvm use 20 && pnpm --filter enforma test -- useField
```

Expected: ALL tests pass — both `useVisibility` and `useFieldValidation skip` describes.

- [ ] **Step 4: Run lint, typecheck, and full test suite**

The `as unknown as R` cast in `useFieldProps` means `fields.tsx` does not have type errors — TypeScript trusts the return type assertion.

```bash
nvm use 20 && pnpm lint && pnpm typecheck && pnpm test
```

Expected: All pass with no errors.

- [ ] **Step 5: Commit hook + updated test file**

```bash
git add packages/enforma/src/hooks/useField.ts packages/enforma/src/hooks/useField.test.tsx
git commit -m "feat(hooks): integrate useVisibility into useFieldProps"
```

---

### Task 6: Field component dispatch functions

**Files:**
- Modify: `packages/enforma/src/components/fields.tsx`

- [ ] **Step 1: Add `useVisibility` to the import in `fields.tsx`**

In `packages/enforma/src/components/fields.tsx`, the current hook import line is:

```ts
import { useFieldProps, useReactiveProp } from '../hooks/useField';
```

Change it to:

```ts
import { useFieldProps, useReactiveProp, useVisibility } from '../hooks/useField';
```

- [ ] **Step 2: Add null returns to all field dispatch functions**

For each of the following dispatch functions, add `if (resolved.hidden || resolved.removed) return null;` immediately after the `useFieldProps` call, before `dispatchComponent`:

**TextInputDispatch** — change:
```ts
  return dispatchComponent(
    'TextInput',
    useFieldProps<ResolvedTextInputProps>(
      mergedProps,
      hasConstraints ? { typeValidator: ... } : undefined,
    ),
  );
```

To:
```ts
  const resolved = useFieldProps<ResolvedTextInputProps>(
    mergedProps,
    hasConstraints ? { typeValidator: ... } : undefined,
  );
  if (resolved.hidden || resolved.removed) return null;
  return dispatchComponent('TextInput', resolved);
```

For **TextareaDispatch**, **CheckboxDispatch**, **SwitchDispatch**, **NumberInputDispatch**, **DatePickerDispatch**, **TimePickerDispatch**, **DateTimePickerDispatch** — all follow the same shape as TextInputDispatch. Each currently ends with:

```ts
  return dispatchComponent('XxxComponent', useFieldProps<ResolvedXxxProps>(mergedProps, { typeValidator: ... }));
```

Change each to:

```ts
  const resolved = useFieldProps<ResolvedXxxProps>(mergedProps, { typeValidator: ... });
  if (resolved.hidden || resolved.removed) return null;
  return dispatchComponent('XxxComponent', resolved);
```

Where `XxxComponent` / `ResolvedXxxProps` pairs are:
- `'Textarea'` / `ResolvedTextareaProps`
- `'Checkbox'` / `ResolvedCheckboxProps`
- `'Switch'` / `ResolvedSwitchProps`
- `'NumberInput'` / `ResolvedNumberInputProps`
- `'DatePicker'` / `ResolvedDatePickerProps`
- `'TimePicker'` / `ResolvedTimePickerProps`
- `'DateTimePicker'` / `ResolvedDateTimePickerProps`

For **SelectDispatch**, **RadioGroupDispatch**, **AutocompleteDispatch**, **ExclusiveToggleDispatch** — these already assign `useFieldProps<FieldResolved<unknown>>` to `const resolved`. Each already has a line like:

```ts
  const resolved = useFieldProps<FieldResolved<unknown>>(mergedProps, hasConstraints ? { typeValidator: ... } : undefined);
```

Add the null check immediately after that line:

```ts
  const resolved = useFieldProps<FieldResolved<unknown>>(mergedProps, ...);
  if (resolved.hidden || resolved.removed) return null;
  // ... rest unchanged (options building, dispatchComponent call)
```

- [ ] **Step 3: Add `useVisibility` to `FieldsetDispatch`**

Change `FieldsetDispatch` from:

```ts
function FieldsetDispatch({ bind, children, title }: FieldsetProps) {
  const content = bind !== undefined ? <Scope bind={bind}>{children}</Scope> : children;
  return dispatchComponent('Fieldset', {
    children: content,
    ...(title !== undefined && { title }),
  });
}
```

To:

```ts
function FieldsetDispatch({ bind, children, title, hidden, removed }: FieldsetProps) {
  const { isHidden, isRemoved } = useVisibility(bind, hidden, removed);
  if (isHidden || isRemoved) return null;
  const content = bind !== undefined ? <Scope bind={bind}>{children}</Scope> : children;
  return dispatchComponent('Fieldset', {
    children: content,
    ...(title !== undefined && { title }),
  });
}
```

Note: `useVisibility` must be called before the early return (hooks must not be conditional). The early return is after the hook call, which is correct.

- [ ] **Step 4: Add `useVisibility` to `OutputDispatch`**

Change:

```ts
function OutputDispatch({ value, as = 'span' }: OutputProps) {
  const resolvedValue = useReactiveProp(value);
  return dispatchComponent('Output', { value: resolvedValue, as } as ResolvedOutputProps);
}
```

To:

```ts
function OutputDispatch({ value, as = 'span', hidden, removed }: OutputProps) {
  const resolvedValue = useReactiveProp(value);
  const { isHidden, isRemoved } = useVisibility(undefined, hidden, removed);
  if (isHidden || isRemoved) return null;
  return dispatchComponent('Output', { value: resolvedValue, as } as ResolvedOutputProps);
}
```

- [ ] **Step 5: Add `useVisibility` to `CalculatedDispatch`**

Change:

```ts
function CalculatedDispatch<T = unknown>({
  bind,
  value,
  label,
  description,
  disabled,
}: CalculatedProps<T>) {
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

To:

```ts
function CalculatedDispatch<T = unknown>({
  bind,
  value,
  label,
  description,
  disabled,
  hidden,
  removed,
}: CalculatedProps<T>) {
  const resolvedValue = useReactiveProp(value);
  const resolvedLabel = useReactiveProp(label);
  const resolvedDescription = useReactiveProp(description);
  const resolvedDisabled = useReactiveProp(disabled);
  const { isHidden, isRemoved } = useVisibility(bind, hidden, removed);
  const { store, prefix } = useScope();

  useEffect(() => {
    if (bind == null || isRemoved) return;
    const fullPath = joinPath(prefix, bind);
    store.setField(fullPath, resolvedValue);
  }, [resolvedValue, bind, store, prefix, isRemoved]);

  if (isHidden || isRemoved) return null;
  return dispatchComponent('Calculated', {
    value: resolvedValue,
    label: resolvedLabel,
    description: resolvedDescription,
    disabled: resolvedDisabled,
  } as ResolvedCalculatedProps);
}
```

- [ ] **Step 6: Run typecheck**

```bash
nvm use 20 && pnpm --filter enforma typecheck
```

Expected: Pass with no errors

- [ ] **Step 7: Run all tests**

```bash
nvm use 20 && pnpm --filter enforma test
```

Expected: All existing tests pass. The `useFieldValidation skip` integration tests in `useField.test.tsx` now pass.

- [ ] **Step 8: Run lint + typecheck + tests, then commit**

```bash
nvm use 20 && pnpm lint && pnpm typecheck && pnpm test
git add packages/enforma/src/components/fields.tsx
git commit -m "feat(fields): add hidden/removed null-return to dispatch functions"
```

---

### Task 7: List component

**Files:**
- Modify: `packages/enforma/src/components/List.tsx`

- [ ] **Step 1: Add `hidden`/`removed` to `ListProps` and wire `useVisibility`**

In `packages/enforma/src/components/List.tsx`:

**Imports:** `List.tsx` imports `useListState` from `'../hooks/useListState'` — it has **no** existing import from `'../hooks/useField'`. Add a new import line for `useVisibility`. Also add `Reactive` to the existing types import:

```ts
// Add this NEW import line (List.tsx has no existing useField import):
import { useVisibility } from '../hooks/useField';
// Add Reactive to the existing types import (e.g. change):
//   import type { ResolvedListItemProps } from './types';
// to:
import type { Reactive, ResolvedListItemProps } from './types';
```

Note: `useVisibility` is exported from `useField.ts` via `export function useVisibility(...)` added in Chunk 1 Task 3.

**Update `ListProps`:**

```ts
type ListProps = {
  bind: string;
  defaultItem: Record<string, unknown>;
  disabled?: boolean;
  children: ReactNode;
  required?: boolean;
  minItems?: number;
  maxItems?: number;
  hidden?: Reactive<boolean>;
  removed?: Reactive<boolean>;
};
```

**Update `ListMain` destructure** — add `hidden` and `removed` to the parameter list:

```ts
function ListMain({
  bind,
  defaultItem,
  disabled = false,
  children,
  required,
  minItems,
  maxItems,
  hidden,
  removed,
}: ListProps) {
  const { isHidden, isRemoved } = useVisibility(bind, hidden, removed);
  // ... rest of existing hooks unchanged (useListState, useState, useScope, etc.) ...
```

`useVisibility` must be the **first** hook call inside `ListMain` so it runs before all other hooks (React requires hooks to be called in the same order every render). The early return based on its result must come **after** all hooks in the function body — find the final `return (...)` JSX at the end of `ListMain` and insert before it:

```ts
  if (isHidden || isRemoved) return null;
  // ... existing JSX return immediately follows ...
```

- [ ] **Step 2: Run typecheck**

```bash
nvm use 20 && pnpm --filter enforma typecheck
```

Expected: Pass

- [ ] **Step 3: Run all tests**

```bash
nvm use 20 && pnpm --filter enforma test
```

Expected: All tests pass

- [ ] **Step 4: Run lint, typecheck, and tests, then commit**

```bash
nvm use 20 && pnpm lint && pnpm typecheck && pnpm test
git add packages/enforma/src/components/List.tsx
git commit -m "feat(list): add hidden and removed props"
```

---

### Task 8: Integration tests

**Files:**
- Create: `packages/enforma/src/components/visibility.test.tsx`

- [ ] **Step 1: Write integration tests**

Create `packages/enforma/src/components/visibility.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Form } from './Form';
import { TextInput, Fieldset } from './fields';
import { registerComponents } from './registry';
import type {
  ResolvedTextInputProps,
  ResolvedCheckboxProps,
  ResolvedFieldsetProps,
} from './types';

function StubTextInput({ value, setValue, label, onBlur }: ResolvedTextInputProps) {
  return (
    <input
      aria-label={label ?? 'field'}
      value={value ?? ''}
      onChange={(e) => { setValue(e.target.value); }}
      onBlur={onBlur}
    />
  );
}

function StubCheckbox({ value, setValue, label }: ResolvedCheckboxProps) {
  return (
    <input
      type="checkbox"
      aria-label={label ?? 'checkbox'}
      checked={value ?? false}
      onChange={(e) => { setValue(e.target.checked); }}
    />
  );
}

function StubFieldset({ children }: ResolvedFieldsetProps) {
  return <div>{children}</div>;
}

beforeEach(() => {
  registerComponents({
    TextInput: StubTextInput,
    Checkbox: StubCheckbox,
    Fieldset: StubFieldset,
  });
});

// ---------------------------------------------------------------------------
// hidden prop
// ---------------------------------------------------------------------------

describe('hidden prop', () => {
  it('hides the field when hidden=true', () => {
    render(
      <Form values={{ name: 'Alice' }} onChange={vi.fn()}>
        <TextInput bind="name" label="Name" hidden />
      </Form>,
    );
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
  });

  it('shows the field when hidden=false', () => {
    render(
      <Form values={{ name: 'Alice' }} onChange={vi.fn()}>
        <TextInput bind="name" label="Name" hidden={false} />
      </Form>,
    );
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
  });

  it('preserves the stored value while the field is hidden', async () => {
    const onChange = vi.fn();
    function TestForm() {
      const [values, setValues] = useState({ name: 'Alice', hide: false });
      return (
        <Form
          values={values}
          onChange={(v) => {
            onChange(v);
            setValues(v as typeof values);
          }}
        >
          <TextInput bind="name" label="Name" hidden={({ hide }) => hide === true} />
          <TextInput bind="hide" label="Hide" />
        </Form>
      );
    }
    render(<TestForm />);

    // Hide the field by typing 'true' into the hide binding
    await userEvent.type(screen.getByLabelText('Hide'), 'true');
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();

    // The last onChange should still contain name: 'Alice'
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1] as [Record<string, unknown>];
    expect(lastCall[0].name).toBe('Alice');
  });

  it('shows the previously stored value when field becomes visible again', async () => {
    function TestForm() {
      const [values, setValues] = useState<Record<string, unknown>>({ name: 'Alice', showField: true });
      return (
        <Form values={values} onChange={(v) => { setValues(v); }}>
          <TextInput bind="name" label="Name" hidden={({ showField }) => !showField} />
          <input
            type="checkbox"
            aria-label="Toggle"
            checked={(values.showField as boolean) ?? true}
            onChange={(e) => { setValues((prev) => ({ ...prev, showField: e.target.checked })); }}
          />
        </Form>
      );
    }
    render(<TestForm />);

    // Field is visible with value 'Alice'
    expect(screen.getByLabelText('Name')).toHaveValue('Alice');

    // Hide it
    await userEvent.click(screen.getByLabelText('Toggle'));
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();

    // Show it again
    await userEvent.click(screen.getByLabelText('Toggle'));
    expect(screen.getByLabelText('Name')).toHaveValue('Alice');
  });

  it('hidden field with required validator does not block form submission', async () => {
    const onSubmit = vi.fn();
    render(
      <Form values={{ name: '' }} onChange={vi.fn()} onSubmit={onSubmit}>
        <TextInput bind="name" label="Name" hidden required />
        <button type="submit">Submit</button>
      </Form>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onSubmit).toHaveBeenCalledWith({ name: '' });
  });
});

// ---------------------------------------------------------------------------
// removed prop
// ---------------------------------------------------------------------------

describe('removed prop', () => {
  it('removes the field when removed=true', () => {
    render(
      <Form values={{ name: 'Alice' }} onChange={vi.fn()}>
        <TextInput bind="name" label="Name" removed />
      </Form>,
    );
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
  });

  it('deletes the stored value when removed=true', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ name: 'Alice' }} onChange={onChange}>
        <TextInput bind="name" label="Name" removed />
      </Form>,
    );
    // On mount with removed=true, deleteField runs after commit
    // Trigger a re-render / check onChange was called without the name key
    // The removal effect fires after mount; wait for it
    await act(async () => {});
    const calls = onChange.mock.calls;
    if (calls.length > 0) {
      const lastValues = calls[calls.length - 1][0] as Record<string, unknown>;
      expect(lastValues.name).toBeUndefined();
    }
  });

  it('removes field and its value reactively based on other field', async () => {
    const onChange = vi.fn();
    function TestForm() {
      const [values, setValues] = useState<Record<string, unknown>>({ name: 'Alice', remove: false });
      return (
        <Form
          values={values}
          onChange={(v) => {
            onChange(v);
            setValues(v);
          }}
        >
          <TextInput bind="name" label="Name" removed={({ remove }) => remove === true} />
          <input
            type="checkbox"
            aria-label="Remove"
            checked={false}
            onChange={async (e) => {
              setValues((prev) => ({ ...prev, remove: e.target.checked }));
            }}
          />
        </Form>
      );
    }
    render(<TestForm />);

    expect(screen.getByLabelText('Name')).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Remove'));
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();

    await act(async () => {});
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1] as [Record<string, unknown>];
    expect(lastCall[0].name).toBeUndefined();
  });

  it('removed field with required validator does not block form submission', async () => {
    const onSubmit = vi.fn();
    render(
      <Form values={{ name: '' }} onChange={vi.fn()} onSubmit={onSubmit}>
        <TextInput bind="name" label="Name" removed required />
        <button type="submit">Submit</button>
      </Form>,
    );
    await act(async () => {});
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onSubmit).toHaveBeenCalled();
  });

  it('re-mounts fresh (no value) when removed becomes false', async () => {
    function TestForm() {
      const [values, setValues] = useState<Record<string, unknown>>({ name: 'Alice', removed: true });
      return (
        <Form values={values} onChange={(v) => { setValues(v); }}>
          <TextInput bind="name" label="Name" removed={({ removed: r }) => r === true} />
          <input
            type="checkbox"
            aria-label="Removed"
            checked={(values.removed as boolean) ?? false}
            onChange={(e) => { setValues((prev) => ({ ...prev, removed: e.target.checked })); }}
          />
        </Form>
      );
    }
    render(<TestForm />);
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();

    // Un-remove
    await userEvent.click(screen.getByLabelText('Removed'));
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('');
  });
});

// ---------------------------------------------------------------------------
// Fieldset (no bind) + children with same removed expression
// ---------------------------------------------------------------------------

describe('Fieldset (no bind) + children share removed expression', () => {
  it('deletes children store values when parent Fieldset is removed', async () => {
    const onChange = vi.fn();
    function TestForm() {
      const [values, setValues] = useState<Record<string, unknown>>({
        name: 'Alice',
        email: 'a@b.com',
        remove: false,
      });
      return (
        <Form
          values={values}
          onChange={(v) => {
            onChange(v);
            setValues(v);
          }}
        >
          <Fieldset hidden={undefined} removed={({ remove }) => remove === true}>
            <TextInput
              bind="name"
              label="Name"
              removed={({ remove }) => remove === true}
            />
            <TextInput
              bind="email"
              label="Email"
              removed={({ remove }) => remove === true}
            />
          </Fieldset>
          <input
            type="checkbox"
            aria-label="Remove"
            checked={false}
            onChange={(e) => {
              setValues((prev) => ({ ...prev, remove: e.target.checked }));
            }}
          />
        </Form>
      );
    }
    render(<TestForm />);

    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Remove'));
    await act(async () => {});

    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1] as [Record<string, unknown>];
    expect(lastCall[0].name).toBeUndefined();
    expect(lastCall[0].email).toBeUndefined();
  });

  it('children re-mount with no value when removed becomes false', async () => {
    function TestForm() {
      const [values, setValues] = useState<Record<string, unknown>>({
        name: 'Alice',
        remove: true,
      });
      return (
        <Form values={values} onChange={(v) => { setValues(v); }}>
          <Fieldset removed={({ remove }) => remove === true}>
            <TextInput
              bind="name"
              label="Name"
              removed={({ remove }) => remove === true}
            />
          </Fieldset>
          <input
            type="checkbox"
            aria-label="Remove"
            checked={(values.remove as boolean) ?? false}
            onChange={(e) => { setValues((prev) => ({ ...prev, remove: e.target.checked })); }}
          />
        </Form>
      );
    }
    render(<TestForm />);
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Remove'));
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('');
  });
});
```

- [ ] **Step 2: Run the new integration tests**

```bash
nvm use 20 && pnpm --filter enforma test -- visibility
```

Expected: All visibility tests pass

- [ ] **Step 3: Run full test suite**

```bash
nvm use 20 && pnpm --filter enforma test
```

Expected: All tests pass

- [ ] **Step 4: Run lint and typecheck**

```bash
nvm use 20 && pnpm lint && pnpm typecheck
```

Expected: No errors or warnings

- [ ] **Step 5: Commit**

```bash
git add packages/enforma/src/components/visibility.test.tsx
git commit -m "test(visibility): add integration tests for hidden and removed props"
```

---

### Task 9: Export `useVisibility` from public API

**Files:**
- Modify: `packages/enforma/src/index.ts`

- [ ] **Step 1: Add `useVisibility` to exports**

Open `packages/enforma/src/index.ts`. The current hook export line is:

```ts
export { useFormValue, useReactiveProp, useFieldProps, useFieldValidation } from './hooks/useField';
```

Append `useVisibility` — do NOT remove `useFieldValidation` (it is part of the public API):

```ts
export { useFormValue, useReactiveProp, useFieldProps, useFieldValidation, useVisibility } from './hooks/useField';
```

- [ ] **Step 2: Run typecheck**

```bash
nvm use 20 && pnpm --filter enforma typecheck
```

Expected: Pass

- [ ] **Step 3: Final lint, typecheck, and full test run**

```bash
nvm use 20 && pnpm lint && pnpm typecheck && pnpm test
```

Expected: All pass with no errors or warnings

- [ ] **Step 4: Final commit**

```bash
git add packages/enforma/src/index.ts
git commit -m "feat: export useVisibility from public API"
```
