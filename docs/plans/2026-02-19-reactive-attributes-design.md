# Reactive Attributes — Design

**Date:** 2026-02-19

## Goal

`TextInput` props `disabled`, `label`, and `placeholder` can each be a static value or a
function evaluated live against the current form state:

```tsx
<Enforma.TextInput
  bind="email"
  disabled={(scope, all) => !all.name}
  label={(scope) => scope.type === 'work' ? 'Work Email' : 'Email'}
  placeholder={(scope, all) => `Enter email for ${all.name}`}
/>
```

## API

### `Reactive<T>` type (exported)

```ts
export type Reactive<T> = T | ((scopeValues: FormValues, allValues: FormValues) => T)
```

- `scopeValues` — values nested under the current `Scope` prefix (equals `allValues` at root)
- `allValues` — full form root snapshot

Exported from `index.ts`. Used to type reactive props in `TextInputProps` and future components.

### `TextInputProps` (updated)

```ts
interface TextInputProps {
  bind: string
  label?: Reactive<string>
  placeholder?: Reactive<string>
  disabled?: Reactive<boolean>
  id?: string  // stays static
}
```

## Architecture

### `useReactiveProp<T>` hook (internal, in `ScopeContext.ts`)

Uses `useSyncExternalStore`:

- **Static value:** subscribe function is a no-op (`() => {}`), snapshot returns the value directly. Zero store subscriptions, zero reactive re-renders.
- **Function:** subscribes to the store. On every store notification React calls the snapshot, which invokes `prop(scopeValues, allValues)`. React re-renders only when the result changes via `Object.is`.

`scopeValues` derivation:
- `prefix === ''` → `scopeValues = allValues`
- otherwise → `scopeValues = getByPath(allValues, prefix) ?? {}`

### `TextInput` (updated)

Calls `useReactiveProp` once per reactive prop:

```ts
const resolvedDisabled    = useReactiveProp(disabled)
const resolvedLabel       = useReactiveProp(label)
const resolvedPlaceholder = useReactiveProp(placeholder)
```

## Files

| Action | File |
|--------|------|
| Modify | `packages/enforma/src/context/ScopeContext.ts` — add `useReactiveProp` |
| Modify | `packages/enforma/src/components/TextInput.tsx` — use reactive props |
| Modify | `packages/enforma/src/components/TextInput.test.tsx` — add reactive prop tests |
| Modify | `packages/enforma/src/index.ts` — export `Reactive<T>` |

## Testing

- Static props continue to work unchanged
- `disabled` as a function re-renders only when its boolean return value flips
- `label` and `placeholder` as functions update when their return value changes
- Components with all-static props do not subscribe to the store
- Reactive props inside a `Scope` receive correct `scopeValues` and `allValues`
