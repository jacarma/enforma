# DataSource Filter Language Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the equality-only static array filter in DataSources with an expressive flat predicate language (`gt`, `lt`, `in`, `contains`, etc.) shared by both the static array evaluator and query datasource params.

**Architecture:** Add three new types (`FilterPredicate`, `FilterValue`, `FilterSpec`) to `datasource/types.ts` and update `DataSourceParams.filters` and `DataSourceProp.filters` to use `FilterSpec`. Introduce a pure `applyFilters` evaluator function that replaces the current `item[k] === v` one-liner in `useDataSource`.

**Tech Stack:** TypeScript strict, Vitest + @testing-library/react, pnpm workspaces monorepo.

---

## Task 1: Add filter types and update `DataSourceParams`

**Files:**
- Modify: `packages/enforma/src/datasource/types.ts`

No test file for this task — TypeScript compilation validates the types. Run `pnpm typecheck` after.

**Step 1: Read the existing types file**

Read `packages/enforma/src/datasource/types.ts` to understand what's there before editing.

**Step 2: Add the three new types and update `DataSourceParams`**

Replace the contents of `packages/enforma/src/datasource/types.ts` with:

```ts
// packages/enforma/src/datasource/types.ts
import type { FormValues } from '../store/FormStore';

export type FilterPredicate = {
  gt?: number | string | Date;
  lt?: number | string | Date;
  gte?: number | string | Date;
  lte?: number | string | Date;
  in?: unknown[];
  notIn?: unknown[];
  contains?: string;
  startsWith?: string;
  endsWith?: string;
};

export type FilterValue = string | number | boolean | null | Date | FilterPredicate;

export type FilterSpec = Record<string, FilterValue>;

export type DataSourceParams = {
  search: string;
  filters: FilterSpec;
  sort: { field: string; direction: 'asc' | 'desc' } | null;
  pagination: { page: number; pageSize: number };
};

export type QueryResult<TItem> = TItem[] | { items: TItem[]; total: number };

export type DataSourceDefinition<TItem> =
  | TItem[]
  | { query: (params: DataSourceParams) => QueryResult<TItem> | Promise<QueryResult<TItem>> };

export type DataSourceProp<TItem> =
  | string
  | TItem[]
  | ((scopeValues: FormValues, allValues: FormValues) => TItem[])
  | {
      source: string | TItem[];
      filters: (scopeValues: FormValues, allValues: FormValues) => FilterSpec;
    };

export type DataSourceResult<TItem> = {
  items: TItem[];
  total: number | undefined;
  isLoading: boolean;
  error: Error | null;
};
```

**Step 3: Run typecheck**

```bash
nvm use 20 && pnpm typecheck
```

Expected: passes with no errors. If there are errors they will be in `useDataSource.ts` where `filters` was typed as `Record<string, unknown>` — that's fine, it gets fixed in Task 3.

**Step 4: Commit**

```bash
git add packages/enforma/src/datasource/types.ts
git commit -m "feat: add FilterPredicate, FilterValue, FilterSpec types to datasource"
```

---

## Task 2: Implement `applyFilters` evaluator (TDD)

**Files:**
- Create: `packages/enforma/src/datasource/applyFilters.test.ts`
- Create: `packages/enforma/src/datasource/applyFilters.ts`

**Step 1: Write the failing tests**

Create `packages/enforma/src/datasource/applyFilters.test.ts`:

```ts
// packages/enforma/src/datasource/applyFilters.test.ts
import { describe, it, expect } from 'vitest';
import { applyFilters } from './applyFilters';

type Item = {
  code: string;
  name: string;
  age: number;
  country: string;
  active: boolean;
  score: number;
  createdAt: Date;
};

const items: Item[] = [
  { code: 'a', name: 'Alice', age: 30, country: 'us', active: true, score: 80, createdAt: new Date('2024-01-01') },
  { code: 'b', name: 'Bob', age: 17, country: 'gb', active: false, score: 55, createdAt: new Date('2024-06-15') },
  { code: 'c', name: 'Charlie', age: 45, country: 'us', active: true, score: 92, createdAt: new Date('2025-03-10') },
];

describe('applyFilters — empty filters', () => {
  it('returns all items when filters is empty', () => {
    expect(applyFilters(items, {})).toEqual(items);
  });
});

describe('applyFilters — plain value equality', () => {
  it('filters by string equality', () => {
    expect(applyFilters(items, { country: 'us' })).toEqual([items[0], items[2]]);
  });

  it('filters by number equality', () => {
    expect(applyFilters(items, { age: 17 })).toEqual([items[1]]);
  });

  it('filters by boolean equality', () => {
    expect(applyFilters(items, { active: false })).toEqual([items[1]]);
  });

  it('returns empty array when no items match', () => {
    expect(applyFilters(items, { country: 'de' })).toEqual([]);
  });

  it('filters by Date equality using .getTime()', () => {
    expect(applyFilters(items, { createdAt: new Date('2024-01-01') })).toEqual([items[0]]);
  });

  it('does not match a Date against a different Date', () => {
    expect(applyFilters(items, { createdAt: new Date('2024-01-02') })).toEqual([]);
  });
});

describe('applyFilters — comparison operators (numbers)', () => {
  it('gt filters items with field > value', () => {
    expect(applyFilters(items, { age: { gt: 30 } })).toEqual([items[2]]);
  });

  it('gte filters items with field >= value', () => {
    expect(applyFilters(items, { age: { gte: 30 } })).toEqual([items[0], items[2]]);
  });

  it('lt filters items with field < value', () => {
    expect(applyFilters(items, { age: { lt: 30 } })).toEqual([items[1]]);
  });

  it('lte filters items with field <= value', () => {
    expect(applyFilters(items, { age: { lte: 30 } })).toEqual([items[0], items[1]]);
  });

  it('combines gt and lt for a range', () => {
    expect(applyFilters(items, { age: { gt: 17, lt: 45 } })).toEqual([items[0]]);
  });
});

describe('applyFilters — comparison operators (dates)', () => {
  it('gt filters items with date after value', () => {
    expect(applyFilters(items, { createdAt: { gt: new Date('2024-06-15') } })).toEqual([items[2]]);
  });

  it('gte filters items with date on or after value', () => {
    expect(applyFilters(items, { createdAt: { gte: new Date('2024-06-15') } })).toEqual([items[1], items[2]]);
  });

  it('lt filters items with date before value', () => {
    expect(applyFilters(items, { createdAt: { lt: new Date('2024-06-15') } })).toEqual([items[0]]);
  });
});

describe('applyFilters — membership operators', () => {
  it('in filters items whose field value is in the list', () => {
    expect(applyFilters(items, { country: { in: ['us', 'de'] } })).toEqual([items[0], items[2]]);
  });

  it('notIn filters items whose field value is not in the list', () => {
    expect(applyFilters(items, { country: { notIn: ['us'] } })).toEqual([items[1]]);
  });

  it('in with empty array returns no items', () => {
    expect(applyFilters(items, { country: { in: [] } })).toEqual([]);
  });
});

describe('applyFilters — string operators (case-insensitive)', () => {
  it('contains matches substring case-insensitively', () => {
    expect(applyFilters(items, { name: { contains: 'li' } })).toEqual([items[0], items[2]]);
  });

  it('contains matches regardless of case in filter value', () => {
    expect(applyFilters(items, { name: { contains: 'ALICE' } })).toEqual([items[0]]);
  });

  it('contains matches regardless of case in item value', () => {
    const upperItems = [{ ...items[0], name: 'ALICE' }];
    expect(applyFilters(upperItems, { name: { contains: 'alice' } })).toEqual(upperItems);
  });

  it('startsWith matches prefix case-insensitively', () => {
    expect(applyFilters(items, { name: { startsWith: 'al' } })).toEqual([items[0]]);
  });

  it('endsWith matches suffix case-insensitively', () => {
    expect(applyFilters(items, { name: { endsWith: 'E' } })).toEqual([items[0], items[2]]);
  });
});

describe('applyFilters — multiple fields (implicit AND)', () => {
  it('applies all field filters together', () => {
    expect(applyFilters(items, { country: 'us', age: { gt: 30 } })).toEqual([items[2]]);
  });

  it('returns empty when one condition eliminates all items', () => {
    expect(applyFilters(items, { country: 'us', age: { gt: 100 } })).toEqual([]);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
nvm use 20 && pnpm --filter enforma exec vitest run src/datasource/applyFilters.test.ts
```

Expected: FAIL — "Cannot find module './applyFilters'"

**Step 3: Implement `applyFilters`**

Create `packages/enforma/src/datasource/applyFilters.ts`:

```ts
// packages/enforma/src/datasource/applyFilters.ts
import type { FilterSpec, FilterValue, FilterPredicate } from './types';

function toComparable(value: number | string | Date): number | string {
  return value instanceof Date ? value.getTime() : value;
}

function matchesPredicate(itemValue: unknown, predicate: FilterPredicate): boolean {
  if (predicate.gt !== undefined) {
    if (toComparable(predicate.gt) >= toComparable(itemValue as number | string | Date)) return false;
  }
  if (predicate.gte !== undefined) {
    if (toComparable(predicate.gte) > toComparable(itemValue as number | string | Date)) return false;
  }
  if (predicate.lt !== undefined) {
    if (toComparable(predicate.lt) <= toComparable(itemValue as number | string | Date)) return false;
  }
  if (predicate.lte !== undefined) {
    if (toComparable(predicate.lte) < toComparable(itemValue as number | string | Date)) return false;
  }
  if (predicate.in !== undefined) {
    if (!predicate.in.includes(itemValue)) return false;
  }
  if (predicate.notIn !== undefined) {
    if (predicate.notIn.includes(itemValue)) return false;
  }
  if (predicate.contains !== undefined) {
    if (!String(itemValue).toLowerCase().includes(predicate.contains.toLowerCase())) return false;
  }
  if (predicate.startsWith !== undefined) {
    if (!String(itemValue).toLowerCase().startsWith(predicate.startsWith.toLowerCase())) return false;
  }
  if (predicate.endsWith !== undefined) {
    if (!String(itemValue).toLowerCase().endsWith(predicate.endsWith.toLowerCase())) return false;
  }
  return true;
}

function matchesValue(itemValue: unknown, filterValue: FilterValue): boolean {
  if (filterValue instanceof Date) {
    return itemValue instanceof Date && itemValue.getTime() === filterValue.getTime();
  }
  if (filterValue !== null && typeof filterValue === 'object') {
    return matchesPredicate(itemValue, filterValue);
  }
  return itemValue === filterValue;
}

export function applyFilters<T>(items: T[], filters: FilterSpec): T[] {
  const entries = Object.entries(filters);
  if (entries.length === 0) return items;
  return items.filter((item) =>
    entries.every(([field, filterValue]) =>
      matchesValue((item as Record<string, unknown>)[field], filterValue),
    ),
  );
}
```

**Step 4: Run tests to verify they pass**

```bash
nvm use 20 && pnpm --filter enforma exec vitest run src/datasource/applyFilters.test.ts
```

Expected: all tests PASS.

**Step 5: Run full typecheck**

```bash
nvm use 20 && pnpm typecheck
```

Expected: passes (may still have errors in `useDataSource.ts` — fixed in Task 3).

**Step 6: Commit**

```bash
git add packages/enforma/src/datasource/applyFilters.ts packages/enforma/src/datasource/applyFilters.test.ts
git commit -m "feat: add applyFilters evaluator with full predicate support"
```

---

## Task 3: Update `useDataSource` to use `applyFilters`

**Files:**
- Modify: `packages/enforma/src/hooks/useDataSource.ts`
- Modify: `packages/enforma/src/hooks/useDataSource.test.tsx`

**Step 1: Add failing tests for richer predicates**

Open `packages/enforma/src/hooks/useDataSource.test.tsx` and add the following new describe block after the existing `useDataSource — named source with filters` block (after line 138):

```ts
describe('useDataSource — named source with rich filter predicates', () => {
  type Product = { code: string; name: string; price: number; category: string };
  const products: Product[] = [
    { code: 'a', name: 'Apple', price: 1.5, category: 'fruit' },
    { code: 'b', name: 'Banana', price: 0.8, category: 'fruit' },
    { code: 'c', name: 'Carrot', price: 2.0, category: 'vegetable' },
  ];

  it('filters by gt predicate', () => {
    const { result } = renderHook(
      () =>
        useDataSource<Product>({
          source: 'products',
          filters: () => ({ price: { gt: 1.0 } }),
        }),
      { wrapper: makeWrapper({ products }) },
    );
    expect(result.current.items).toEqual([products[0], products[2]]);
  });

  it('filters by in predicate', () => {
    const { result } = renderHook(
      () =>
        useDataSource<Product>({
          source: 'products',
          filters: () => ({ category: { in: ['fruit'] } }),
        }),
      { wrapper: makeWrapper({ products }) },
    );
    expect(result.current.items).toEqual([products[0], products[1]]);
  });

  it('filters by contains predicate (case-insensitive)', () => {
    const { result } = renderHook(
      () =>
        useDataSource<Product>({
          source: 'products',
          filters: () => ({ name: { contains: 'an' } }),
        }),
      { wrapper: makeWrapper({ products }) },
    );
    expect(result.current.items).toEqual([products[1], products[2]]);
  });
});
```

**Step 2: Run the new tests to verify they fail**

```bash
nvm use 20 && pnpm --filter enforma exec vitest run src/hooks/useDataSource.test.tsx
```

Expected: the three new tests FAIL — the current evaluator only does equality, so `gt`, `in`, and `contains` won't filter correctly.

**Step 3: Update `useDataSource` to use `applyFilters`**

Open `packages/enforma/src/hooks/useDataSource.ts`.

Add the import after the existing imports at the top of the file:

```ts
import { applyFilters } from '../datasource/applyFilters';
```

Then find the `staticItems` useMemo (around line 131) and replace the filter logic:

Old:
```ts
  const staticItems = useMemo((): TItem[] => {
    if (!Array.isArray(definition)) return emptyItems as TItem[];
    const hasFilters =
      typeof dataSource === 'object' && !Array.isArray(dataSource) && 'filters' in dataSource;
    if (!hasFilters) return definition;
    return definition.filter((item) =>
      Object.entries(filters).every(([k, v]) => (item as Record<string, unknown>)[k] === v),
    );
    // definition and filtersKey capture the two things that can change the result.
    // dataSource and filters are intentionally omitted — they change every render
    // but their semantics are captured by definition (resolved array ref) and filtersKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [definition, filtersKey]);
```

New:
```ts
  const staticItems = useMemo((): TItem[] => {
    if (!Array.isArray(definition)) return emptyItems as TItem[];
    const hasFilters =
      typeof dataSource === 'object' && !Array.isArray(dataSource) && 'filters' in dataSource;
    if (!hasFilters) return definition;
    return applyFilters(definition, filters);
    // definition and filtersKey capture the two things that can change the result.
    // dataSource and filters are intentionally omitted — they change every render
    // but their semantics are captured by definition (resolved array ref) and filtersKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [definition, filtersKey]);
```

Also update the `filters` variable type annotation (around line 115). The type of `filters` is inferred from `dataSource.filters(...)` — with the updated `DataSourceProp` type it will now correctly infer as `FilterSpec`. No manual annotation change needed, but verify `pnpm typecheck` passes.

**Step 4: Run all tests**

```bash
nvm use 20 && pnpm test
```

Expected: all tests PASS, including the three new predicate tests and all existing tests.

**Step 5: Run lint and typecheck**

```bash
nvm use 20 && pnpm lint && pnpm typecheck
```

Expected: no errors or warnings.

**Step 6: Commit**

```bash
git add packages/enforma/src/hooks/useDataSource.ts packages/enforma/src/hooks/useDataSource.test.tsx
git commit -m "feat: use applyFilters in useDataSource, support rich filter predicates"
```

---

## Final verification

```bash
nvm use 20 && pnpm lint && pnpm typecheck && pnpm test
```

All three must pass with no errors before the feature is complete.
