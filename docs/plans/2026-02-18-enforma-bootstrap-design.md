# Enforma — Bootstrap Design

**Date:** 2026-02-18
**Scope:** Project structure, FormStore, Enforma.Form, Enforma.TextInput

---

## Goal

Build the initial skeleton of **enforma**, a React form component library with a declarative and reactive runtime. This first iteration covers exclusively the base infrastructure: monorepo, tooling, store, and the first two components.

---

## Monorepo structure

pnpm workspaces with two packages:

```
enforma/
├── pnpm-workspace.yaml
├── package.json            # root scripts: lint, test, build, dev
├── .gitignore
├── CLAUDE.md
├── docs/
│   └── plans/
│
├── packages/
│   └── enforma/            # publishable library
│       ├── src/
│       │   ├── index.ts             # export default Enforma (namespace)
│       │   ├── store/
│       │   │   └── FormStore.ts     # ref-based store + pub-sub
│       │   ├── context/
│       │   │   └── FormContext.ts   # React context + provider
│       │   └── components/
│       │       ├── Form.tsx
│       │       └── TextInput.tsx
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts           # library mode
│
└── apps/
    └── demo/               # Vite React playground
        ├── src/
        │   └── main.tsx
        ├── package.json
        └── vite.config.ts
```

---

## Tooling

### Package manager
pnpm with workspaces. No npm or yarn.

### TypeScript — strict configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### ESLint — flat config (ESLint 9+)

- `typescript-eslint/strict-type-checked` — strictest available preset
- `eslint-plugin-react-hooks` — hooks rules
- Additional rules: `no-explicit-any`, `no-unsafe-*`, `consistent-type-imports`

### Testing

- **Vitest** — native Vite integration
- **@testing-library/react** — component tests
- Tests in `src/**/*.test.ts(x)`
- Coverage with `v8` provider

### Root scripts

```json
{
  "lint":  "pnpm -r lint",
  "test":  "pnpm -r test",
  "build": "pnpm -r build",
  "dev":   "pnpm --filter demo dev"
}
```

---

## CLAUDE.md

Minimum rules that enforce quality at every step:

- Run `pnpm lint` before any commit — must pass with no errors or warnings.
- Run `pnpm test` before any commit — all tests must pass.
- A step is not considered complete until both commands pass.

---

## Architecture: FormStore

The form state lives **outside React**, in a mutable ref. Components subscribe via `useSyncExternalStore` with a per-path selector, achieving granular re-rendering: only the component whose `bind` matches the modified field re-renders.

### Public store interface

```ts
interface FormStore {
  // For useSyncExternalStore
  getSnapshot(): Record<string, unknown>
  subscribe(callback: () => void): () => void

  // Read and write by dot-path ("user.name" → state.user.name)
  getField(path: string): unknown
  setField(path: string, value: unknown): void
}
```

### Behavior

- **Internal state:** mutable object in a ref, never directly exposed.
- **Pub-sub:** `Set<() => void>` of subscribers. Each `setField` calls all callbacks.
- **Granular re-rendering:** each component creates a snapshot with `() => store.getField(path)`. React only re-renders if that value changed.
- **Dot-path:** `"user.name"` resolves to `state.user.name`. Supports arbitrary nesting.

### Internal hook

```ts
function useFieldValue(store: FormStore, path: string): unknown {
  return useSyncExternalStore(
    store.subscribe,
    () => store.getField(path)
  )
}
```

### Estimated complexity

~70 lines. No external dependencies. No state libraries.

---

## Component API

### Enforma.Form

Creates the `FormStore`, provides it via React context, and renders a native HTML `<form>`.

```tsx
<Enforma.Form
  values={{ name: '', email: '' }}   // initial state
  onChange={(values) => void}        // callback on every change
>
  {children}
</Enforma.Form>
```

### Enforma.TextInput

Reads and writes to the store via `bind`. Renders only native HTML (`<label>` + `<input>`). No external dependencies.

```tsx
<Enforma.TextInput
  bind="name"
  label="Name"
  placeholder="Enter your name"
/>
```

Internally:

```ts
const value = useFieldValue(store, resolvedPath)
const handleChange = (e) => store.setField(resolvedPath, e.target.value)
```

---

## Export namespace

```ts
// packages/enforma/src/index.ts
import { Form } from './components/Form'
import { TextInput } from './components/TextInput'

const Enforma = { Form, TextInput }
export default Enforma
```

Consumer usage:

```tsx
import Enforma from 'enforma'

<Enforma.Form values={state} onChange={setState}>
  <Enforma.TextInput bind="name" label="Name" />
</Enforma.Form>
```

---

## Out of scope (first iteration)

The following concepts are designed but **not implemented** in this step:

- Hierarchical scopes (`scope` prop on containers)
- Reactive attributes (props as functions evaluated against state)
- Validations and errors
- Other components (Select, Checkbox, Textarea, etc.)
- Array / list support

---

## Design decisions

| Decision | Discarded alternative | Reason |
|---|---|---|
| Custom store | Zustand / Jotai / Valtio | Enforma is a library; imposing dependencies on consumers is a high cost. The required store is ~70 lines. |
| `useSyncExternalStore` | Context with values | Context re-renders all consumers on every change. `useSyncExternalStore` with a per-path selector provides real granularity. |
| ESLint flat config | `.eslintrc` legacy | ESLint 9+ deprecated the legacy format. Flat config is the current standard. |
| pnpm workspaces | Turborepo / Nx | The monorepo scope does not justify Turborepo complexity for now. |
| Namespace `Enforma.Form` | Named exports | Groups the API under an object, avoids collisions with other libraries, documents the origin. |
