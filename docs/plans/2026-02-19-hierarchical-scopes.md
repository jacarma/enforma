# Hierarchical Scopes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `<Enforma.Scope path="...">` so child inputs resolve their `bind` relative to the scope path, using a single `useFormValue(bind)` hook that handles both path joining and store access.

**Architecture:** `ScopeContext` holds `{ store, prefix }` and is provided by `Form` at the root (prefix `''`). `Scope` re-provides it with an updated prefix. Input components call only `useFormValue(bind)` — they know nothing about the store or path resolution. `FormContext` stays but becomes internal-only.

**Tech Stack:** React 18, TypeScript strict, Vitest + @testing-library/react, `useSyncExternalStore`.

---

## Task 1: Create ScopeContext with useFormValue hook

**Files:**
- Create: `packages/enforma/src/context/ScopeContext.ts`

No test needed — this is a thin context + hook. The hook behavior is fully exercised by `Scope.test.tsx` and the updated `TextInput.test.tsx`.

### Step 1: Create `ScopeContext.ts`

```ts
// packages/enforma/src/context/ScopeContext.ts
import { createContext, useContext, useSyncExternalStore } from 'react'
import type { FormStore } from '../store/FormStore'

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

export function makeScopeValue(store: FormStore, prefix: string): ScopeValue {
  return { store, prefix }
}

export function extendPrefix(parent: ScopeValue, path: string): ScopeValue {
  return { store: parent.store, prefix: joinPath(parent.prefix, path) }
}
```

### Step 2: Run lint

```bash
pnpm --filter enforma lint
```

Expected: No errors.

### Step 3: Commit

```bash
git add packages/enforma/src/context/ScopeContext.ts
git commit -m "feat: add ScopeContext and useFormValue hook"
```

---

## Task 2: Update Form to provide ScopeContext at root

**Files:**
- Modify: `packages/enforma/src/components/Form.tsx`

`Form` creates the store (as before) and also wraps children in `ScopeContext.Provider` with `prefix: ''`. This means inputs always have a `ScopeContext`, even when not inside any `Scope`.

### Step 1: Update `Form.tsx`

```tsx
// packages/enforma/src/components/Form.tsx
import { useRef, type ReactNode } from 'react'
import { FormStore, type FormValues } from '../store/FormStore'
import { FormContext } from '../context/FormContext'
import { ScopeContext, makeScopeValue } from '../context/ScopeContext'

interface FormProps {
  values: FormValues
  onChange: (values: FormValues) => void
  children: ReactNode
  'aria-label'?: string
}

export function Form({
  values,
  onChange,
  children,
  'aria-label': ariaLabel = 'form',
}: FormProps) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const storeRef = useRef<FormStore | null>(null)
  if (storeRef.current === null) {
    const store = new FormStore(values)
    store.subscribe(() => {
      onChangeRef.current(store.getSnapshot())
    })
    storeRef.current = store
  }

  const store = storeRef.current
  const scopeValue = makeScopeValue(store, '')

  return (
    <FormContext.Provider value={store}>
      <ScopeContext.Provider value={scopeValue}>
        <form aria-label={ariaLabel}>{children}</form>
      </ScopeContext.Provider>
    </FormContext.Provider>
  )
}
```

### Step 2: Run existing tests — must still pass

```bash
pnpm --filter enforma test
```

Expected: All existing tests PASS (Form and TextInput tests are unaffected — TextInput still uses `useFormStore` at this point).

### Step 3: Run lint

```bash
pnpm --filter enforma lint
```

Expected: No errors.

### Step 4: Commit

```bash
git add packages/enforma/src/components/Form.tsx
git commit -m "feat: Form provides ScopeContext at root with empty prefix"
```

---

## Task 3: Create Scope component — tests first

**Files:**
- Create: `packages/enforma/src/components/Scope.test.tsx`

### Step 1: Write the failing tests

```tsx
// packages/enforma/src/components/Scope.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Form } from './Form'
import { TextInput } from './TextInput'
import { Scope } from './Scope'

describe('Scope', () => {
  it('prefixes bind paths for child inputs', async () => {
    const onChange = vi.fn()
    render(
      <Form values={{ address: { city: '' } }} onChange={onChange}>
        <Scope path="address">
          <TextInput bind="city" label="City" />
        </Scope>
      </Form>,
    )
    await userEvent.type(screen.getByLabelText('City'), 'London')
    expect(onChange).toHaveBeenLastCalledWith({ address: { city: 'London' } })
  })

  it('displays the initial value from the scoped path', () => {
    render(
      <Form values={{ address: { city: 'Paris' } }} onChange={vi.fn()}>
        <Scope path="address">
          <TextInput bind="city" label="City" />
        </Scope>
      </Form>,
    )
    expect(screen.getByLabelText('City')).toHaveValue('Paris')
  })

  it('supports nested Scopes', async () => {
    const onChange = vi.fn()
    render(
      <Form values={{ address: { street: { line1: '' } } }} onChange={onChange}>
        <Scope path="address">
          <Scope path="street">
            <TextInput bind="line1" label="Line 1" />
          </Scope>
        </Scope>
      </Form>,
    )
    await userEvent.type(screen.getByLabelText('Line 1'), 'Baker St')
    expect(onChange).toHaveBeenLastCalledWith({
      address: { street: { line1: 'Baker St' } },
    })
  })

  it('does not affect sibling inputs outside the Scope', async () => {
    const onChange = vi.fn()
    render(
      <Form values={{ name: '', address: { city: '' } }} onChange={onChange}>
        <TextInput bind="name" label="Name" />
        <Scope path="address">
          <TextInput bind="city" label="City" />
        </Scope>
      </Form>,
    )
    await userEvent.type(screen.getByLabelText('Name'), 'Alice')
    expect(onChange).toHaveBeenLastCalledWith({ name: 'Alice', address: { city: '' } })
  })
})
```

### Step 2: Run tests — expect failure

```bash
pnpm --filter enforma test
```

Expected: FAIL — `Cannot find module './Scope'`

---

## Task 4: Implement Scope component

**Files:**
- Create: `packages/enforma/src/components/Scope.tsx`

### Step 1: Implement `Scope.tsx`

```tsx
// packages/enforma/src/components/Scope.tsx
import { useContext, type ReactNode } from 'react'
import { ScopeContext, extendPrefix } from '../context/ScopeContext'

interface ScopeProps {
  path: string
  children: ReactNode
}

export function Scope({ path, children }: ScopeProps) {
  const parent = useContext(ScopeContext)
  if (parent === null) {
    throw new Error('<Enforma.Scope> must be used within <Enforma.Form>')
  }
  const scopeValue = extendPrefix(parent, path)
  return (
    <ScopeContext.Provider value={scopeValue}>
      {children}
    </ScopeContext.Provider>
  )
}
```

### Step 2: Run tests — expect pass

```bash
pnpm --filter enforma test
```

Expected: All tests PASS (Scope tests + all previous tests).

### Step 3: Run lint

```bash
pnpm --filter enforma lint
```

Expected: No errors.

### Step 4: Commit

```bash
git add packages/enforma/src/components/Scope.tsx packages/enforma/src/components/Scope.test.tsx
git commit -m "feat: implement Enforma.Scope component"
```

---

## Task 5: Update TextInput to use useFormValue

**Files:**
- Modify: `packages/enforma/src/components/TextInput.tsx`

This removes `useFormStore`, `useSyncExternalStore`, and manual path wiring — replacing them with a single `useFormValue` call. Existing `TextInput.test.tsx` must pass without changes.

### Step 1: Update `TextInput.tsx`

```tsx
// packages/enforma/src/components/TextInput.tsx
import { useId } from 'react'
import { useFormValue } from '../context/ScopeContext'

interface TextInputProps {
  bind: string
  label?: string
  placeholder?: string
  id?: string
}

export function TextInput({ bind, label, placeholder, id }: TextInputProps) {
  const [value, setValue] = useFormValue(bind)
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <div>
      {label !== undefined && <label htmlFor={inputId}>{label}</label>}
      <input
        id={inputId}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          setValue(e.target.value)
        }}
      />
    </div>
  )
}
```

### Step 2: Run all tests — must all pass

```bash
pnpm --filter enforma test
```

Expected: All tests PASS (existing TextInput tests, Form tests, and Scope tests).

### Step 3: Run lint

```bash
pnpm --filter enforma lint
```

Expected: No errors.

### Step 4: Commit

```bash
git add packages/enforma/src/components/TextInput.tsx
git commit -m "refactor: TextInput uses useFormValue, removing direct store dependency"
```

---

## Task 6: Export Scope and update demo

**Files:**
- Modify: `packages/enforma/src/index.ts`
- Modify: `apps/demo/src/App.tsx`

### Step 1: Update `index.ts`

```ts
// packages/enforma/src/index.ts
import { Form } from './components/Form'
import { TextInput } from './components/TextInput'
import { Scope } from './components/Scope'

const Enforma = { Form, TextInput, Scope } as const

export default Enforma
export type { FormValues } from './store/FormStore'
```

### Step 2: Update demo `App.tsx` to show Scope in action

```tsx
// apps/demo/src/App.tsx
import { useState } from 'react'
import Enforma, { type FormValues } from 'enforma'

const INITIAL_VALUES: FormValues = {
  name: '',
  email: '',
  address: {
    city: '',
    street: {
      line1: '',
    },
  },
}

export function App() {
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES)

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Enforma Demo</h1>

      <Enforma.Form values={values} onChange={setValues} aria-label="demo form">
        <Enforma.TextInput bind="name" label="Name" placeholder="Your name" />
        <Enforma.TextInput bind="email" label="Email" placeholder="your@email.com" />

        <fieldset>
          <legend>Address</legend>
          <Enforma.Scope path="address">
            <Enforma.TextInput bind="city" label="City" placeholder="City" />
            <Enforma.Scope path="street">
              <Enforma.TextInput bind="line1" label="Street line 1" placeholder="123 Main St" />
            </Enforma.Scope>
          </Enforma.Scope>
        </fieldset>
      </Enforma.Form>

      <pre style={{ marginTop: '2rem', background: '#f4f4f4', padding: '1rem' }}>
        {JSON.stringify(values, null, 2)}
      </pre>
    </div>
  )
}
```

### Step 3: Run all tests

```bash
pnpm test
```

Expected: All tests PASS.

### Step 4: Run lint

```bash
pnpm lint
```

Expected: No errors.

### Step 5: Commit

```bash
git add packages/enforma/src/index.ts apps/demo/src/App.tsx
git commit -m "feat: export Enforma.Scope and update demo with nested scopes"
```

---

## Task 7: Remove Task 1 from TODO and verify

**Files:**
- Modify: `docs/TODO.md`

### Step 1: Remove Task 1 from TODO.md

Delete the entire `## Task 1: Hierarchical scopes` section (lines 9–17).

### Step 2: Run final verification

```bash
pnpm lint && pnpm test
```

Expected: No errors, all tests pass.

### Step 3: Commit

```bash
git add docs/TODO.md
git commit -m "docs: mark Task 1 (hierarchical scopes) as complete"
```

---

## Verification checklist

- [ ] `pnpm lint` passes with zero errors or warnings
- [ ] `pnpm test` passes — all tests green, including new Scope tests
- [ ] `<TextInput>` outside any `<Scope>` still works (backward-compatible)
- [ ] `<TextInput>` inside `<Scope>` resolves to prefixed path
- [ ] Nested `<Scope>` chains paths correctly
- [ ] `TextInput.tsx` no longer imports `useFormStore` or `useSyncExternalStore`
- [ ] `docs/TODO.md` Task 1 section removed
