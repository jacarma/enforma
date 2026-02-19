# Validation and Errors — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add field-level validation to Enforma with reactive cross-field support, error visibility control (show after blur or submit), and form submission gating.

**Architecture:** Validation state (`touched`, `submitted`, `errors`, validator registry) lives in `FormStore`. A new `FormSettingsContext` passes `showErrors` and `messages` from `<Form>` down to fields without prop-drilling. A new `useFieldValidation<T>` hook in `ScopeContext.ts` encapsulates validator registration, error subscription, and blur handling. `TextInput` grows `validate` and `messages` props and renders an error span.

**Tech Stack:** TypeScript strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`, React 18 `useSyncExternalStore` / `useEffect`, Vitest + @testing-library/react + @testing-library/user-event

---

### Task 1: Extend FormStore with validation state

**Files:**
- Modify: `packages/enforma/src/store/FormStore.ts`
- Modify: `packages/enforma/src/store/FormStore.test.ts`

---

**Step 1: Add failing tests**

Append these `describe` blocks inside the existing `describe('FormStore', () => { ... })` in `FormStore.test.ts`, before the closing `})`:

```typescript
  describe('registerValidator', () => {
    it('initializes the error immediately on registration', () => {
      const store = new FormStore({ name: '' })
      store.registerValidator('name', () => 'required')
      expect(store.getError('name')).toBe('required')
    })

    it('initializes null when the validator passes', () => {
      const store = new FormStore({ name: 'Alice' })
      store.registerValidator('name', () => null)
      expect(store.getError('name')).toBeNull()
    })

    it('returns an unregister function that removes the validator and error', () => {
      const store = new FormStore({ name: '' })
      const unregister = store.registerValidator('name', () => 'required')
      unregister()
      expect(store.getError('name')).toBeNull()
    })

    it('notifies subscribers after registration', () => {
      const store = new FormStore({ name: '' })
      const cb = vi.fn()
      store.subscribe(cb)
      store.registerValidator('name', () => 'required')
      expect(cb).toHaveBeenCalledOnce()
    })
  })

  describe('touchField', () => {
    it('marks the field as touched', () => {
      const store = new FormStore({ name: '' })
      expect(store.isTouched('name')).toBe(false)
      store.touchField('name')
      expect(store.isTouched('name')).toBe(true)
    })

    it('notifies subscribers', () => {
      const store = new FormStore({ name: '' })
      const cb = vi.fn()
      store.subscribe(cb)
      store.touchField('name')
      expect(cb).toHaveBeenCalledOnce()
    })
  })

  describe('setSubmitted', () => {
    it('marks the form as submitted', () => {
      const store = new FormStore({})
      expect(store.isSubmitted()).toBe(false)
      store.setSubmitted()
      expect(store.isSubmitted()).toBe(true)
    })

    it('re-runs all validators and updates errors', () => {
      const store = new FormStore({ name: '' })
      store.registerValidator('name', () =>
        store.getField('name') === '' ? 'required' : null,
      )
      store.setSubmitted()
      expect(store.getError('name')).toBe('required')
    })

    it('notifies subscribers', () => {
      const store = new FormStore({})
      const cb = vi.fn()
      store.subscribe(cb)
      store.setSubmitted()
      expect(cb).toHaveBeenCalledOnce()
    })
  })

  describe('isValid', () => {
    it('returns true when no validators are registered', () => {
      const store = new FormStore({})
      expect(store.isValid()).toBe(true)
    })

    it('returns true when all validators pass', () => {
      const store = new FormStore({ name: 'Alice' })
      store.registerValidator('name', () => null)
      expect(store.isValid()).toBe(true)
    })

    it('returns false when any validator has an error', () => {
      const store = new FormStore({ name: '' })
      store.registerValidator('name', () => 'required')
      expect(store.isValid()).toBe(false)
    })
  })

  describe('getErrors', () => {
    it('returns all current errors as a plain object', () => {
      const store = new FormStore({ name: '', email: 'a@b.com' })
      store.registerValidator('name', () => 'required')
      store.registerValidator('email', () => null)
      expect(store.getErrors()).toEqual({ name: 'required', email: null })
    })
  })

  describe('setField re-runs validators', () => {
    it('re-runs all validators after a field change', () => {
      const store = new FormStore({ name: '' })
      store.registerValidator('name', () =>
        store.getField('name') === '' ? 'required' : null,
      )
      expect(store.getError('name')).toBe('required')
      store.setField('name', 'Alice')
      expect(store.getError('name')).toBeNull()
    })
  })
```

**Step 2: Run tests to confirm failures**

```bash
pnpm test
```

Expected: Multiple failures — `store.registerValidator is not a function`, `store.getError is not a function`, etc.

**Step 3: Rewrite FormStore.ts**

Replace the entire file content:

```typescript
type Subscriber = () => void
export type FormValues = Record<string, unknown>

function getByPath(obj: FormValues, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc !== null && typeof acc === 'object' && key in acc) {
      return (acc as FormValues)[key]
    }
    return undefined
  }, obj)
}

function setByPath(obj: FormValues, path: string, value: unknown): FormValues {
  const dotIndex = path.indexOf('.')
  if (dotIndex === -1) {
    return { ...obj, [path]: value }
  }
  const key = path.slice(0, dotIndex)
  const rest = path.slice(dotIndex + 1)
  const existing = obj[key]
  const nested: FormValues =
    existing !== null && typeof existing === 'object'
      ? { ...(existing as FormValues) }
      : {}
  return { ...obj, [key]: setByPath(nested, rest, value) }
}

export class FormStore {
  private _values: FormValues
  private readonly _subscribers = new Set<Subscriber>()
  private readonly _touched = new Set<string>()
  private _submitted = false
  private readonly _errors = new Map<string, string | null>()
  private readonly _validators = new Map<string, () => string | null>()

  constructor(initialValues: FormValues) {
    this._values = { ...initialValues }
  }

  private notifySubscribers(): void {
    for (const cb of this._subscribers) {
      cb()
    }
  }

  getSnapshot(): FormValues {
    return this._values
  }

  subscribe(callback: Subscriber): () => void {
    this._subscribers.add(callback)
    return () => {
      this._subscribers.delete(callback)
    }
  }

  getField(path: string): unknown {
    return getByPath(this._values, path)
  }

  setField(path: string, value: unknown): void {
    this._values = setByPath(this._values, path, value)
    this.runAllValidators()
    this.notifySubscribers()
  }

  registerValidator(path: string, fn: () => string | null): () => void {
    this._validators.set(path, fn)
    this._errors.set(path, fn())
    this.notifySubscribers()
    return () => {
      this._validators.delete(path)
      this._errors.delete(path)
    }
  }

  runAllValidators(): void {
    for (const [path, fn] of this._validators) {
      this._errors.set(path, fn())
    }
  }

  touchField(path: string): void {
    this._touched.add(path)
    this.notifySubscribers()
  }

  setSubmitted(): void {
    this._submitted = true
    this.runAllValidators()
    this.notifySubscribers()
  }

  getError(path: string): string | null {
    return this._errors.get(path) ?? null
  }

  getErrors(): Record<string, string | null> {
    return Object.fromEntries(this._errors)
  }

  isTouched(path: string): boolean {
    return this._touched.has(path)
  }

  isSubmitted(): boolean {
    return this._submitted
  }

  isValid(): boolean {
    for (const error of this._errors.values()) {
      if (error !== null) return false
    }
    return true
  }
}
```

**Step 4: Run tests**

```bash
pnpm test
```

Expected: All tests pass, including the new ones.

**Step 5: Run lint**

```bash
pnpm lint
```

Expected: No errors or warnings.

**Step 6: Commit**

```bash
git add packages/enforma/src/store/FormStore.ts packages/enforma/src/store/FormStore.test.ts
git commit -m "feat: extend FormStore with validation state and methods"
```

---

### Task 2: Create FormSettingsContext

**Files:**
- Create: `packages/enforma/src/context/FormSettingsContext.ts`

---

**Step 1: Create the file**

```typescript
import { createContext, useContext } from 'react'

export interface FormSettings {
  showErrors: boolean
  messages: Partial<Record<string, string>>
}

const defaultSettings: FormSettings = {
  showErrors: false,
  messages: {},
}

export const FormSettingsContext = createContext<FormSettings>(defaultSettings)

export function useFormSettings(): FormSettings {
  return useContext(FormSettingsContext)
}
```

This context has default values so fields outside a `<Form>` don't throw.

**Step 2: Run lint**

```bash
pnpm lint
```

Expected: No errors.

**Step 3: Commit alongside Task 3** (hold off — commit after updating Form.tsx below)

---

### Task 3: Update Form.tsx

Add `onSubmit`, `showErrors`, `messages` props. Update `onChange` to pass validation state. Provide `FormSettingsContext`.

**Files:**
- Modify: `packages/enforma/src/components/Form.tsx`
- Modify: `packages/enforma/src/components/Form.test.tsx`

---

**Step 1: Add failing tests**

Replace the contents of `Form.test.tsx` with the following (preserving all existing tests and adding new ones):

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Form } from './Form'
import { TextInput } from './TextInput'

describe('Form', () => {
  it('renders a <form> element', () => {
    render(<Form values={{}} onChange={() => undefined}>{null}</Form>)
    expect(screen.getByRole('form')).toBeInTheDocument()
  })

  it('renders children inside the form', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <span>child</span>
      </Form>,
    )
    expect(screen.getByText('child')).toBeInTheDocument()
  })

  describe('onSubmit', () => {
    it('calls onSubmit with current values when the form is valid', async () => {
      const onSubmit = vi.fn()
      render(
        <Form values={{ name: 'Alice' }} onChange={vi.fn()} onSubmit={onSubmit}>
          <button type="submit">Submit</button>
        </Form>,
      )
      await userEvent.click(screen.getByRole('button', { name: 'Submit' }))
      expect(onSubmit).toHaveBeenCalledWith({ name: 'Alice' })
    })

    it('does not call onSubmit when a field has a validation error', async () => {
      const onSubmit = vi.fn()
      render(
        <Form values={{ name: '' }} onChange={vi.fn()} onSubmit={onSubmit}>
          <TextInput
            bind="name"
            label="Name"
            validate={(v) => (v === '' ? 'required' : null)}
          />
          <button type="submit">Submit</button>
        </Form>,
      )
      await userEvent.click(screen.getByRole('button', { name: 'Submit' }))
      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('reveals all validation errors after a failed submit', async () => {
      render(
        <Form values={{ name: '' }} onChange={vi.fn()}>
          <TextInput
            bind="name"
            label="Name"
            validate={(v) => (v === '' ? 'Name is required' : null)}
          />
          <button type="submit">Submit</button>
        </Form>,
      )
      await userEvent.click(screen.getByRole('button', { name: 'Submit' }))
      expect(screen.getByText('Name is required')).toBeInTheDocument()
    })
  })

  describe('onChange with validation state', () => {
    it('passes isValid and errors as second argument', async () => {
      const onChange = vi.fn()
      render(
        <Form values={{ name: '' }} onChange={onChange}>
          <TextInput
            bind="name"
            label="Name"
            validate={(v) => (v === '' ? 'required' : null)}
          />
        </Form>,
      )
      await userEvent.type(screen.getByLabelText('Name'), 'A')
      expect(onChange).toHaveBeenLastCalledWith(
        { name: 'A' },
        { isValid: true, errors: { name: null } },
      )
    })
  })

  describe('showErrors', () => {
    it('shows field errors immediately when showErrors is true', () => {
      render(
        <Form values={{ name: '' }} onChange={vi.fn()} showErrors>
          <TextInput
            bind="name"
            label="Name"
            validate={(v) => (v === '' ? 'Name is required' : null)}
          />
        </Form>,
      )
      expect(screen.getByText('Name is required')).toBeInTheDocument()
    })
  })
})
```

**Step 2: Run tests to confirm failures**

```bash
pnpm test
```

Expected: Failures for `onSubmit`, `onChange` validation state, and `showErrors` tests — the new props don't exist yet.

**Step 3: Update Form.tsx**

Replace the entire file:

```typescript
import { useRef, type ReactNode, type FormEvent } from 'react'
import { FormStore, type FormValues } from '../store/FormStore'
import { FormContext } from '../context/FormContext'
import { FormSettingsContext } from '../context/FormSettingsContext'
import { ScopeContext, makeScopeValue } from '../context/ScopeContext'

interface ValidationState {
  isValid: boolean
  errors: Record<string, string | null>
}

interface FormProps {
  values: FormValues
  onChange: (values: FormValues, state: ValidationState) => void
  onSubmit?: (values: FormValues) => void
  showErrors?: boolean
  messages?: Partial<Record<string, string>>
  children: ReactNode
  'aria-label'?: string
}

export function Form({
  values,
  onChange,
  onSubmit,
  showErrors = false,
  messages = {},
  children,
  'aria-label': ariaLabel = 'form',
}: FormProps) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const onSubmitRef = useRef(onSubmit)
  onSubmitRef.current = onSubmit

  const storeRef = useRef<FormStore | null>(null)
  if (storeRef.current === null) {
    const store = new FormStore(values)
    store.subscribe(() => {
      onChangeRef.current(store.getSnapshot(), {
        isValid: store.isValid(),
        errors: store.getErrors(),
      })
    })
    storeRef.current = store
  }

  const store = storeRef.current
  const scopeValue = makeScopeValue(store, '')
  const formSettings = { showErrors, messages }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    store.setSubmitted()
    if (store.isValid()) {
      onSubmitRef.current?.(store.getSnapshot())
    }
  }

  return (
    <FormContext.Provider value={store}>
      <FormSettingsContext.Provider value={formSettings}>
        <ScopeContext.Provider value={scopeValue}>
          <form aria-label={ariaLabel} onSubmit={handleSubmit}>
            {children}
          </form>
        </ScopeContext.Provider>
      </FormSettingsContext.Provider>
    </FormContext.Provider>
  )
}
```

**Step 4: Run tests**

```bash
pnpm test
```

Expected: All tests pass.

**Step 5: Run lint**

```bash
pnpm lint
```

Expected: No errors.

**Step 6: Commit**

```bash
git add packages/enforma/src/context/FormSettingsContext.ts \
        packages/enforma/src/components/Form.tsx \
        packages/enforma/src/components/Form.test.tsx
git commit -m "feat: add onSubmit, showErrors, messages to Form; update onChange signature"
```

---

### Task 4: Add useFieldValidation hook to ScopeContext

This hook registers a combined validator (implicit checks first, then user's `validate`), subscribes to error + touched/submitted state, and returns what a field needs to render its error.

**Files:**
- Modify: `packages/enforma/src/context/ScopeContext.ts`

---

**Step 1: Update imports at the top of ScopeContext.ts**

Change:
```typescript
import { createContext, useContext, useSyncExternalStore } from 'react'
```
To:
```typescript
import { createContext, useContext, useEffect, useRef, useSyncExternalStore } from 'react'
import { useFormSettings } from './FormSettingsContext'
```

**Step 2: Append useFieldValidation to the bottom of ScopeContext.ts**

Add after the last exported function (`extendPrefix`):

```typescript
export function useFieldValidation<T>(
  bind: string,
  validate: ((value: T, scopeValues: FormValues, allValues: FormValues) => string | null) | undefined,
  localMessages: Partial<Record<string, string>> | undefined,
  implicitValidator?: () => string | null,
): { error: string | null; showError: boolean; onBlur: () => void } {
  const { store, prefix } = useScopeValue()
  const { showErrors: formShowErrors, messages: formMessages } = useFormSettings()
  const fullPath = joinPath(prefix, bind)

  // Use refs so the registered validator always sees latest props without re-registering.
  const validateRef = useRef(validate)
  validateRef.current = validate

  const localMessagesRef = useRef(localMessages)
  localMessagesRef.current = localMessages

  const formMessagesRef = useRef(formMessages)
  formMessagesRef.current = formMessages

  const implicitValidatorRef = useRef(implicitValidator)
  implicitValidatorRef.current = implicitValidator

  useEffect(() => {
    const combinedValidator = (): string | null => {
      // 1. Implicit check — returns a message key (e.g. "invalidDate") or null.
      const implicitFn = implicitValidatorRef.current
      if (implicitFn !== undefined) {
        const key = implicitFn()
        if (key !== null) {
          return (
            localMessagesRef.current?.[key] ??
            formMessagesRef.current[key] ??
            key
          )
        }
      }

      // 2. User's validate fn — only runs if implicit check passes.
      const validateFn = validateRef.current
      if (validateFn !== undefined) {
        const fieldValue = store.getField(fullPath) as T
        const allValues = store.getSnapshot()
        const raw = prefix === '' ? allValues : store.getField(prefix)
        const scopeValues: FormValues =
          raw === null || typeof raw !== 'object' ? allValues : (raw as FormValues)
        return validateFn(fieldValue, scopeValues, allValues)
      }

      return null
    }

    return store.registerValidator(fullPath, combinedValidator)
  }, [store, fullPath, prefix])

  const error = useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => store.getError(fullPath),
  )

  const isTouched = useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => store.isTouched(fullPath),
  )

  const isSubmitted = useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => store.isSubmitted(),
  )

  const showError = (isTouched || isSubmitted || formShowErrors) && error !== null

  const onBlur = () => {
    store.touchField(fullPath)
  }

  return { error, showError, onBlur }
}
```

**Step 3: Run all tests**

```bash
pnpm test
```

Expected: All existing tests still pass. (No tests for the hook in isolation — it will be covered by TextInput tests in Task 5.)

**Step 4: Run lint**

```bash
pnpm lint
```

Expected: No errors. If ESLint warns about `useEffect` missing deps, the refs pattern is intentional — add `// eslint-disable-next-line react-hooks/exhaustive-deps` above the `}, [store, fullPath, prefix])` line only if the rule fires.

**Step 5: Commit**

```bash
git add packages/enforma/src/context/ScopeContext.ts
git commit -m "feat: add useFieldValidation hook to ScopeContext"
```

---

### Task 5: Add validation UI to TextInput

**Files:**
- Modify: `packages/enforma/src/components/TextInput.tsx`
- Modify: `packages/enforma/src/components/TextInput.test.tsx`

---

**Step 1: Add failing tests**

Append this `describe` block inside the existing `describe('TextInput', () => { ... })` in `TextInput.test.tsx`, before the closing `})`:

```typescript
  describe('validation', () => {
    it('does not show an error initially even when validate returns one', () => {
      render(
        <Form values={{ name: '' }} onChange={vi.fn()}>
          <TextInput
            bind="name"
            label="Name"
            validate={(v) => (v === '' ? 'required' : null)}
          />
        </Form>,
      )
      expect(screen.queryByText('required')).not.toBeInTheDocument()
    })

    it('shows the error after the field is blurred', async () => {
      render(
        <Form values={{ name: '' }} onChange={vi.fn()}>
          <TextInput
            bind="name"
            label="Name"
            validate={(v) => (v === '' ? 'required' : null)}
          />
        </Form>,
      )
      await userEvent.click(screen.getByLabelText('Name'))
      await userEvent.tab()
      expect(screen.getByText('required')).toBeInTheDocument()
    })

    it('hides the error once the user fixes the value after blur', async () => {
      render(
        <Form values={{ name: '' }} onChange={vi.fn()}>
          <TextInput
            bind="name"
            label="Name"
            validate={(v) => (v === '' ? 'required' : null)}
          />
        </Form>,
      )
      await userEvent.click(screen.getByLabelText('Name'))
      await userEvent.tab()
      expect(screen.getByText('required')).toBeInTheDocument()
      await userEvent.type(screen.getByLabelText('Name'), 'Alice')
      expect(screen.queryByText('required')).not.toBeInTheDocument()
    })

    it('shows the error immediately when Form has showErrors', () => {
      render(
        <Form values={{ name: '' }} onChange={vi.fn()} showErrors>
          <TextInput
            bind="name"
            label="Name"
            validate={(v) => (v === '' ? 'required' : null)}
          />
        </Form>,
      )
      expect(screen.getByText('required')).toBeInTheDocument()
    })

    it('does not show an error when validate returns null', () => {
      render(
        <Form values={{ name: 'Alice' }} onChange={vi.fn()} showErrors>
          <TextInput
            bind="name"
            label="Name"
            validate={(v) => (v === '' ? 'required' : null)}
          />
        </Form>,
      )
      expect(screen.queryByText('required')).not.toBeInTheDocument()
    })

    it('updates error reactively when another field changes', async () => {
      render(
        <Form values={{ password: '', confirm: '' }} onChange={vi.fn()}>
          <TextInput bind="password" label="Password" />
          <TextInput
            bind="confirm"
            label="Confirm"
            validate={(v, _, all) =>
              v !== all['password'] ? 'Passwords do not match' : null
            }
          />
        </Form>,
      )
      // Touch the confirm field so errors are visible
      await userEvent.click(screen.getByLabelText('Confirm'))
      await userEvent.tab()
      // Both are empty so they match — no error yet
      expect(screen.queryByText('Passwords do not match')).not.toBeInTheDocument()
      // Type in password — confirm should re-validate reactively
      await userEvent.type(screen.getByLabelText('Password'), 'secret')
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    })
  })
```

**Step 2: Run tests to confirm failures**

```bash
pnpm test
```

Expected: All new validation tests fail — `validate` prop doesn't exist yet.

**Step 3: Update TextInput.tsx**

Replace the entire file:

```typescript
import { useId } from 'react'
import { useFormValue, useReactiveProp, useFieldValidation } from '../context/ScopeContext'
import type { Reactive } from '../context/ScopeContext'
import type { FormValues } from '../store/FormStore'

interface TextInputProps {
  bind: string
  label?: Reactive<string>
  placeholder?: Reactive<string>
  disabled?: Reactive<boolean>
  id?: string
  validate?: (value: string, scopeValues: FormValues, allValues: FormValues) => string | null
  messages?: Partial<Record<string, string>>
}

export function TextInput({
  bind,
  label,
  disabled,
  placeholder,
  id,
  validate,
  messages,
}: TextInputProps) {
  const [value, setValue] = useFormValue(bind)
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`

  const resolvedLabel = useReactiveProp(label)
  const resolvedDisabled = useReactiveProp(disabled)
  const resolvedPlaceholder = useReactiveProp(placeholder)

  const { error, showError, onBlur } = useFieldValidation<string>(
    bind,
    validate,
    messages,
  )

  return (
    <div>
      {resolvedLabel !== undefined && <label htmlFor={inputId}>{resolvedLabel}</label>}
      <input
        id={inputId}
        type="text"
        value={value}
        placeholder={resolvedPlaceholder}
        disabled={resolvedDisabled}
        aria-describedby={showError ? errorId : undefined}
        aria-invalid={showError || undefined}
        onBlur={onBlur}
        onChange={(e) => {
          setValue(e.target.value)
        }}
      />
      {showError && (
        <span id={errorId} role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
```

**Step 4: Run all tests**

```bash
pnpm test
```

Expected: All tests pass, including all new validation tests.

**Step 5: Run lint**

```bash
pnpm lint
```

Expected: No errors or warnings.

**Step 6: Commit**

```bash
git add packages/enforma/src/components/TextInput.tsx \
        packages/enforma/src/components/TextInput.test.tsx
git commit -m "feat: add validate prop and error display to TextInput"
```

---

### Done

All four tasks complete. Validation is live:

- `FormStore` tracks `touched`, `submitted`, `errors`, and a validator registry
- `setField` re-runs all validators on every change (reactive cross-field validation)
- `FormSettingsContext` distributes `showErrors` and `messages` without prop drilling
- `useFieldValidation<T>` registers validators on mount, subscribes to error state, handles blur
- `TextInput` accepts `validate` and `messages` props and renders an accessible error span
- `<Form onSubmit>` only fires when the form is valid; failed submits reveal all errors
- `onChange` now receives `(values, { isValid, errors })` as its second argument
