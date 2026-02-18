# Hierarchical Scopes — Design

**Date:** 2026-02-19

## Goal

Add `<Enforma.Scope path="address">` so child inputs resolve their `bind` relative to the scope path.

```tsx
<Enforma.Scope path="address">
  <Enforma.TextInput bind="city" />   {/* resolves to address.city */}
</Enforma.Scope>
```

Scopes can nest arbitrarily:

```tsx
<Enforma.Scope path="address">
  <Enforma.Scope path="street">
    <Enforma.TextInput bind="line1" /> {/* resolves to address.street.line1 */}
  </Enforma.Scope>
</Enforma.Scope>
```

## Architecture

### ScopeContext

`ScopeContext` holds `{ store: FormStore; prefix: string }`. It is the single context all input components read from. `FormContext` becomes an internal implementation detail.

`Form` provides `ScopeContext` at the root with `prefix: ''` and the store. This means inputs work correctly at the form root with no `Scope` wrapper — there is always a provider.

`Scope` reads the parent `ScopeContext`, computes a new prefix by joining the parent prefix and its own `path`, and re-provides `ScopeContext` with the same store and the updated prefix.

Path joining rules:
- `prefix === ''` → full path = `path`
- `prefix !== ''` → full path = `${prefix}.${path}`

### `useFormValue(bind)` hook

Exported from `ScopeContext.ts`. Reads `ScopeContext` to get the store and prefix, resolves the full field path, and returns `[value, setValue]`.

- Value subscription uses `useSyncExternalStore` with a per-field selector — only re-renders when the bound field changes.
- `setValue` calls `store.setField(fullPath, value)`.

Components call only `useFormValue(bind)`. They have no knowledge of the store or path joining.

### Scope component

```tsx
<Enforma.Scope path="address">
  {children}
</Enforma.Scope>
```

Reads parent prefix, computes new prefix, wraps children in `ScopeContext.Provider`.

### TextInput (updated)

Replaces manual store + path wiring with a single `useFormValue(bind)` call. No other changes.

### Exports

`Scope` is added to the `Enforma` namespace in `index.ts`.

## Files

| Action | File |
|--------|------|
| New | `packages/enforma/src/context/ScopeContext.ts` |
| New | `packages/enforma/src/components/Scope.tsx` |
| New | `packages/enforma/src/components/Scope.test.tsx` |
| Modify | `packages/enforma/src/components/Form.tsx` |
| Modify | `packages/enforma/src/components/TextInput.tsx` |
| Modify | `packages/enforma/src/index.ts` |

`FormContext.ts` is kept but becomes internal-only (used by `Form` to read the store for constructing the root `ScopeContext` value).

## Testing strategy

- `Scope.test.tsx`: TextInput inside Scope reads from prefixed path, writes to prefixed path, nested Scopes chain correctly, TextInput outside Scope is unaffected.
- Existing `TextInput.test.tsx` and `Form.test.tsx` must continue to pass unchanged.
