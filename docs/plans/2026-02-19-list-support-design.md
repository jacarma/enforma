# List Support Design

**Date:** 2026-02-19
**Status:** Approved

## Goal

Repeated form sections driven by array data, fully managed by a single `<Enforma.List>` component.

## API

```tsx
<Enforma.List bind="items" defaultItem={{ name: '' }}>
  <TextInput bind="name" />
</Enforma.List>
```

`children` is plain `ReactNode` — no render prop. The `List` component handles everything internally:

- Renders `children` once per item, each scoped to `items.0`, `items.1`, etc.
- Renders a remove button per item
- Renders an append button at the bottom

## Components

### `<Enforma.List bind defaultItem>`

- Resolves `bind` against the current scope prefix (same as `TextInput`)
- Reads the array value from the store
- For each item at index `i`, wraps `children` in a `ScopeContext.Provider` extending the prefix to `{fullPath}.{i}`
- Renders a remove button for each item that calls `store.removeItem(fullPath, i)`
- Renders an append button that calls `store.appendItem(fullPath, defaultItem)`
- React `key` is the index (stable keys deferred to future if needed)

## Store changes

Two new methods on `FormStore`:

```ts
appendItem(path: string, value: unknown): void
// reads array at path, pushes value, writes back, notifies subscribers

removeItem(path: string, index: number): void
// reads array at path, splices index out, writes back, notifies subscribers
```

Both call `runAllValidators()` and `notifySubscribers()` after mutation, consistent with `setField`.

## Validation & touched state

No special handling needed. Validators and touched state registered under removed item paths auto-unregister on component unmount via the existing `useEffect` cleanup in `useFieldValidation`.
