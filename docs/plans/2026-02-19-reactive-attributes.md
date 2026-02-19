# Reactive Attributes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow `TextInput` props (`disabled`, `label`, `placeholder`) to accept either a static value or a function `(scopeValues, allValues) => T` evaluated live against form state.

**Architecture:** Add `Reactive<T>` type and `useReactiveProp<T>` hook to `ScopeContext.ts`. The hook uses `useSyncExternalStore` — static props subscribe to nothing (no re-renders), function props subscribe to the store and re-render only when the return value changes. `TextInput` calls `useReactiveProp` once per reactive prop.

**Tech Stack:** React `useSyncExternalStore`, TypeScript strict, Vitest + @testing-library/react

---

### Task 1: Add `useReactiveProp`, wire up reactive `disabled`

**Files:**
- Modify: `packages/enforma/src/context/ScopeContext.ts`
- Modify: `packages/enforma/src/components/TextInput.tsx`
- Modify: `packages/enforma/src/components/TextInput.test.tsx`
- Modify: `packages/enforma/src/index.ts`

---

**Step 1: Write the failing tests for reactive `disabled`**

Add these two tests inside the existing `describe('TextInput', ...)` block in `packages/enforma/src/components/TextInput.test.tsx`:

```tsx
it('disables the input when disabled prop is a function returning true', () => {
  render(
    <Form values={{ name: '', email: '' }} onChange={vi.fn()}>
      <TextInput bind="email" label="Email" disabled={(_, all) => all.name === ''} />
    </Form>,
  )
  expect(screen.getByLabelText('Email')).toBeDisabled()
})

it('re-enables the input when the reactive disabled function returns false', async () => {
  render(
    <Form values={{ name: '', email: '' }} onChange={vi.fn()}>
      <TextInput bind="name" label="Name" />
      <TextInput bind="email" label="Email" disabled={(_, all) => all.name === ''} />
    </Form>,
  )
  expect(screen.getByLabelText('Email')).toBeDisabled()
  await userEvent.type(screen.getByLabelText('Name'), 'Alice')
  expect(screen.getByLabelText('Email')).not.toBeDisabled()
})
```

---

**Step 2: Run the tests to verify they fail**

```bash
pnpm --filter enforma test --run
```

Expected: both new tests FAIL — `disabled` prop does not accept functions yet.

---

**Step 3: Add `Reactive<T>` type and `useReactiveProp` to `ScopeContext.ts`**

Replace the contents of `packages/enforma/src/context/ScopeContext.ts` with:

```ts
// packages/enforma/src/context/ScopeContext.ts
import { createContext, useContext, useSyncExternalStore } from 'react'
import type { FormStore, FormValues } from '../store/FormStore'

interface ScopeValue {
  store: FormStore
  prefix: string
}

export const ScopeContext = createContext<ScopeValue | null>(null)

function useScopeValue(): ScopeValue {
  const ctx = useContext(ScopeContext)
  if (ctx === null) {
    throw new Error('useFormValue must be used within <Enforma.Form>')
  }
  return ctx
}

function joinPath(prefix: string, bind: string): string {
  return prefix === '' ? bind : `${prefix}.${bind}`
}

export function useFormValue(
  bind: string,
): [string, (value: string) => void] {
  const { store, prefix } = useScopeValue()
  const fullPath = joinPath(prefix, bind)

  const value = useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => {
      const fieldValue = store.getField(fullPath)
      return typeof fieldValue === 'string' ? fieldValue : ''
    },
  )

  const setValue = (newValue: string) => {
    store.setField(fullPath, newValue)
  }

  return [value, setValue]
}

export type Reactive<T> = T | ((scopeValues: FormValues, allValues: FormValues) => T)

export function useReactiveProp<T>(prop: Reactive<T> | undefined): T | undefined {
  const { store, prefix } = useScopeValue()

  return useSyncExternalStore(
    (cb) => (typeof prop === 'function' ? store.subscribe(cb) : () => {}),
    (): T | undefined => {
      if (typeof prop !== 'function') return prop
      const allValues = store.getSnapshot()
      const raw = store.getField(prefix)
      const scopeValues: FormValues =
        prefix === '' || raw === null || typeof raw !== 'object'
          ? allValues
          : (raw as FormValues)
      return prop(scopeValues, allValues)
    },
  )
}

export function makeScopeValue(store: FormStore, prefix: string): ScopeValue {
  return { store, prefix }
}

export function extendPrefix(parent: ScopeValue, path: string): ScopeValue {
  return { store: parent.store, prefix: joinPath(parent.prefix, path) }
}
```

Key points:
- `FormValues` is now imported alongside `FormStore`
- `Reactive<T>` is a type alias: `T | ((scopeValues, allValues) => T)`
- `useReactiveProp<T>` accepts `Reactive<T> | undefined` and returns `T | undefined`
- Static value (or `undefined`): subscribe is a no-op `() => {}` — no store subscription
- Function: subscribes to the store; snapshot calls `prop(scopeValues, allValues)` and React re-renders only when the result changes via `Object.is`
- `scopeValues` is derived via `store.getField(prefix)` — the nested object at the current scope path, or `allValues` when at root (`prefix === ''`)

---

**Step 4: Update `TextInput.tsx` to use `useReactiveProp` for `disabled`**

Replace the contents of `packages/enforma/src/components/TextInput.tsx` with:

```tsx
// packages/enforma/src/components/TextInput.tsx
import { useId } from 'react'
import { useFormValue, useReactiveProp } from '../context/ScopeContext'
import type { Reactive } from '../context/ScopeContext'

interface TextInputProps {
  bind: string
  label?: Reactive<string>
  placeholder?: Reactive<string>
  disabled?: Reactive<boolean>
  id?: string
}

export function TextInput({ bind, label, disabled, placeholder, id }: TextInputProps) {
  const [value, setValue] = useFormValue(bind)
  const generatedId = useId()
  const inputId = id ?? generatedId
  const resolvedLabel = useReactiveProp(label)
  const resolvedDisabled = useReactiveProp(disabled)
  const resolvedPlaceholder = useReactiveProp(placeholder)

  return (
    <div>
      {resolvedLabel !== undefined && <label htmlFor={inputId}>{resolvedLabel}</label>}
      <input
        id={inputId}
        type="text"
        value={value}
        placeholder={resolvedPlaceholder}
        disabled={resolvedDisabled}
        onChange={(e) => {
          setValue(e.target.value)
        }}
      />
    </div>
  )
}
```

Note: all three reactive props (`label`, `placeholder`, `disabled`) are wired up here even though only `disabled` tests exist yet — the hook is already in place.

---

**Step 5: Export `Reactive<T>` from `index.ts`**

Replace the contents of `packages/enforma/src/index.ts` with:

```ts
// packages/enforma/src/index.ts
import { Form } from './components/Form'
import { TextInput } from './components/TextInput'
import { Scope } from './components/Scope'

const Enforma = { Form, TextInput, Scope } as const

export default Enforma
export type { FormValues } from './store/FormStore'
export type { Reactive } from './context/ScopeContext'
```

---

**Step 6: Run tests**

```bash
pnpm --filter enforma test --run
```

Expected: all tests PASS.

---

**Step 7: Run lint**

```bash
pnpm --filter enforma lint
```

Expected: no errors or warnings.

---

**Step 8: Commit**

```bash
git add packages/enforma/src/context/ScopeContext.ts \
        packages/enforma/src/components/TextInput.tsx \
        packages/enforma/src/components/TextInput.test.tsx \
        packages/enforma/src/index.ts
git commit -m "feat: add useReactiveProp hook and reactive disabled prop"
```

---

### Task 2: Reactive `label` and `placeholder`

**Files:**
- Modify: `packages/enforma/src/components/TextInput.test.tsx`

(The `TextInput.tsx` implementation already handles these — only tests are missing.)

---

**Step 1: Write the failing tests**

Add these tests inside `describe('TextInput', ...)` in `TextInput.test.tsx`:

```tsx
it('renders a reactive label based on form values', async () => {
  render(
    <Form values={{ type: 'personal', email: '' }} onChange={vi.fn()}>
      <TextInput bind="type" label="Type" />
      <TextInput
        bind="email"
        label={(_, all) => all.type === 'work' ? 'Work Email' : 'Personal Email'}
      />
    </Form>,
  )
  expect(screen.getByLabelText('Personal Email')).toBeInTheDocument()
  await userEvent.clear(screen.getByLabelText('Type'))
  await userEvent.type(screen.getByLabelText('Type'), 'work')
  expect(screen.getByLabelText('Work Email')).toBeInTheDocument()
})

it('renders a reactive placeholder based on form values', async () => {
  render(
    <Form values={{ name: '', email: '' }} onChange={vi.fn()}>
      <TextInput bind="name" label="Name" />
      <TextInput
        bind="email"
        label="Email"
        placeholder={(_, all) =>
          all.name === '' ? 'Enter your email' : `Enter email for ${String(all.name)}`
        }
      />
    </Form>,
  )
  expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument()
  await userEvent.type(screen.getByLabelText('Name'), 'Alice')
  expect(screen.getByPlaceholderText('Enter email for Alice')).toBeInTheDocument()
})
```

---

**Step 2: Run the tests to verify they fail**

```bash
pnpm --filter enforma test --run
```

Expected: both new tests FAIL — `label` and `placeholder` do not update reactively yet (they're typed as `string | undefined` in the old code, so TypeScript may error on function arguments too).

If TypeScript errors appear rather than runtime test failures, that's still a "fail" — proceed to step 3.

---

**Step 3: Run tests**

```bash
pnpm --filter enforma test --run
```

Expected: all tests PASS. (No implementation changes needed — `TextInput.tsx` was already updated in Task 1 Step 4.)

---

**Step 4: Run lint**

```bash
pnpm --filter enforma lint
```

Expected: no errors or warnings.

---

**Step 5: Commit**

```bash
git add packages/enforma/src/components/TextInput.test.tsx
git commit -m "test: reactive label and placeholder on TextInput"
```

---

### Task 3: Scope integration tests

Verify that reactive props inside a `Scope` receive `scopeValues` (the scoped subtree) separately from `allValues` (the full form).

**Files:**
- Modify: `packages/enforma/src/components/Scope.test.tsx`

---

**Step 1: Write the tests**

Add these tests inside `describe('Scope', ...)` in `Scope.test.tsx`:

```tsx
it('passes scoped values as first arg and all values as second arg to reactive props', () => {
  const receivedArgs: Array<[unknown, unknown]> = []

  render(
    <Form
      values={{ name: 'Alice', address: { city: 'London' } }}
      onChange={vi.fn()}
    >
      <Scope path="address">
        <TextInput
          bind="city"
          label="City"
          placeholder={(scopeValues, allValues) => {
            receivedArgs.push([scopeValues, allValues])
            return 'placeholder'
          }}
        />
      </Scope>
    </Form>,
  )

  expect(receivedArgs.length).toBeGreaterThan(0)
  const [scopeValues, allValues] = receivedArgs[0]
  // scopeValues is the object at the 'address' prefix
  expect(scopeValues).toEqual({ city: 'London' })
  // allValues is the full form root
  expect(allValues).toEqual({ name: 'Alice', address: { city: 'London' } })
})

it('receives allValues equal to scopeValues at form root (no Scope)', () => {
  const receivedArgs: Array<[unknown, unknown]> = []

  render(
    <Form values={{ name: 'Alice' }} onChange={vi.fn()}>
      <TextInput
        bind="name"
        label="Name"
        placeholder={(scopeValues, allValues) => {
          receivedArgs.push([scopeValues, allValues])
          return 'placeholder'
        }}
      />
    </Form>,
  )

  expect(receivedArgs.length).toBeGreaterThan(0)
  const [scopeValues, allValues] = receivedArgs[0]
  expect(scopeValues).toEqual(allValues)
})
```

---

**Step 2: Run the tests**

```bash
pnpm --filter enforma test --run
```

Expected: all tests PASS — the `useReactiveProp` implementation already handles this correctly via `store.getField(prefix)`.

---

**Step 3: Run the full suite and lint**

```bash
pnpm --filter enforma test --run && pnpm --filter enforma lint
```

Expected: all tests pass, no lint errors.

---

**Step 4: Commit**

```bash
git add packages/enforma/src/components/Scope.test.tsx
git commit -m "test: reactive props inside Scope receive correct scopeValues and allValues"
```
