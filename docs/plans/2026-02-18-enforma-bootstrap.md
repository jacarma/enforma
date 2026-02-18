# Enforma Bootstrap Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bootstrap the enforma monorepo with strict TypeScript, ESLint, Vitest, and implement `Enforma.Form` + `Enforma.TextInput` using a custom ref-based store and `useSyncExternalStore` for granular re-renders.

**Architecture:** pnpm workspaces monorepo with `packages/enforma` (Vite library mode) and `apps/demo` (Vite React app). State lives in a plain JS object outside React; components subscribe via `useSyncExternalStore` with a per-field selector so only the changed field re-renders.

**Tech Stack:** pnpm, TypeScript 5 (strict), Vite 6, Vitest 2, @testing-library/react, ESLint 9 (flat config), typescript-eslint strict-type-checked, React 18.

---

## Task 1: Root monorepo scaffolding

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `package.json`
- Create: `.gitignore`
- Create: `CLAUDE.md`

### Step 1: Create pnpm-workspace.yaml

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

### Step 2: Create root package.json

```json
{
  "name": "enforma-root",
  "private": true,
  "scripts": {
    "lint": "pnpm -r lint",
    "test": "pnpm -r test",
    "build": "pnpm -r --filter './packages/*' build",
    "dev": "pnpm --filter demo dev"
  },
  "engines": {
    "node": ">=20",
    "pnpm": ">=9"
  }
}
```

### Step 3: Create .gitignore

```
node_modules
dist
.turbo
*.local
coverage
```

### Step 4: Create CLAUDE.md

```markdown
# Enforma

## Mandatory rules at every step

- Run `pnpm lint` before any commit. It must pass with no errors or warnings.
- Run `pnpm test` before any commit. All tests must pass.
- A step is not considered complete until both commands pass with no errors.

## Stack

- pnpm workspaces (monorepo)
- TypeScript strict
- Vite (library mode in packages/enforma, app in apps/demo)
- Vitest + @testing-library/react
- ESLint 9 flat config with typescript-eslint strict-type-checked

## Structure

- `packages/enforma` — publishable library
- `apps/demo` — development playground
```

### Step 5: Commit

```bash
git add pnpm-workspace.yaml package.json .gitignore CLAUDE.md
git commit -m "chore: root monorepo scaffolding"
```

---

## Task 2: packages/enforma config

**Files:**
- Create: `packages/enforma/package.json`
- Create: `packages/enforma/tsconfig.json`
- Create: `packages/enforma/vite.config.ts`
- Create: `packages/enforma/eslint.config.js`

### Step 1: Create packages/enforma/package.json

```json
{
  "name": "enforma",
  "version": "0.0.1",
  "private": false,
  "type": "module",
  "main": "./dist/enforma.cjs",
  "module": "./dist/enforma.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/enforma.js",
      "require": "./dist/enforma.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc --noEmit && vite build",
    "dev": "vite build --watch",
    "lint": "eslint src",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "peerDependencies": {
    "react": ">=18",
    "react-dom": ">=18"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.2.0",
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "@vitejs/plugin-react": "^4.3.4",
    "eslint": "^9.20.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "typescript": "^5.7.3",
    "typescript-eslint": "^8.24.0",
    "vite": "^6.1.0",
    "vite-plugin-dts": "^4.5.0",
    "vitest": "^2.1.9"
  }
}
```

### Step 2: Create packages/enforma/tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

### Step 3: Create packages/enforma/vite.config.ts

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    dts({ include: ['src'], exclude: ['src/**/*.test.*', 'src/test'] }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Enforma',
      fileName: 'enforma',
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime',
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

### Step 4: Create packages/enforma/eslint.config.js

```js
// @ts-check
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['dist', 'coverage'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
)
```

### Step 5: Commit

```bash
git add packages/
git commit -m "chore: add packages/enforma project config"
```

---

## Task 3: apps/demo config

**Files:**
- Create: `apps/demo/package.json`
- Create: `apps/demo/tsconfig.json`
- Create: `apps/demo/vite.config.ts`
- Create: `apps/demo/index.html`
- Create: `apps/demo/src/main.tsx`
- Create: `apps/demo/src/App.tsx`

### Step 1: Create apps/demo/package.json

```json
{
  "name": "demo",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint src",
    "test": "echo 'No tests in demo'"
  },
  "dependencies": {
    "enforma": "workspace:*"
  },
  "devDependencies": {
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "@vitejs/plugin-react": "^4.3.4",
    "eslint": "^9.20.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "typescript": "^5.7.3",
    "typescript-eslint": "^8.24.0",
    "vite": "^6.1.0"
  }
}
```

### Step 2: Create apps/demo/tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

### Step 3: Create apps/demo/vite.config.ts

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

### Step 4: Create apps/demo/index.html

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Enforma Demo</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### Step 5: Create apps/demo/src/main.tsx

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'

const root = document.getElementById('root')
if (root === null) throw new Error('Root element not found')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

### Step 6: Create apps/demo/src/App.tsx (placeholder)

```tsx
export function App() {
  return <div><h1>Enforma Demo</h1></div>
}
```

### Step 7: Create apps/demo/eslint.config.js

```js
// @ts-check
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      ...tseslint.configs.strictTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
)
```

### Step 8: Commit

```bash
git add apps/
git commit -m "chore: add apps/demo project config"
```

---

## Task 4: Install dependencies and verify setup

### Step 1: Install from root

```bash
pnpm install
```

Expected: Lockfile created, all packages resolved, no errors.

### Step 2: Create test setup file

```bash
mkdir -p packages/enforma/src/test
```

Create `packages/enforma/src/test/setup.ts`:

```ts
import '@testing-library/jest-dom'
```

### Step 3: Create placeholder src/index.ts so lint doesn't fail on empty src

Create `packages/enforma/src/index.ts`:

```ts
// Entry point — populated in later tasks
export {}
```

### Step 4: Run lint

```bash
pnpm lint
```

Expected: Passes (only placeholder file exists).

### Step 5: Run tests

```bash
pnpm test
```

Expected: Passes (no test files yet, Vitest exits cleanly).

### Step 6: Commit

```bash
git add packages/enforma/src/
git commit -m "chore: install deps and add test setup"
```

---

## Task 5: FormStore — tests first

**Files:**
- Create: `packages/enforma/src/store/FormStore.test.ts`

### Step 1: Create the test file

```ts
// packages/enforma/src/store/FormStore.test.ts
import { describe, it, expect, vi } from 'vitest'
import { FormStore } from './FormStore'

describe('FormStore', () => {
  describe('getField', () => {
    it('gets a top-level field', () => {
      const store = new FormStore({ name: 'Alice' })
      expect(store.getField('name')).toBe('Alice')
    })

    it('gets a nested field via dot-path', () => {
      const store = new FormStore({ user: { name: 'Alice' } })
      expect(store.getField('user.name')).toBe('Alice')
    })

    it('returns undefined for a missing field', () => {
      const store = new FormStore({})
      expect(store.getField('missing')).toBeUndefined()
    })

    it('returns undefined for a missing nested field', () => {
      const store = new FormStore({ user: {} })
      expect(store.getField('user.missing')).toBeUndefined()
    })
  })

  describe('setField', () => {
    it('sets a top-level field', () => {
      const store = new FormStore({ name: '' })
      store.setField('name', 'Bob')
      expect(store.getField('name')).toBe('Bob')
    })

    it('sets a nested field via dot-path', () => {
      const store = new FormStore({ user: { name: '' } })
      store.setField('user.name', 'Bob')
      expect(store.getField('user.name')).toBe('Bob')
    })

    it('does not mutate other fields when setting', () => {
      const store = new FormStore({ name: 'Alice', email: 'a@b.com' })
      store.setField('name', 'Bob')
      expect(store.getField('email')).toBe('a@b.com')
    })

    it('notifies all subscribers after a set', () => {
      const store = new FormStore({ name: '' })
      const cb1 = vi.fn()
      const cb2 = vi.fn()
      store.subscribe(cb1)
      store.subscribe(cb2)
      store.setField('name', 'Bob')
      expect(cb1).toHaveBeenCalledOnce()
      expect(cb2).toHaveBeenCalledOnce()
    })
  })

  describe('subscribe', () => {
    it('returns an unsubscribe function that stops notifications', () => {
      const store = new FormStore({ name: '' })
      const cb = vi.fn()
      const unsubscribe = store.subscribe(cb)
      unsubscribe()
      store.setField('name', 'Bob')
      expect(cb).not.toHaveBeenCalled()
    })
  })

  describe('getSnapshot', () => {
    it('returns the current values object', () => {
      const store = new FormStore({ name: 'Alice' })
      expect(store.getSnapshot()).toMatchObject({ name: 'Alice' })
    })

    it('returns a new object reference after setField', () => {
      const store = new FormStore({ name: '' })
      const before = store.getSnapshot()
      store.setField('name', 'Bob')
      const after = store.getSnapshot()
      expect(before).not.toBe(after)
    })
  })
})
```

### Step 2: Run tests — expect failure

```bash
pnpm --filter enforma test
```

Expected: FAIL — `Cannot find module './FormStore'`

---

## Task 6: FormStore — implementation

**Files:**
- Create: `packages/enforma/src/store/FormStore.ts`

### Step 1: Implement FormStore

```ts
// packages/enforma/src/store/FormStore.ts
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
  const keys = path.split('.')
  const result: FormValues = { ...obj }
  let current: FormValues = result

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i] as string
    const existing = current[key]
    const nested: FormValues =
      existing !== null && typeof existing === 'object'
        ? { ...(existing as FormValues) }
        : {}
    current[key] = nested
    current = nested
  }

  const lastKey = keys[keys.length - 1] as string
  current[lastKey] = value
  return result
}

export class FormStore {
  private _values: FormValues
  private readonly _subscribers = new Set<Subscriber>()

  constructor(initialValues: FormValues) {
    this._values = { ...initialValues }
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
    for (const cb of this._subscribers) {
      cb()
    }
  }
}
```

### Step 2: Run tests — expect pass

```bash
pnpm --filter enforma test
```

Expected: All 11 tests PASS.

### Step 3: Run lint

```bash
pnpm --filter enforma lint
```

Expected: No errors.

### Step 4: Commit

```bash
git add packages/enforma/src/store/
git commit -m "feat: implement FormStore with pub-sub and dot-path resolution"
```

---

## Task 7: FormContext

**Files:**
- Create: `packages/enforma/src/context/FormContext.ts`

No test needed — it's a thin React context wrapper. The error path is exercised by the component tests.

### Step 1: Implement FormContext

```ts
// packages/enforma/src/context/FormContext.ts
import { createContext, useContext } from 'react'
import type { FormStore } from '../store/FormStore'

export const FormContext = createContext<FormStore | null>(null)

export function useFormStore(): FormStore {
  const store = useContext(FormContext)
  if (store === null) {
    throw new Error('useFormStore must be used within <Enforma.Form>')
  }
  return store
}
```

### Step 2: Run lint

```bash
pnpm --filter enforma lint
```

Expected: No errors.

### Step 3: Commit

```bash
git add packages/enforma/src/context/
git commit -m "feat: add FormContext and useFormStore hook"
```

---

## Task 8: Enforma.Form — tests first

**Files:**
- Create: `packages/enforma/src/components/Form.test.tsx`

### Step 1: Create test file

```tsx
// packages/enforma/src/components/Form.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Form } from './Form'

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
})
```

> Note: `getByRole('form')` requires the `<form>` to have an accessible name (`aria-label`). We'll add one in the implementation.

### Step 2: Run tests — expect failure

```bash
pnpm --filter enforma test
```

Expected: FAIL — `Cannot find module './Form'`

---

## Task 9: Enforma.Form — implementation

**Files:**
- Create: `packages/enforma/src/components/Form.tsx`

### Step 1: Implement Form

```tsx
// packages/enforma/src/components/Form.tsx
import { useRef, type ReactNode } from 'react'
import { FormStore, type FormValues } from '../store/FormStore'
import { FormContext } from '../context/FormContext'

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

  return (
    <FormContext.Provider value={storeRef.current}>
      <form aria-label={ariaLabel}>{children}</form>
    </FormContext.Provider>
  )
}
```

### Step 2: Run tests — expect pass

```bash
pnpm --filter enforma test
```

Expected: All tests PASS.

### Step 3: Run lint

```bash
pnpm --filter enforma lint
```

Expected: No errors.

### Step 4: Commit

```bash
git add packages/enforma/src/components/Form.tsx packages/enforma/src/components/Form.test.tsx
git commit -m "feat: implement Enforma.Form component"
```

---

## Task 10: Enforma.TextInput — tests first

**Files:**
- Create: `packages/enforma/src/components/TextInput.test.tsx`

### Step 1: Create test file

```tsx
// packages/enforma/src/components/TextInput.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Form } from './Form'
import { TextInput } from './TextInput'

function renderWithForm(
  initialValues: Record<string, unknown>,
  onChange = vi.fn(),
) {
  return render(
    <Form values={initialValues} onChange={onChange}>
      <TextInput bind="name" label="Name" />
    </Form>,
  )
}

describe('TextInput', () => {
  it('renders an input with a label', () => {
    renderWithForm({ name: '' })
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
  })

  it('displays the initial value from the form state', () => {
    renderWithForm({ name: 'Alice' })
    expect(screen.getByLabelText('Name')).toHaveValue('Alice')
  })

  it('calls onChange with updated values when the user types', async () => {
    const onChange = vi.fn()
    renderWithForm({ name: '' }, onChange)
    await userEvent.type(screen.getByLabelText('Name'), 'Bob')
    expect(onChange).toHaveBeenLastCalledWith({ name: 'Bob' })
  })

  it('renders a placeholder when provided', () => {
    render(
      <Form values={{ name: '' }} onChange={vi.fn()}>
        <TextInput bind="name" label="Name" placeholder="Enter name" />
      </Form>,
    )
    expect(screen.getByPlaceholderText('Enter name')).toBeInTheDocument()
  })

  it('only re-renders when its own bound field changes', async () => {
    let nameRenderCount = 0
    let emailRenderCount = 0

    function CountingNameInput() {
      nameRenderCount++
      return <TextInput bind="name" label="Name" />
    }
    function CountingEmailInput() {
      emailRenderCount++
      return <TextInput bind="email" label="Email" />
    }

    render(
      <Form values={{ name: '', email: '' }} onChange={vi.fn()}>
        <CountingNameInput />
        <CountingEmailInput />
      </Form>,
    )

    const initialNameRenders = nameRenderCount
    const initialEmailRenders = emailRenderCount

    await userEvent.type(screen.getByLabelText('Name'), 'A')

    // Name input re-rendered, email did not
    expect(nameRenderCount).toBeGreaterThan(initialNameRenders)
    expect(emailRenderCount).toBe(initialEmailRenders)
  })
})
```

### Step 2: Install userEvent (needed for tests)

Add to `packages/enforma/package.json` devDependencies:

```json
"@testing-library/user-event": "^14.5.2"
```

Then run:

```bash
pnpm install
```

### Step 3: Run tests — expect failure

```bash
pnpm --filter enforma test
```

Expected: FAIL — `Cannot find module './TextInput'`

---

## Task 11: Enforma.TextInput — implementation

**Files:**
- Create: `packages/enforma/src/components/TextInput.tsx`

### Step 1: Implement TextInput

```tsx
// packages/enforma/src/components/TextInput.tsx
import { useSyncExternalStore, useId } from 'react'
import { useFormStore } from '../context/FormContext'

interface TextInputProps {
  bind: string
  label?: string
  placeholder?: string
  id?: string
}

export function TextInput({ bind, label, placeholder, id }: TextInputProps) {
  const store = useFormStore()
  const generatedId = useId()
  const inputId = id ?? generatedId

  const value = useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => {
      const fieldValue = store.getField(bind)
      return typeof fieldValue === 'string' ? fieldValue : ''
    },
  )

  return (
    <div>
      {label !== undefined && <label htmlFor={inputId}>{label}</label>}
      <input
        id={inputId}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          store.setField(bind, e.target.value)
        }}
      />
    </div>
  )
}
```

### Step 2: Run tests — expect pass

```bash
pnpm --filter enforma test
```

Expected: All tests PASS.

### Step 3: Run lint

```bash
pnpm --filter enforma lint
```

Expected: No errors.

### Step 4: Commit

```bash
git add packages/enforma/src/components/TextInput.tsx packages/enforma/src/components/TextInput.test.tsx
git commit -m "feat: implement Enforma.TextInput with granular re-renders via useSyncExternalStore"
```

---

## Task 12: Namespace export + build

**Files:**
- Modify: `packages/enforma/src/index.ts`

### Step 1: Update index.ts

```ts
// packages/enforma/src/index.ts
import { Form } from './components/Form'
import { TextInput } from './components/TextInput'

const Enforma = { Form, TextInput } as const

export default Enforma
export type { FormValues } from './store/FormStore'
```

### Step 2: Run all tests

```bash
pnpm test
```

Expected: All tests PASS.

### Step 3: Run lint

```bash
pnpm lint
```

Expected: No errors.

### Step 4: Build the library

```bash
pnpm build
```

Expected: `packages/enforma/dist/` created with `enforma.js`, `enforma.cjs`, and `.d.ts` files.

### Step 5: Commit

```bash
git add packages/enforma/src/index.ts
git commit -m "feat: export Enforma namespace from index"
```

---

## Task 13: Wire up demo app

**Files:**
- Modify: `apps/demo/src/App.tsx`

### Step 1: Update App.tsx to use Enforma

```tsx
// apps/demo/src/App.tsx
import { useState } from 'react'
import Enforma, { type FormValues } from 'enforma'

const INITIAL_VALUES: FormValues = {
  name: '',
  email: '',
  address: {
    city: '',
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
        <Enforma.TextInput bind="address.city" label="City" placeholder="City" />
      </Enforma.Form>

      <pre style={{ marginTop: '2rem', background: '#f4f4f4', padding: '1rem' }}>
        {JSON.stringify(values, null, 2)}
      </pre>
    </div>
  )
}
```

### Step 2: Run the demo

```bash
pnpm dev
```

Expected: Browser opens at `http://localhost:5173`. Three inputs visible. Typing updates the JSON preview below. Each input updates independently.

### Step 3: Run lint

```bash
pnpm lint
```

Expected: No errors.

### Step 4: Final commit

```bash
git add apps/demo/src/App.tsx
git commit -m "feat: wire up demo app with Enforma.Form and Enforma.TextInput"
```

---

## Verification checklist

Before considering this complete:

- [ ] `pnpm lint` passes with zero errors or warnings
- [ ] `pnpm test` passes — all tests green
- [ ] `pnpm build` produces dist files in `packages/enforma/dist/`
- [ ] `pnpm dev` runs the demo app without console errors
- [ ] Typing in one input does not cause the other inputs to re-render (verify with React DevTools Profiler if desired)
