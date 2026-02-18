# Enforma — Bootstrap Design

**Date:** 2026-02-18
**Scope:** Project structure, FormStore, Enforma.Form, Enforma.TextInput

---

## Objetivo

Construir el esqueleto inicial de **enforma**, una librería React de componentes de formulario con un runtime declarativo y reactivo. Esta primera iteración cubre exclusivamente la infraestructura base: monorepo, tooling, store, y los dos primeros componentes.

---

## Estructura del monorepo

pnpm workspaces con dos paquetes:

```
enforma/
├── pnpm-workspace.yaml
├── package.json            # scripts raíz: lint, test, build, dev
├── .gitignore
├── CLAUDE.md
├── docs/
│   └── plans/
│
├── packages/
│   └── enforma/            # librería publicable
│       ├── src/
│       │   ├── index.ts             # export default Enforma (namespace)
│       │   ├── store/
│       │   │   └── FormStore.ts     # store ref-based + pub-sub
│       │   ├── context/
│       │   │   └── FormContext.ts   # React context + provider
│       │   └── components/
│       │       ├── Form.tsx
│       │       └── TextInput.tsx
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts           # modo library
│
└── apps/
    └── demo/               # playground Vite React
        ├── src/
        │   └── main.tsx
        ├── package.json
        └── vite.config.ts
```

---

## Tooling

### Package manager
pnpm con workspaces. Sin npm ni yarn.

### TypeScript — configuración estricta

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

- `typescript-eslint/strict-type-checked` — preset más estricto disponible
- `eslint-plugin-react-hooks` — reglas de hooks
- Reglas adicionales: `no-explicit-any`, `no-unsafe-*`, `consistent-type-imports`

### Testing

- **Vitest** — integración nativa con Vite
- **@testing-library/react** — tests de componentes
- Tests en `src/**/*.test.ts(x)`
- Coverage con provider `v8`

### Scripts raíz

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

Reglas mínimas que fuerzan calidad en cada paso:

- Ejecutar `pnpm lint` antes de cualquier commit — debe pasar sin errores ni warnings.
- Ejecutar `pnpm test` antes de cualquier commit — todos los tests deben pasar.
- Un paso no se considera completo hasta que ambos comandos pasen.

---

## Arquitectura: FormStore

El estado del formulario vive **fuera de React**, en una ref mutable. Los componentes se suscriben mediante `useSyncExternalStore` con un selector por path, consiguiendo re-renderizado granular: solo el componente cuyo `bind` coincide con el campo modificado se re-renderiza.

### Interfaz pública del store

```ts
interface FormStore {
  // Para useSyncExternalStore
  getSnapshot(): Record<string, unknown>
  subscribe(callback: () => void): () => void

  // Lectura y escritura por dot-path ("user.name" → state.user.name)
  getField(path: string): unknown
  setField(path: string, value: unknown): void
}
```

### Comportamiento

- **Estado interno:** objeto mutable en una ref, nunca expuesto directamente.
- **Pub-sub:** `Set<() => void>` de suscriptores. Cada `setField` llama a todos los callbacks.
- **Re-renderizado granular:** cada componente crea un snapshot con `() => store.getField(path)`. React solo re-renderiza si ese valor cambió.
- **Dot-path:** `"user.name"` resuelve a `state.user.name`. Soporta anidamiento arbitrario.

### Hook interno

```ts
function useFieldValue(store: FormStore, path: string): unknown {
  return useSyncExternalStore(
    store.subscribe,
    () => store.getField(path)
  )
}
```

### Complejidad estimada

~70 líneas. Sin dependencias externas. Sin librerías de estado.

---

## API de componentes

### Enforma.Form

Crea el `FormStore`, lo provee vía contexto React, y renderiza un `<form>` HTML nativo.

```tsx
<Enforma.Form
  values={{ name: '', email: '' }}   // estado inicial
  onChange={(values) => void}        // callback en cada cambio
>
  {children}
</Enforma.Form>
```

### Enforma.TextInput

Lee y escribe en el store mediante `bind`. Renderiza solo HTML nativo (`<label>` + `<input>`). Sin dependencias externas.

```tsx
<Enforma.TextInput
  bind="name"
  label="Nombre"
  placeholder="Escribe tu nombre"
/>
```

Internamente:

```ts
const value = useFieldValue(store, resolvedPath)
const handleChange = (e) => store.setField(resolvedPath, e.target.value)
```

---

## Namespace de exportación

```ts
// packages/enforma/src/index.ts
import { Form } from './components/Form'
import { TextInput } from './components/TextInput'

const Enforma = { Form, TextInput }
export default Enforma
```

Uso del consumidor:

```tsx
import Enforma from 'enforma'

<Enforma.Form values={state} onChange={setState}>
  <Enforma.TextInput bind="name" label="Nombre" />
</Enforma.Form>
```

---

## Fuera de scope (primera iteración)

Los siguientes conceptos están diseñados pero **no se implementan** en este paso:

- Scopes jerárquicos (`scope` prop en contenedores)
- Atributos reactivos (props como funciones evaluadas contra el estado)
- Validaciones y errores
- Otros componentes (Select, Checkbox, Textarea, etc.)
- Soporte a arrays / listas

---

## Decisiones de diseño

| Decisión | Alternativa descartada | Razón |
|---|---|---|
| Store custom | Zustand / Jotai / Valtio | Enforma es una librería; imponer dependencias a los consumidores es un coste alto. El store necesario son ~70 líneas. |
| `useSyncExternalStore` | Context con valores | Context re-renderiza todos los consumidores en cada cambio. `useSyncExternalStore` con selector por path da granularidad real. |
| ESLint flat config | `.eslintrc` legacy | ESLint 9+ deprecó el formato legacy. Flat config es el estándar actual. |
| pnpm workspaces | Turborepo / Nx | El scope del monorepo no justifica la complejidad de Turborepo por ahora. |
| Namespace `Enforma.Form` | Named exports | Agrupa la API bajo un objeto, evita colisiones con otras librerías, documenta la procedencia. |
