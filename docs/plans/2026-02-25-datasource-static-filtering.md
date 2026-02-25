# DataSource Static Filtering & Auto-Clear Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `useDataSource` apply `filters` as client-side equality predicates when the resolved definition is a static array, and automatically clear a bound field value when the filtered item set changes.

**Architecture:** Two targeted changes inside `useDataSource.ts` — (1) filter the static array inline using the already-computed `filters` map, memoised for reference stability via `useMemo`; (2) a `useEffect` with a `useRef` first-render guard that calls `store.setField` when the memoised filtered items change. The demo adapter (`DemoSelect`) drops its manual clear `useEffect` and passes `{ bind: props.bind }` instead.

**Tech Stack:** TypeScript strict, React `useMemo`/`useEffect`/`useRef`, Vitest + @testing-library/react, pnpm workspaces.

---

### Background reading

Before starting, skim these files to understand the existing code:

- `packages/enforma/src/hooks/useDataSource.ts` — the hook to modify
- `packages/enforma/src/hooks/useDataSource.test.tsx` — existing tests
- `packages/enforma/src/context/ScopeContext.ts` — `joinPath` helper
- `apps/demo/src/App.tsx` — `DemoSelect` adapter and DataSources demo section

### How to run tests

```bash
nvm use 20
pnpm test --run
```

All 109 tests must stay green after every commit. Run `pnpm lint` and `pnpm typecheck` before committing.

---

### Task 1: Update the existing static-array-with-filters test

**Files:**
- Modify: `packages/enforma/src/hooks/useDataSource.test.tsx:96-115`

The current test in describe `'useDataSource — named source with filters'` has a misleading comment ("filters are relevant for query DataSources only") and its assertion (`toEqual(countries)`) happens to pass whether or not filtering is applied (because the filter value `scope.continent` is `undefined`, matching all items that lack a `continent` key). After this task, the test uses data with a real discriminating filter so the assertion will **fail** until Task 2 is implemented.

**Step 1: Replace the describe block for 'useDataSource — named source with filters'**

The block currently lives at lines 96–115. Replace the entire block with:

```ts
describe('useDataSource — named source with filters', () => {
  it('filters a named static array by equality when { source, filters } form is used', () => {
    type City = { code: string; name: string; country: string };
    const cities: City[] = [
      { code: 'nyc', name: 'New York', country: 'us' },
      { code: 'lon', name: 'London', country: 'gb' },
    ];

    const { result } = renderHook(
      () =>
        useDataSource<City>({
          source: 'cities',
          filters: () => ({ country: 'us' }),
        }),
      { wrapper: makeWrapper({ cities }) },
    );

    expect(result.current.items).toEqual([{ code: 'nyc', name: 'New York', country: 'us' }]);
    expect(result.current.isLoading).toBe(false);
  });

  it('returns all items when no filter values match any items', () => {
    type City = { code: string; name: string; country: string };
    const cities: City[] = [
      { code: 'nyc', name: 'New York', country: 'us' },
      { code: 'lon', name: 'London', country: 'gb' },
    ];

    const { result } = renderHook(
      () =>
        useDataSource<City>({
          source: 'cities',
          filters: () => ({ country: 'de' }),
        }),
      { wrapper: makeWrapper({ cities }) },
    );

    expect(result.current.items).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });
});
```

**Step 2: Run the new tests to confirm they fail**

```bash
nvm use 20
pnpm --filter enforma test --run 2>&1 | grep -E 'FAIL|filters a named'
```

Expected output: the two new tests in `'useDataSource — named source with filters'` **FAIL** (returns all items instead of filtered subset). All other 71 tests still pass.

**Step 3: Commit the failing tests**

```bash
git add packages/enforma/src/hooks/useDataSource.test.tsx
git commit -m "test: update static-array-with-filters tests to expect filtered results"
```

---

### Task 2: Implement static array client-side filtering

**Files:**
- Modify: `packages/enforma/src/hooks/useDataSource.ts`

**Step 1: Add `useMemo` and `useRef` to the React import**

Current line 2:
```ts
import { useState, useEffect, useSyncExternalStore } from 'react';
```

New line 2:
```ts
import { useState, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
```

**Step 2: Add `joinPath` to the ScopeContext import**

Current line 3:
```ts
import { useScope } from '../context/ScopeContext';
```

New line 3:
```ts
import { useScope, joinPath } from '../context/ScopeContext';
```

**Step 3: Add `bind` to `ComponentParams`**

Current `ComponentParams` type (lines 14–18):
```ts
type ComponentParams = {
  search?: string;
  sort?: { field: string; direction: 'asc' | 'desc' } | null;
  pagination?: { page: number; pageSize: number };
};
```

New `ComponentParams` type:
```ts
type ComponentParams = {
  bind?: string;
  search?: string;
  sort?: { field: string; direction: 'asc' | 'desc' } | null;
  pagination?: { page: number; pageSize: number };
};
```

**Step 4: Destructure `bind` from params in the hook body**

Current line 78 (`const search = params.search ?? '';`). Just before this line, add `bind` destructuring. Replace lines 78–80 with:

```ts
const bind = params.bind;
const search = params.search ?? '';
const sort = params.sort ?? null;
const pagination = params.pagination ?? { page: 0, pageSize: 20 };
```

**Step 5: Add the `useMemo` for filtered static items**

This goes right after `const filtersKey = JSON.stringify(filters);` (currently line 92). Insert after that line:

```ts
// Resolve definition and memoize filtered static items.
// useMemo gives a stable reference so the auto-clear effect only fires when the
// filtered set actually changes, not on every render.
const definition =
  dataSource !== undefined ? resolveDefinition(dataSource, registry) : null;

const staticItems = useMemo((): TItem[] => {
  if (!Array.isArray(definition)) return emptyItems as TItem[];
  const hasFilters =
    typeof dataSource === 'object' &&
    !Array.isArray(dataSource) &&
    'filters' in dataSource;
  if (!hasFilters) return definition;
  return definition.filter((item) =>
    Object.entries(filters).every(
      ([k, v]) => (item as Record<string, unknown>)[k] === v,
    ),
  );
  // definition and filtersKey capture the two things that can change the result.
  // dataSource and filters are intentionally omitted — they change every render
  // but their semantics are captured by definition (resolved array ref) and filtersKey.
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [definition, filtersKey]);
```

**Step 6: Replace the static array return branch to use `staticItems`**

Current lines 138–141:
```ts
// Static array (inline or named)
if (Array.isArray(definition)) {
  return { items: definition, total: undefined, isLoading: false, error: null };
}
```

New version — note the `definition` variable is now computed above (in step 5), so the `resolveDefinition` call at line 136 should be **removed**:

```ts
// Static array (inline or named) — items may be filtered by equality predicates.
if (Array.isArray(definition)) {
  return { items: staticItems, total: undefined, isLoading: false, error: null };
}
```

Also **remove** the now-redundant `const definition = resolveDefinition(dataSource, registry);` line that was at line 136 (since `definition` is now computed earlier via the `useMemo` block in Step 5).

**Step 7: Run the tests to verify Task 1 tests now pass**

```bash
nvm use 20
pnpm --filter enforma test --run 2>&1 | tail -8
```

Expected: all 73 tests pass (the 2 new ones should now be green).

**Step 8: Run lint and typecheck**

```bash
nvm use 20
pnpm lint && pnpm typecheck
```

Expected: no errors.

**Step 9: Commit**

```bash
git add packages/enforma/src/hooks/useDataSource.ts
git commit -m "feat: apply equality filters to static arrays in useDataSource"
```

---

### Task 3: Write failing tests for auto-clear behaviour

**Files:**
- Modify: `packages/enforma/src/hooks/useDataSource.test.tsx`

These tests exercise the `bind` param of `ComponentParams`. They manipulate the form store directly by grabbing it from `useScope` inside the wrapper.

**Step 1: Add `act` to the test imports**

Current line 3:
```ts
import { waitFor } from '@testing-library/react';
```

Change to:
```ts
import { act, waitFor } from '@testing-library/react';
```

**Step 2: Add `useScope` to the imports**

After line 7 (`import { useDataSource } from './useDataSource';`), add:
```ts
import { useScope } from '../context/ScopeContext';
import type { FormStore } from '../store/FormStore';
```

**Step 3: Append a new describe block at the bottom of the file**

Add after line 242 (the closing of the last `describe`):

```ts
describe('useDataSource — auto-clear on items change', () => {
  type City = { code: string; name: string; country: string };

  const allCities: City[] = [
    { code: 'nyc', name: 'New York', country: 'us' },
    { code: 'lon', name: 'London', country: 'gb' },
  ];

  function makeAutoWrapper(initialValues: Record<string, unknown>) {
    let capturedStore: FormStore | null = null;

    function GrabStore() {
      capturedStore = useScope().store;
      return null;
    }

    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <Form
          values={initialValues}
          onChange={() => {}}
          dataSources={{ cities: allCities }}
        >
          <GrabStore />
          {children}
        </Form>
      );
    }

    return { Wrapper, getStore: () => capturedStore! };
  }

  it('clears the bound field when filtered items change after mount', async () => {
    const { Wrapper, getStore } = makeAutoWrapper({ country: 'us', city: 'nyc' });

    renderHook(
      () =>
        useDataSource<City>(
          { source: 'cities', filters: (scope) => ({ country: scope.country }) },
          { bind: 'city' },
        ),
      { wrapper: Wrapper },
    );

    // After initial mount the city value must be preserved.
    expect(getStore().getField('city')).toBe('nyc');

    // Changing country changes the filtered set → should clear city.
    act(() => {
      getStore().setField('country', 'gb');
    });

    await waitFor(() => {
      expect(getStore().getField('city')).toBe('');
    });
  });

  it('does not clear the bound field on initial mount', () => {
    const { Wrapper, getStore } = makeAutoWrapper({ country: 'us', city: 'nyc' });

    renderHook(
      () =>
        useDataSource<City>(
          { source: 'cities', filters: (scope) => ({ country: scope.country }) },
          { bind: 'city' },
        ),
      { wrapper: Wrapper },
    );

    // Initial mount must not wipe a pre-populated value.
    expect(getStore().getField('city')).toBe('nyc');
  });

  it('does nothing when bind is not provided', async () => {
    const { Wrapper, getStore } = makeAutoWrapper({ country: 'us', city: 'nyc' });

    renderHook(
      () =>
        useDataSource<City>(
          { source: 'cities', filters: (scope) => ({ country: scope.country }) },
          // no bind
        ),
      { wrapper: Wrapper },
    );

    act(() => {
      getStore().setField('country', 'gb');
    });

    await waitFor(() => {
      // City should NOT be cleared since bind was not provided.
      expect(getStore().getField('city')).toBe('nyc');
    });
  });
});
```

**Step 4: Run the new tests to confirm they fail**

```bash
nvm use 20
pnpm --filter enforma test --run 2>&1 | grep -E 'FAIL|auto-clear'
```

Expected: the 3 new tests **FAIL**. All previously passing 73 tests still pass.

**Step 5: Commit the failing tests**

```bash
git add packages/enforma/src/hooks/useDataSource.test.tsx
git commit -m "test: add auto-clear bound field tests for useDataSource"
```

---

### Task 4: Implement the auto-clear effect

**Files:**
- Modify: `packages/enforma/src/hooks/useDataSource.ts`

The `useRef` and `useEffect` already imported in Task 2.

**Step 1: Add the `didMount` ref and auto-clear effect**

Insert after `const staticItems = useMemo(...)` block (added in Task 2, Step 5). Place before the existing query `useEffect`:

```ts
// Auto-clear the bound field when the filtered items change after initial mount.
// This handles the case where a dependent field's value is no longer valid
// (e.g., city select should reset when country changes and filters city list).
const didMount = useRef(false);
// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
  if (!didMount.current) {
    didMount.current = true;
    return;
  }
  if (!bind) return;
  store.setField(joinPath(prefix, bind), '');
}, [staticItems]);
```

**Step 2: Run the tests — all 76 should pass**

```bash
nvm use 20
pnpm --filter enforma test --run 2>&1 | tail -8
```

Expected: 76 tests pass (73 original + 3 new).

**Step 3: Run lint and typecheck**

```bash
nvm use 20
pnpm lint && pnpm typecheck
```

Expected: no errors.

**Step 4: Commit**

```bash
git add packages/enforma/src/hooks/useDataSource.ts
git commit -m "feat: auto-clear bound field when useDataSource filtered items change"
```

---

### Task 5: Update the demo App.tsx

**Files:**
- Modify: `apps/demo/src/App.tsx`

The demo currently has:
- A manual `useEffect` in `DemoSelect` that clears the city value — **remove this**
- `allCities` defined at module level but **not** in the form's `dataSources` — **add it**
- `dataSources` inline on the JSX `<Form>` — **extract to a module-level constant** for stability

**Step 1: Remove `useEffect` from the React import**

Current line 2:
```ts
import React, { useState, useEffect } from 'react';
```

New line 2:
```ts
import React, { useState } from 'react';
```

**Step 2: Remove the manual clear `useEffect` from `DemoSelect`**

Current `DemoSelect` body (around lines 38–47):
```ts
const dataSource = props.dataSource as DataSourceProp<OptionItem> | undefined;
const { items, isLoading } = useDataSource<OptionItem>(dataSource);

// Clear the value when it's no longer in the available items (e.g. country changed).
useEffect(() => {
  if (isLoading || !value) return;
  if (!items.some((item) => item[valueKey] === value)) {
    setValue('');
  }
}, [items, isLoading, value, valueKey, setValue]);
```

Replace with (pass `bind` so the library handles clearing):
```ts
const dataSource = props.dataSource as DataSourceProp<OptionItem> | undefined;
const { items, isLoading } = useDataSource<OptionItem>(dataSource, { bind: props.bind });
```

**Step 3: Extract `dataSources` to a module-level constant**

The demo form's `dataSources` inline object recreates on every render, which undermines the `useMemo` memoisation in `useDataSource`. Add a module-level constant after the `allCities` definition (after line 23):

```ts
const DATASOURCE_DEMO_SOURCES = {
  countries: [
    { code: 'us', name: 'United States' },
    { code: 'gb', name: 'United Kingdom' },
    { code: 'fr', name: 'France' },
  ],
  cities: allCities,
};
```

**Step 4: Update the DataSources demo `<Form>` to use the constant**

Find the `<Enforma.Form>` in the DataSources section (around line 262). Replace its `dataSources` inline prop with the constant:

```tsx
<Enforma.Form
  values={{ country: '', city: '' }}
  onChange={() => {}}
  aria-label="datasource demo form"
  dataSources={DATASOURCE_DEMO_SOURCES}
>
```

(Remove the inline `dataSources={{ countries: [...] }}` block entirely.)

**Step 5: Run lint and typecheck for the demo**

```bash
nvm use 20
pnpm lint && pnpm typecheck
```

Expected: no errors.

**Step 6: Run the full test suite**

```bash
nvm use 20
pnpm test --run 2>&1 | tail -12
```

Expected: all 76 tests still pass.

**Step 7: Commit**

```bash
git add apps/demo/src/App.tsx
git commit -m "feat: update DemoSelect to use useDataSource bind param; extract stable dataSources constant"
```

---

### Done

After all 5 tasks: 76 tests passing, lint and typecheck clean. The demo shows filtered city options and auto-clearing when country changes — no manual code in the adapter.
