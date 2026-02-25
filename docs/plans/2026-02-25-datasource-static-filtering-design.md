# DataSource Static Filtering & Auto-Clear Design

## Overview

Two related improvements to `useDataSource` that make static array DataSources work like
first-class citizens alongside async query DataSources.

---

## Problem

1. **Static arrays ignore filters.** When a DataSource prop uses the `{ source, filters }` form,
   the `filters` function is evaluated but only passed to async query functions. Static arrays
   return all items unfiltered, so e.g. a city select driven by `{ source: 'cities', filters: s => ({ country: s.country }) }` shows all cities regardless of the selected country.

2. **Stale value after filter change.** When a dependent field's value is no longer in the
   filtered item set (e.g., country changes, filtering out the previously selected city), the
   field value persists. Adapters must manually wire a `useEffect` to detect this and clear —
   boilerplate that every adapter author must remember to add.

---

## Design

### Feature 1 — Client-side filtering for static arrays

**Where:** `useDataSource.ts`, inside the `Array.isArray(definition)` branch.

**Rule:** When `dataSource` is in `{ source, filters }` form *and* the resolved definition is a
static array, apply the already-computed `filters` map as equality predicates.

```ts
if (Array.isArray(definition)) {
  const hasFilters =
    typeof dataSource === 'object' &&
    !Array.isArray(dataSource) &&
    'filters' in dataSource;

  const items = hasFilters
    ? definition.filter(item =>
        Object.entries(filters).every(
          ([k, v]) => (item as Record<string, unknown>)[k] === v
        )
      )
    : definition;

  return { items, total: undefined, isLoading: false, error: null };
}
```

**Filter semantics:** simple equality (`===`). A TODO is tracked in `docs/todo.md` to support
richer predicates (range, contains, etc.) in the future.

**Memoisation note:** `filters` is already serialised to `filtersKey = JSON.stringify(filters)`.
The filtered array is a new reference when filters change, which triggers the auto-clear effect
described below. No additional memoisation is needed.

### Feature 2 — Auto-clear bound field value when items change

**Where:** `useDataSource.ts`, new `useEffect` near the top of the hook.

**Rule:** When `items` changes *after* initial mount and a `bind` path is provided, write `''`
to that field in the form store. This covers the case where a dependent field's current value
is no longer present in the filtered item set.

```ts
// ComponentParams gains bind?:
type ComponentParams = {
  bind?: string;
  search?: string;
  sort?: { field: string; direction: 'asc' | 'desc' } | null;
  pagination?: { page: number; pageSize: number };
};

// Inside the hook:
const didMount = useRef(false);
useEffect(() => {
  if (!didMount.current) { didMount.current = true; return; }
  if (bind) store.setField(bind, '');
}, [items]);
```

**Initial-mount skip:** On first render items are set for the first time. Clearing at that
point would wipe pre-populated form values. The `useRef` guard skips the first run.

**Adapter usage:** Pass `{ bind: props.bind }` as the second argument to `useDataSource`.
One line change per adapter.

---

## Affected Files

| File | Change |
|---|---|
| `packages/enforma/src/hooks/useDataSource.ts` | Filter static arrays; add auto-clear effect |
| `packages/enforma/src/hooks/useDataSource.test.tsx` | Update Task 7 assertion; add auto-clear tests |
| `apps/demo/src/App.tsx` | Remove manual clear `useEffect`; pass `bind` to `useDataSource`; restore `onChange` handler |
| `docs/todo.md` | Add TODO: improve filter semantics in DataSources |

---

## What Does NOT Change

- `DataSourceProp` and `DataSourceDefinition` type definitions — no type changes needed
- Async query path — filters continue to be passed to `query()` as before
- The `{ source, filters }` form for async queries — behaviour unchanged
- Public API surface — `useDataSource` signature gains an optional `bind` param inside the
  existing `ComponentParams` object, which is backwards-compatible

---

## Testing Plan

- Update existing test: `'passes form-derived filters to a named static source'` — should now
  assert the filtered subset, not the full array.
- New test: `'filters static array by equality when filters is provided'`
- New test: `'auto-clears bound field when items change after mount'`
- New test: `'does not clear bound field on initial mount'`
