# enforma Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Clean up packages/enforma for clarity, cohesion, and a sharp public API — no behavior changes.

**Architecture:** Eleven tasks in order of dependency. Tasks 1–9 are small targeted fixes (exports, names, dead code). Task 10 is the main structural change: splitting `ScopeContext.ts` into scope primitives + field hooks. Task 11 adds clarifying comments. Each task ends with `pnpm lint && pnpm test` at the workspace root to catch regressions immediately. Changes to `enforma` that rename exports must also update `packages/enforma-mui` in the same commit.

**Tech Stack:** TypeScript, React 18, Vite library mode, Vitest, ESLint 9 flat config.

---

## Task 1: Fix duplicate `useFieldValidation` export in `index.ts`

**Files:**
- Modify: `packages/enforma/src/index.ts`

**Context:** `useFieldValidation` appears in two separate export statements from the same source file. Merge into one block.

**Step 1: Make the edit**

In `packages/enforma/src/index.ts`, the end of the file currently has:

```ts
export {
  useFormValue,
  useReactiveProp,
  useComponentProps,
  ScopeContext,
  extendPrefix,
  type ScopeValue,
} from './context/ScopeContext';
export { useFieldValidation } from './context/ScopeContext';
```

Change to (one block):

```ts
export {
  useFormValue,
  useReactiveProp,
  useComponentProps,
  useFieldValidation,
  ScopeContext,
  extendPrefix,
  type ScopeValue,
} from './context/ScopeContext';
```

**Step 2: Verify**

```bash
pnpm --filter enforma lint && pnpm --filter enforma test
```

Expected: all pass.

**Step 3: Commit**

```bash
git add packages/enforma/src/index.ts
git commit -m "fix: consolidate duplicate useFieldValidation export in index.ts"
```

---

## Task 2: Add named exports for `Scope` and `List`; remove `getComponent` from public API

**Files:**
- Modify: `packages/enforma/src/index.ts`

**Context:** `Form` is exported both via the `Enforma` namespace and as a named export. `Scope` and `List` are only accessible via `Enforma.Scope` / `Enforma.List` — inconsistent. Fix that. Also remove `getComponent` (internal dispatch mechanism, not part of the intended public API; not used by any consumer outside this package).

**Step 1: Make the edit**

Change:
```ts
export { Form };
```

To:
```ts
export { Form, Scope, List };
```

And change:
```ts
export { registerComponents, getComponent, clearRegistry } from './components/registry';
```

To:
```ts
export { registerComponents, clearRegistry } from './components/registry';
```

**Step 2: Verify**

```bash
pnpm lint && pnpm test
```

Expected: all pass. (No consumer uses `getComponent` outside the package itself.)

**Step 3: Commit**

```bash
git add packages/enforma/src/index.ts
git commit -m "fix: add named exports for Scope and List; remove internal getComponent from public API"
```

---

## Task 3: Export `ValidationState` and `FormSettings` types

**Files:**
- Modify: `packages/enforma/src/components/types.ts`
- Modify: `packages/enforma/src/components/Form.tsx`
- Modify: `packages/enforma/src/index.ts`

**Context:** `ValidationState` is the type of the second argument to `Form`'s `onChange` callback. Users writing named handler functions need it. It's currently a local type in `Form.tsx`. `FormSettings` is the type of the form-level config used by `useFormSettings`; adapter authors building `FormWrap` benefit from having it. Move `ValidationState` to `types.ts` and export both from `index.ts`.

**Step 1: Add `ValidationState` to `types.ts`**

In `packages/enforma/src/components/types.ts`, add at the end:

```ts
export type ValidationState = {
  isValid: boolean;
  errors: Record<string, string | null>;
};
```

**Step 2: Remove local `ValidationState` from `Form.tsx`**

In `packages/enforma/src/components/Form.tsx`, remove the local type declaration:

```ts
// DELETE these lines:
type ValidationState = {
  isValid: boolean;
  errors: Record<string, string | null>;
};
```

And add an import at the top:

```ts
import type { ValidationState } from './types';
```

The `FormProps` type in `Form.tsx` uses `ValidationState` in `onChange` — that reference still works via the import.

**Step 3: Export both types from `index.ts`**

In the types export block in `index.ts`, add `ValidationState`:

```ts
export type {
  Reactive,
  CommonProps,
  TextInputProps,
  TextareaProps,
  SelectProps,
  CheckboxProps,
  ComponentPropsMap,
  ComponentProps,
  FieldsetProps,
  FormWrapProps,
  ValidationState,
} from './components/types';
```

Add a new export line for `FormSettings`:

```ts
export type { FormSettings } from './context/FormSettingsContext';
```

**Step 4: Verify**

```bash
pnpm lint && pnpm test
```

Expected: all pass.

**Step 5: Commit**

```bash
git add packages/enforma/src/components/types.ts packages/enforma/src/components/Form.tsx packages/enforma/src/index.ts
git commit -m "feat: export ValidationState and FormSettings types from public API"
```

---

## Task 4: Eliminate the `ComponentProps` alias

**Files:**
- Modify: `packages/enforma/src/components/types.ts`
- Modify: `packages/enforma/src/context/ScopeContext.ts`
- Modify: `packages/enforma/src/index.ts`

**Context:** `ComponentProps = CommonProps` is a pure alias with no semantic difference, exported separately. It appears only in one place (`ScopeContext.ts` as the parameter type for `useComponentProps`). Remove the alias and use `CommonProps` directly.

**Step 1: Remove the alias from `types.ts`**

In `packages/enforma/src/components/types.ts`, delete:

```ts
export type ComponentProps = CommonProps;
```

**Step 2: Update `ScopeContext.ts`**

In `packages/enforma/src/context/ScopeContext.ts`, change the import:

```ts
// Before:
import { ComponentProps, Reactive } from '../components/types';

// After:
import { CommonProps, Reactive } from '../components/types';
```

And change the function signature:

```ts
// Before:
export function useComponentProps<T>({
  bind,
  label,
  disabled,
  placeholder,
  description,
  validate,
  messages,
}: ComponentProps) {

// After:
export function useComponentProps<T>({
  bind,
  label,
  disabled,
  placeholder,
  description,
  validate,
  messages,
}: CommonProps) {
```

**Step 3: Remove `ComponentProps` from `index.ts` exports**

In `packages/enforma/src/index.ts`, remove `ComponentProps` from the type export block:

```ts
export type {
  Reactive,
  CommonProps,
  TextInputProps,
  TextareaProps,
  SelectProps,
  CheckboxProps,
  ComponentPropsMap,
  // ComponentProps,   <-- remove this line
  FieldsetProps,
  FormWrapProps,
  ValidationState,
} from './components/types';
```

**Step 4: Verify**

```bash
pnpm lint && pnpm test
```

Expected: all pass.

**Step 5: Commit**

```bash
git add packages/enforma/src/components/types.ts packages/enforma/src/context/ScopeContext.ts packages/enforma/src/index.ts
git commit -m "refactor: remove ComponentProps alias, use CommonProps directly"
```

---

## Task 5: Rename `extendPrefix` → `childScope`

**Files:**
- Modify: `packages/enforma/src/context/ScopeContext.ts`
- Modify: `packages/enforma/src/components/Scope.tsx`
- Modify: `packages/enforma/src/index.ts`

**Context:** `extendPrefix` describes the mechanism (string prefix manipulation). `childScope` communicates the semantic intent: create a child scope nested at the given path.

**Step 1: Rename in `ScopeContext.ts`**

```ts
// Before:
export function extendPrefix(parent: ScopeValue, path: string): ScopeValue {
  return { store: parent.store, prefix: joinPath(parent.prefix, path) };
}

// After:
export function childScope(parent: ScopeValue, path: string): ScopeValue {
  return { store: parent.store, prefix: joinPath(parent.prefix, path) };
}
```

**Step 2: Update `Scope.tsx`**

```tsx
// Before:
import { ScopeContext, extendPrefix } from '../context/ScopeContext';
// ...
const scopeValue = extendPrefix(parent, path);

// After:
import { ScopeContext, childScope } from '../context/ScopeContext';
// ...
const scopeValue = childScope(parent, path);
```

**Step 3: Update `index.ts`**

```ts
// Before:
export {
  useFormValue,
  useReactiveProp,
  useComponentProps,
  useFieldValidation,
  ScopeContext,
  extendPrefix,
  type ScopeValue,
} from './context/ScopeContext';

// After:
export {
  useFormValue,
  useReactiveProp,
  useComponentProps,
  useFieldValidation,
  ScopeContext,
  childScope,
  type ScopeValue,
} from './context/ScopeContext';
```

**Step 4: Verify**

```bash
pnpm lint && pnpm test
```

Expected: all pass.

**Step 5: Commit**

```bash
git add packages/enforma/src/context/ScopeContext.ts packages/enforma/src/components/Scope.tsx packages/enforma/src/index.ts
git commit -m "refactor: rename extendPrefix to childScope for semantic clarity"
```

---

## Task 6: Rename `component-wrap.tsx` → `fields.tsx`; rename `InputWrapper` → `dispatchComponent`

**Files:**
- Rename: `packages/enforma/src/components/component-wrap.tsx` → `packages/enforma/src/components/fields.tsx`
- Modify: `packages/enforma/src/index.ts`

**Context:** `component-wrap` is a vague name. The file's job is to dispatch each field type to its registered implementation. `fields.tsx` communicates what the file exports (the public field components). The internal helper `InputWrapper` is not just for inputs (it also wraps `Fieldset`) and doesn't wrap — it dispatches. `dispatchComponent` is accurate.

**Step 1: Create `fields.tsx` with the renamed function**

Create `packages/enforma/src/components/fields.tsx` with this content (and delete `component-wrap.tsx`):

```tsx
import { getComponent } from './registry';
import {
  CheckboxProps,
  ComponentPropsMap,
  FieldsetProps,
  SelectProps,
  TextareaProps,
  TextInputProps,
} from './types';

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

export const TextInput = (props: TextInputProps) => dispatchComponent('TextInput', props);
export const Textarea = (props: TextareaProps) => dispatchComponent('Textarea', props);
export const Select = (props: SelectProps) => dispatchComponent('Select', props);
export const Checkbox = (props: CheckboxProps) => dispatchComponent('Checkbox', props);
export const Fieldset = (props: FieldsetProps) => dispatchComponent('Fieldset', props);
```

**Step 2: Delete the old file**

```bash
rm packages/enforma/src/components/component-wrap.tsx
```

**Step 3: Update `index.ts`**

```ts
// Before:
import * as components from './components/component-wrap';

// After:
import * as fields from './components/fields';
```

And:
```ts
// Before:
const Enforma = { Form, ...components, Scope, List } as const;

// After:
const Enforma = { Form, ...fields, Scope, List } as const;
```

**Step 4: Verify**

```bash
pnpm lint && pnpm test
```

Expected: all pass.

**Step 5: Commit**

```bash
git add packages/enforma/src/components/fields.tsx packages/enforma/src/index.ts
git rm packages/enforma/src/components/component-wrap.tsx
git commit -m "refactor: rename component-wrap.tsx to fields.tsx, InputWrapper to dispatchComponent"
```

---

## Task 7: Rename `useComponentProps` → `useFieldProps`

**Files:**
- Modify: `packages/enforma/src/context/ScopeContext.ts`
- Modify: `packages/enforma/src/index.ts`
- Modify: `packages/enforma-mui/src/components/TextInput.tsx`

**Context:** `useComponentProps` is ambiguous in a React codebase where "component props" is generic terminology. `useFieldProps` communicates that this hook resolves the runtime state for a form field. `enforma-mui` uses this hook in its `TextInput.tsx` and must be updated.

**Step 1: Rename in `ScopeContext.ts`**

```ts
// Before:
export function useComponentProps<T>({

// After:
export function useFieldProps<T>({
```

**Step 2: Update `index.ts`**

```ts
// Before:
export {
  useFormValue,
  useReactiveProp,
  useComponentProps,
  useFieldValidation,
  ScopeContext,
  childScope,
  type ScopeValue,
} from './context/ScopeContext';

// After:
export {
  useFormValue,
  useReactiveProp,
  useFieldProps,
  useFieldValidation,
  ScopeContext,
  childScope,
  type ScopeValue,
} from './context/ScopeContext';
```

**Step 3: Update `enforma-mui/TextInput.tsx`**

```tsx
// Before:
import { type TextInputProps, useComponentProps } from 'enforma';
// ...
useComponentProps<string>(props);

// After:
import { type TextInputProps, useFieldProps } from 'enforma';
// ...
useFieldProps<string>(props);
```

**Step 4: Verify the whole monorepo**

```bash
pnpm lint && pnpm test
```

Expected: all pass.

**Step 5: Commit**

```bash
git add packages/enforma/src/context/ScopeContext.ts packages/enforma/src/index.ts packages/enforma-mui/src/components/TextInput.tsx
git commit -m "refactor: rename useComponentProps to useFieldProps"
```

---

## Task 8: Inline `makeScopeValue` in `Form.tsx`; remove from exports

**Files:**
- Modify: `packages/enforma/src/context/ScopeContext.ts`
- Modify: `packages/enforma/src/components/Form.tsx`

**Context:** `makeScopeValue` is a one-liner factory (`return { store, prefix }`) with a single caller in `Form.tsx`. It adds a layer of indirection without communicating anything beyond what the object literal says. Inline it and remove it from `ScopeContext.ts`. It was never exported from `index.ts` so there is no public API change.

**Step 1: Inline in `Form.tsx`**

```tsx
// Before:
import { ScopeContext, makeScopeValue } from '../context/ScopeContext';
// ...
const scopeValue = makeScopeValue(store, '');

// After:
import { ScopeContext } from '../context/ScopeContext';
// ...
const scopeValue = { store, prefix: '' };
```

**Step 2: Remove `makeScopeValue` from `ScopeContext.ts`**

Delete the function:

```ts
// DELETE:
export function makeScopeValue(store: FormStore, prefix: string): ScopeValue {
  return { store, prefix };
}
```

**Step 3: Verify**

```bash
pnpm lint && pnpm test
```

Expected: all pass.

**Step 4: Commit**

```bash
git add packages/enforma/src/context/ScopeContext.ts packages/enforma/src/components/Form.tsx
git commit -m "refactor: inline makeScopeValue in Form.tsx, remove trivial factory"
```

---

## Task 9: Split `ScopeContext.ts` — move field hooks into `hooks/useField.ts`

**Files:**
- Modify: `packages/enforma/src/context/ScopeContext.ts`
- Create: `packages/enforma/src/hooks/useField.ts`
- Modify: `packages/enforma/src/hooks/useListState.ts`
- Modify: `packages/enforma/src/index.ts`

**Context:** `ScopeContext.ts` currently contains scope primitives (used internally by `Form`/`Scope`) alongside all field hooks (the primary adapter author API). These are different responsibilities. After this task:
- `ScopeContext.ts` holds only: `ScopeContext`, `ScopeValue`, `useScope` (new public name for private `useScopeValue`), `joinPath`, `childScope`
- `hooks/useField.ts` holds: `useFormValue`, `useReactiveProp`, `useFieldProps`, `useFieldValidation`

`joinPath` stays in `ScopeContext.ts` and is exported so that `useField.ts` can import it without circular dependencies. It is intentionally not re-exported from `index.ts` (internal utility for hooks).

`useScope` replaces the private `useScopeValue`. The error message changes from the confusingly specific `'useFormValue must be used within <Enforma.Form>'` to the generic `'Enforma field hooks must be used within <Enforma.Form>'`. `useScope` is exported so that adapter authors can access the store and prefix directly for advanced use cases — but it is not required for the common case (use `useFieldProps` or `useFieldValidation` instead).

**Step 1: Write the new `ScopeContext.ts`**

Replace the entire content of `packages/enforma/src/context/ScopeContext.ts` with:

```ts
import { createContext, useContext } from 'react';
import type { FormStore } from '../store/FormStore';

export type ScopeValue = {
  store: FormStore;
  prefix: string;
};

export const ScopeContext = createContext<ScopeValue | null>(null);

/** Returns the current scope. Use inside adapter components only (within <Enforma.Form>). */
export function useScope(): ScopeValue {
  const ctx = useContext(ScopeContext);
  if (ctx === null) {
    throw new Error('Enforma field hooks must be used within <Enforma.Form>');
  }
  return ctx;
}

/** @internal Used by useField.ts hooks. Not intended for direct use in most adapters. */
export function joinPath(prefix: string, bind: string): string {
  return prefix === '' ? bind : `${prefix}.${bind}`;
}

export function childScope(parent: ScopeValue, path: string): ScopeValue {
  return { store: parent.store, prefix: joinPath(parent.prefix, path) };
}
```

**Step 2: Create `packages/enforma/src/hooks/useField.ts`**

```ts
import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { FormValues } from '../store/FormStore';
import { useScope, joinPath } from '../context/ScopeContext';
import { useFormSettings } from '../context/FormSettingsContext';
import type { CommonProps, Reactive } from '../components/types';

// No-op unsubscribe for useSyncExternalStore when a prop is static (no store subscription needed).
// eslint-disable-next-line @typescript-eslint/no-empty-function
const staticUnsubscribe = (): void => {};

export function useFormValue<T>(bind: string): [T | undefined, (value: T) => void] {
  const { store, prefix } = useScope();
  const fullPath = joinPath(prefix, bind);

  const value = useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => store.getField(fullPath) as T | undefined,
  );

  const setValue = (newValue: T) => {
    store.setField(fullPath, newValue);
  };

  return [value, setValue];
}

export function useReactiveProp<T>(prop: Reactive<T> | undefined): T | undefined {
  const { store, prefix } = useScope();

  return useSyncExternalStore(
    (cb) => (typeof prop === 'function' ? store.subscribe(cb) : staticUnsubscribe),
    (): T | undefined => {
      if (typeof prop !== 'function') return prop;
      const fn = prop as (scopeValues: FormValues, allValues: FormValues) => T;
      const allValues = store.getSnapshot();
      const raw = store.getField(prefix);
      const scopeValues: FormValues =
        prefix === '' || raw === null || typeof raw !== 'object' ? allValues : (raw as FormValues);
      return fn(scopeValues, allValues);
    },
  );
}

export function useFieldProps<T>({
  bind,
  label,
  disabled,
  placeholder,
  description,
  validate,
  messages,
}: CommonProps) {
  const [value, setValue] = useFormValue<T>(bind);

  return {
    value,
    setValue,
    label: useReactiveProp(label),
    disabled: useReactiveProp(disabled),
    placeholder: useReactiveProp(placeholder),
    description: useReactiveProp(description),
    ...useFieldValidation(bind, validate, messages),
  };
}

export function useFieldValidation(
  bind: string,
  validate:
    | ((value: unknown, scopeValues: FormValues, allValues: FormValues) => string | null)
    | undefined,
  localMessages: Partial<Record<string, string>> | undefined,
  implicitValidator?: () => string | null,
): { error: string | null; showError: boolean; onBlur: () => void } {
  const { store, prefix } = useScope();
  const { showErrors: formShowErrors, messages: formMessages } = useFormSettings();
  const fullPath = joinPath(prefix, bind);

  // Refs keep the registered validator always seeing latest props without re-registering.
  const validateRef = useRef(validate);
  validateRef.current = validate;

  const localMessagesRef = useRef(localMessages);
  localMessagesRef.current = localMessages;

  const formMessagesRef = useRef(formMessages);
  formMessagesRef.current = formMessages;

  const implicitValidatorRef = useRef(implicitValidator);
  implicitValidatorRef.current = implicitValidator;

  useEffect(() => {
    if (validateRef.current === undefined && implicitValidatorRef.current === undefined) return;

    const combinedValidator = (): string | null => {
      // 1. Implicit check — returns a message key (e.g. "invalidDate") or null.
      const implicitFn = implicitValidatorRef.current;
      if (implicitFn !== undefined) {
        const key = implicitFn();
        if (key !== null) {
          return localMessagesRef.current?.[key] ?? formMessagesRef.current[key] ?? key;
        }
      }

      // 2. User's validate fn — only runs if implicit check passes.
      const validateFn = validateRef.current;
      if (validateFn !== undefined) {
        const fieldValue = store.getField(fullPath);
        const allValues = store.getSnapshot();
        const raw = prefix === '' ? allValues : store.getField(prefix);
        const scopeValues: FormValues =
          raw === null || typeof raw !== 'object' ? allValues : (raw as FormValues);
        return validateFn(fieldValue, scopeValues, allValues);
      }

      return null;
    };

    return store.registerValidator(fullPath, combinedValidator);
  }, [store, fullPath, prefix]);

  const error = useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => store.getError(fullPath),
  );

  const isTouched = useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => store.isTouched(fullPath),
  );

  const isSubmitted = useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => store.isSubmitted(),
  );

  const showError = (isTouched || isSubmitted || formShowErrors) && error !== null;

  const onBlur = () => {
    store.touchField(fullPath);
  };

  return { error, showError, onBlur };
}
```

**Step 3: Update `useListState.ts` import**

`useListState` currently imports `useFormValue` from `../context/ScopeContext`. Update it to the new location:

```ts
// Before:
import { useFormValue } from '../context/ScopeContext';

// After:
import { useFormValue } from './useField';
```

**Step 4: Update `index.ts`**

Replace the ScopeContext export block:

```ts
// Before:
export {
  useFormValue,
  useReactiveProp,
  useFieldProps,
  useFieldValidation,
  ScopeContext,
  childScope,
  type ScopeValue,
} from './context/ScopeContext';

// After:
export { ScopeContext, childScope, useScope, type ScopeValue } from './context/ScopeContext';
export {
  useFormValue,
  useReactiveProp,
  useFieldProps,
  useFieldValidation,
} from './hooks/useField';
```

**Step 5: Verify**

```bash
pnpm lint && pnpm test
```

Expected: all pass. If any test fails, check for remaining imports from `'../context/ScopeContext'` that should now come from `'./useField'` or `'../hooks/useField'`.

**Step 6: Commit**

```bash
git add packages/enforma/src/context/ScopeContext.ts packages/enforma/src/hooks/useField.ts packages/enforma/src/hooks/useListState.ts packages/enforma/src/index.ts
git commit -m "refactor: split ScopeContext.ts into scope primitives and hooks/useField.ts"
```

---

## Task 10: Add clarifying comments to `useListState` and `FormContext`

**Files:**
- Modify: `packages/enforma/src/hooks/useListState.ts`
- Modify: `packages/enforma/src/context/FormContext.ts`

**Context:** Two pieces of non-obvious code need explanatory comments to prevent future well-intentioned refactors from breaking them.

**Step 1: Comment the key sync logic in `useListState.ts`**

The `while`/`if` block that mutates `keysRef` during the render body looks like a bug but is intentional. Add a comment above it:

```ts
// Key sync: mutate keysRef during render (safe — refs only, no state).
// Runs before returning so that keys array always matches arr length by the time
// the component renders. Growing keys on append; shrinking on remove.
while (keysRef.current.length < arr.length) {
  keysRef.current.push(String(keyCountRef.current++));
}
if (keysRef.current.length > arr.length) {
  keysRef.current = keysRef.current.slice(0, arr.length);
}
```

**Step 2: Comment `update` in `useListState.ts`**

```ts
// `update` is not used by the core List component but is exported for adapter
// packages (e.g. enforma-mui) that manage individual item edits via modal/dialog.
const update = (index: number, item: unknown): void => {
  setArr(arr.map((v, i) => (i === index ? item : v)));
};
```

**Step 3: Comment `useFormStore` in `FormContext.ts`**

```ts
// useFormStore is intentionally not exported from the public index.
// Adapter components access the store via useScope() from ScopeContext.
// Promote to the public API only if a concrete adapter use case requires raw store access.
export function useFormStore(): FormStore {
```

**Step 4: Verify**

```bash
pnpm lint && pnpm test
```

Expected: all pass.

**Step 5: Commit**

```bash
git add packages/enforma/src/hooks/useListState.ts packages/enforma/src/context/FormContext.ts
git commit -m "docs: add clarifying comments to useListState key sync, update, and useFormStore"
```

---

## Final State

After all tasks, the public API surface exported from `packages/enforma/src/index.ts` is:

**Components (end users):**
- `Form`, `Scope`, `List`, `TextInput`, `Textarea`, `Select`, `Checkbox`, `Fieldset`
- Default namespace: `Enforma` (all of the above)

**Registry (end users / adapter setup):**
- `registerComponents`, `clearRegistry`
- `EnformaComponentRegistry` type

**Field hooks (adapter authors):**
- `useFieldProps` — primary hook for implementing a field component
- `useFieldValidation` — standalone validation hook for components with implicit validators
- `useFormValue` — raw field value access
- `useReactiveProp` — resolve a reactive prop (function or static)

**Scope primitives (advanced adapter use):**
- `ScopeContext` — the React context object
- `useScope` — access current scope (store + prefix)
- `childScope` — create a child scope at a path

**Types:**
- `FormValues`, `ValidationState`, `FormSettings`
- `Reactive`, `CommonProps`, `TextInputProps`, `TextareaProps`, `SelectProps`, `CheckboxProps`, `FieldsetProps`, `FormWrapProps`, `ComponentPropsMap`
- `EnformaComponentRegistry`, `ScopeValue`
