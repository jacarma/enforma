# useFieldProps Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor `useFieldProps` to resolve any reactive props via a single `useSyncExternalStore`, and simplify the call site to `useFieldProps<ResolvedCheckboxProps>(props)`.

**Architecture:** Add a `ToComponentProps<R>` utility type that maps a resolved type back to its component props type (extra keys become `Reactive<...>`). Replace N individual `useReactiveProp` calls inside `useFieldProps` with one `useSyncExternalStore` that iterates `propsRef.current` and resolves functions against scope values, caching the result for reference stability. All dispatch components in `fields.tsx` then become one-liners.

**Tech Stack:** TypeScript strict, React hooks (`useSyncExternalStore`, `useCallback`, `useRef`), Vitest + @testing-library/react

---

### Task 1: Add utility types and update exports

**Files:**
- Modify: `packages/enforma/src/components/types.ts`
- Modify: `packages/enforma/src/index.ts`

**Step 1: Add `ToComponentProps<R>` and `FieldResolved<T>` to types.ts**

Open `packages/enforma/src/components/types.ts`. Add after the `Reactive<T>` type definition:

```ts
// Maps a resolved type back to its component props type.
// Extra keys (beyond ResolvedCommonProps) become optional Reactive<...> props.
// Used to constrain and type-check useFieldProps<R> call sites.
export type ToComponentProps<R extends { value: unknown; setValue: (v: unknown) => void }> =
  CommonProps & {
    [K in Exclude<keyof R, keyof ResolvedCommonProps>]?: Reactive<NonNullable<R[K]>>;
  };

// Convenience type for custom component authors who want a typed value
// without defining a full resolved type. Replaces the old useFieldProps<T> pattern.
// Usage: useFieldProps<FieldResolved<number>>(props)
export type FieldResolved<T> = Omit<ResolvedCommonProps, 'value' | 'setValue'> & {
  value: T | undefined;
  setValue: (value: T) => void;
};
```

**Step 2: Export both types from index.ts**

In `packages/enforma/src/index.ts`, add `ToComponentProps` and `FieldResolved` to the existing type export block:

```ts
export type {
  // ...existing exports...
  ToComponentProps,
  FieldResolved,
} from './components/types';
```

**Step 3: Run typecheck to verify types are valid**

```bash
nvm use 20 && pnpm typecheck
```
Expected: passes with no errors.

**Step 4: Commit**

```bash
git add packages/enforma/src/components/types.ts packages/enforma/src/index.ts
git commit -m "feat(enforma): add ToComponentProps and FieldResolved utility types"
```

---

### Task 2: Write failing test for extra reactive prop resolution

**Files:**
- Create: `packages/enforma/src/hooks/useField.test.tsx`

**Step 1: Create the test file**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Form } from '../components/Form';
import { useFieldProps } from './useField';
import type { CommonProps, FieldResolved, ToComponentProps, Reactive } from '../components/types';

// A minimal resolved type with one extra field beyond ResolvedCommonProps
type TestResolved = FieldResolved<string> & { highlight: string | undefined };
type TestProps = ToComponentProps<TestResolved>; // = CommonProps & { highlight?: Reactive<string> }

function TestField(props: TestProps) {
  useFieldProps<TestResolved>(props);
  return null;
}

describe('useFieldProps', () => {
  describe('extra reactive props', () => {
    it('passes a static extra prop through to the resolved result', () => {
      const received: unknown[] = [];

      function CaptureField(props: TestProps) {
        const res = useFieldProps<TestResolved>(props);
        received.push((res as Record<string, unknown>)['highlight']);
        return null;
      }

      render(
        <Form values={{}} onChange={vi.fn()}>
          <CaptureField bind="x" highlight="blue" />
        </Form>,
      );

      expect(received[0]).toBe('blue');
    });

    it('resolves a reactive extra prop against form values', () => {
      const received: unknown[] = [];

      function CaptureField(props: TestProps) {
        const res = useFieldProps<TestResolved>(props);
        received.push((res as Record<string, unknown>)['highlight']);
        return null;
      }

      render(
        <Form values={{ mode: 'vip' }} onChange={vi.fn()}>
          <CaptureField
            bind="x"
            highlight={({ mode }) => (mode === 'vip' ? 'gold' : 'grey')}
          />
        </Form>,
      );

      expect(received[0]).toBe('gold');
    });

    it('updates a reactive extra prop when the form value it depends on changes', async () => {
      const received: unknown[] = [];

      function CaptureField(props: TestProps) {
        const res = useFieldProps<TestResolved>(props);
        received.push((res as Record<string, unknown>)['highlight']);
        return null;
      }

      // Wrap in a controlled form so we can change values
      function App() {
        const [values, setValues] = useState<Record<string, unknown>>({ mode: 'normal' });
        return (
          <>
            <Form values={values} onChange={setValues}>
              <CaptureField
                bind="x"
                highlight={({ mode }) => (mode === 'vip' ? 'gold' : 'grey')}
              />
              <TextInputShim bind="mode" />
            </Form>
          </>
        );
      }

      // ... we will implement this after the refactor; skip for now
    });
  });
});
```

> Note: The test file imports `useState` and a `TextInputShim` — add those imports:
> ```tsx
> import { useState } from 'react';
> ```
> The third test is complex; mark it as `it.todo` for now and come back after implementation.

Simplify the file to just the two tests that don't need controlled state:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { Form } from '../components/Form';
import { useFieldProps } from './useField';
import type { FieldResolved, ToComponentProps, Reactive } from '../components/types';

type TestResolved = FieldResolved<string> & { highlight: string | undefined };
type TestProps = ToComponentProps<TestResolved>;

describe('useFieldProps — extra reactive props', () => {
  it('passes a static extra prop through to the resolved result', () => {
    const received: unknown[] = [];

    function CaptureField(props: TestProps) {
      const res = useFieldProps<TestResolved>(props);
      received.push((res as Record<string, unknown>)['highlight']);
      return null;
    }

    render(
      <Form values={{}} onChange={vi.fn()}>
        <CaptureField bind="x" highlight="blue" />
      </Form>,
    );

    expect(received[0]).toBe('blue');
  });

  it('resolves a reactive extra prop against form values', () => {
    const received: unknown[] = [];

    function CaptureField(props: TestProps) {
      const res = useFieldProps<TestResolved>(props);
      received.push((res as Record<string, unknown>)['highlight']);
      return null;
    }

    render(
      <Form values={{ mode: 'vip' }} onChange={vi.fn()}>
        <CaptureField
          bind="x"
          highlight={({ mode }) => (mode === 'vip' ? 'gold' : 'grey')}
        />
      </Form>,
    );

    expect(received[0]).toBe('gold');
  });
});
```

**Step 2: Run tests to verify they FAIL**

```bash
nvm use 20 && pnpm test --filter enforma -- useField
```
Expected: 2 failures. Before the refactor, `highlight` is not resolved by `useFieldProps` — it's not in the destructure list — so `received[0]` is `undefined`, not `'blue'` or `'gold'`.

---

### Task 3: Refactor `useFieldProps` in `useField.ts`

**Files:**
- Modify: `packages/enforma/src/hooks/useField.ts`

**Step 1: Replace the `useFieldProps` implementation**

Open `packages/enforma/src/hooks/useField.ts`. Replace the current `useFieldProps` function entirely. Keep `useFormValue`, `useReactiveProp`, and `useFieldValidation` unchanged.

The new implementation:

```ts
export function useFieldProps<R extends { value: unknown; setValue: (v: unknown) => void }>(
  props: import('../components/types').ToComponentProps<R>,
): R {
  // Destructure non-reactive / specially-handled props out of the spread.
  // `validate` and `messages` go to useFieldValidation.
  // `id` exists on CommonProps but is not part of ResolvedCommonProps; drop it.
  // `bind` goes to useFormValue and useFieldValidation.
  // Everything else is a potentially-reactive prop that the loop will resolve.
  const { bind, validate, messages, id: _id, ...reactiveProps } = props as typeof props & {
    id?: string;
  };

  const { store, prefix } = useScope();

  type ValueType = NonNullable<R['value']>;
  const [value, setValue] = useFormValue<ValueType>(bind);

  // Always-current ref — the subscribe/snapshot closures read this
  // instead of closing over `reactiveProps` directly, avoiding stale values.
  const propsRef = useRef(reactiveProps);
  propsRef.current = reactiveProps;

  // Stable reference cache for the snapshot return value.
  // useSyncExternalStore compares snapshots with Object.is; returning the same
  // object reference when nothing changed prevents unnecessary re-renders.
  const lastRef = useRef<Record<string, unknown> | null>(null);

  // Always subscribe — the snapshot caching handles the no-change bail-out.
  // Using useCallback([store]) makes the function reference stable so React
  // does not unnecessarily re-subscribe on every render.
  const subscribe = useCallback((cb: () => void) => store.subscribe(cb), [store]);

  const resolvedExtras = useSyncExternalStore(subscribe, () => {
    const allValues = store.getSnapshot();
    const raw = store.getField(prefix);
    const scopeValues: FormValues =
      prefix === '' || raw === null || typeof raw !== 'object' ? allValues : (raw as FormValues);

    const current = propsRef.current;
    const next: Record<string, unknown> = {};
    for (const key of Object.keys(current)) {
      const val = current[key as keyof typeof current];
      next[key] =
        typeof val === 'function'
          ? (val as (s: FormValues, a: FormValues) => unknown)(scopeValues, allValues)
          : val;
    }

    // Return cached reference if all values are unchanged.
    const last = lastRef.current;
    if (
      last !== null &&
      Object.keys(last).length === Object.keys(next).length &&
      Object.keys(next).every((k) => Object.is(last[k], next[k]))
    ) {
      return last;
    }
    return (lastRef.current = next);
  });

  return {
    value,
    setValue,
    ...resolvedExtras,
    ...useFieldValidation(bind, validate, messages),
  } as R;
}
```

You will also need to add `useCallback` to the React import at the top of the file:
```ts
import { useEffect, useRef, useSyncExternalStore, useCallback } from 'react';
```

**Step 2: Run the two new tests to verify they now PASS**

```bash
nvm use 20 && pnpm test --filter enforma -- useField
```
Expected: 2 passing.

**Step 3: Run all tests to verify no regressions**

```bash
nvm use 20 && pnpm test --filter enforma
```
Expected: all tests pass. The existing mask tests in `Form.test.tsx` act as regression tests — mask is no longer resolved in `TextInputDispatch` via a separate `useReactiveProp` call, but the behaviour is unchanged since `useFieldProps` now resolves it via the loop. (Note: `TextInputDispatch` still destructures `mask` separately at this point — that's fine for now; we simplify dispatch in Task 4.)

**Step 4: Run lint and typecheck**

```bash
nvm use 20 && pnpm lint && pnpm typecheck
```
Expected: no errors or warnings.

**Step 5: Commit**

```bash
git add packages/enforma/src/hooks/useField.ts packages/enforma/src/hooks/useField.test.tsx
git commit -m "feat(enforma): refactor useFieldProps to resolve all reactive props via single useSyncExternalStore"
```

---

### Task 4: Simplify dispatch components in `fields.tsx`

**Files:**
- Modify: `packages/enforma/src/components/fields.tsx`

**Step 1: Update all dispatch functions**

Open `packages/enforma/src/components/fields.tsx`. Replace the individual dispatch functions with the simplified versions below. The goal: each becomes a one-liner using the new generic `useFieldProps<ResolvedXxxProps>`.

```ts
import type {
  CheckboxProps,
  FieldsetProps,
  SelectProps,
  TextareaProps,
  TextInputProps,
  ResolvedCheckboxProps,
  ResolvedTextInputProps,
  ResolvedTextareaProps,
} from './types';
```

Replace `TextInputDispatch` (remove separate `useReactiveProp(mask)` call):

```ts
function TextInputDispatch(props: TextInputProps) {
  return dispatchComponent('TextInput', useFieldProps<ResolvedTextInputProps>(props));
}
```

Replace `TextareaDispatch`:

```ts
function TextareaDispatch(props: TextareaProps) {
  return dispatchComponent('Textarea', useFieldProps<ResolvedTextareaProps>(props));
}
```

Replace `CheckboxDispatch`:

```ts
function CheckboxDispatch(props: CheckboxProps) {
  return dispatchComponent('Checkbox', useFieldProps<ResolvedCheckboxProps>(props));
}
```

`FieldsetDispatch` and `SelectDispatch` do NOT use `useFieldProps` for their full resolved props (Select assembles its result from multiple hooks). Leave them unchanged.

Also remove `useReactiveProp` from the import in `fields.tsx` since it is no longer used there.

**Step 2: Run all tests**

```bash
nvm use 20 && pnpm test --filter enforma
```
Expected: all tests pass.

**Step 3: Run lint and typecheck**

```bash
nvm use 20 && pnpm lint && pnpm typecheck
```
Expected: no errors or warnings.

**Step 4: Commit**

```bash
git add packages/enforma/src/components/fields.tsx
git commit -m "refactor(enforma): simplify dispatch components using new useFieldProps<R> signature"
```

---

### Task 5: Update demo — migrate `StarRating` to new hook signature

**Files:**
- Modify: `apps/demo/src/App.tsx`

**Background:** The demo's custom `StarRating` component calls `useFieldProps<number>(props)`. After the refactor, the generic parameter must be a resolved type, not a value type. Use `FieldResolved<number>` instead.

**Step 1: Update the import and StarRating component**

In `apps/demo/src/App.tsx`, add `FieldResolved` to the enforma import:

```ts
import Enforma, {
  type FormValues,
  type FieldResolved,       // add this
  registerComponents,
  useFieldProps,
  type TextInputProps,
  type DataSourceDefinition,
  type DataSourceParams,
} from 'enforma';
```

Change `StarRating`'s `useFieldProps` call from:

```ts
const { value, setValue, label, error, showError, disabled } = useFieldProps<number>(props);
```

to:

```ts
const { value, setValue, label, error, showError, disabled } = useFieldProps<FieldResolved<number>>(props);
```

**Step 2: Run typecheck for the demo**

```bash
nvm use 20 && pnpm typecheck
```
Expected: no errors.

**Step 3: Run all tests one final time**

```bash
nvm use 20 && pnpm test
```
Expected: all tests pass across all packages.

**Step 4: Run lint**

```bash
nvm use 20 && pnpm lint
```
Expected: no errors or warnings.

**Step 5: Commit**

```bash
git add apps/demo/src/App.tsx
git commit -m "fix(demo): migrate StarRating to useFieldProps<FieldResolved<T>> signature"
```

---

## Done

The refactor is complete. Summary of changes:

| File | Change |
|------|--------|
| `components/types.ts` | Added `ToComponentProps<R>`, `FieldResolved<T>` |
| `hooks/useField.ts` | `useFieldProps` now resolves all reactive props via single `useSyncExternalStore` |
| `hooks/useField.test.tsx` | New tests for extra reactive prop resolution |
| `components/fields.tsx` | Dispatch functions simplified to one-liners |
| `index.ts` | Exports `ToComponentProps`, `FieldResolved` |
| `apps/demo/src/App.tsx` | `StarRating` migrated to `FieldResolved<number>` |
