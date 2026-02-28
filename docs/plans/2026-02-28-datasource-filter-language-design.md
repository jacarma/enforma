# DataSource Filter Language Design

Date: 2026-02-28

## Problem

The current `filters` callback in `DataSourceProp` returns `Record<string, unknown>`, and static array filtering applies only strict equality (`item[k] === v`). This is too limited — real filtering needs ranges, membership checks, and string matching. The filter type is also untyped, providing no safety or documentation value for query datasource implementors.

## Goals

- Expressive flat filter predicates covering equality, comparisons, membership, and string matching
- Shared type used by both the static array evaluator and `DataSourceParams` (query datasources receive the same typed object)
- Safe to serialize and pass to any API — no logical composition, no relation traversal
- Backward compatible: plain values continue to mean equality

## Non-goals

- Logical operators (`$or`, `$and`, `$not`)
- Nested relation traversal (`user.address.city`)
- Case-sensitive string variants (case-insensitive is the default for all string operators)
- Case-insensitive equality (exact match use cases should use ISO strings with plain equality)

## Filter Language

### Syntax

Plain values mean equality. Richer predicates are expressed as objects:

```ts
// equality (unchanged)
{ country: 'us' }

// comparison
{ age: { gt: 18, lte: 65 } }

// membership
{ status: { in: ['active', 'pending'] } }

// string (case-insensitive)
{ name: { contains: 'john' } }

// date range (Date or ISO string)
{ createdAt: { gte: new Date('2024-01-01'), lt: new Date('2025-01-01') } }
```

Multiple fields are combined with implicit AND.

### Operator Set

| Category   | Operators                          | Notes                                      |
|------------|------------------------------------|--------------------------------------------|
| Equality   | plain value                        | Strict; `Date` compared by `.getTime()`    |
| Comparison | `gt`, `lt`, `gte`, `lte`           | Accepts `number \| string \| Date`; `Date` by `.getTime()` |
| Membership | `in`, `notIn`                      | Strict equality per element                |
| String     | `contains`, `startsWith`, `endsWith` | Always case-insensitive (both sides lowercased) |

## Types

```ts
type FilterPredicate = {
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

type FilterValue = string | number | boolean | null | Date | FilterPredicate;

type FilterSpec = Record<string, FilterValue>;
```

`DataSourceParams.filters` changes from `Record<string, unknown>` to `FilterSpec`. The `filters` callback in `DataSourceProp` changes its return type from `Record<string, unknown>` to `FilterSpec`.

## Approach

Option A — shared type end-to-end. `FilterSpec` is used in both `DataSourceProp.filters` return type and `DataSourceParams.filters`. Query datasource implementors receive a well-typed, safe filter object they can pass directly to Prisma (structurally compatible), serialize to query params, or evaluate themselves.

## Evaluator

A new pure function `applyFilters<T>(items: T[], filters: FilterSpec): T[]` in `datasource/applyFilters.ts`. Replaces the current `item[k] === v` one-liner in `useDataSource`.

Evaluation rules per field:
- Plain `Date` value → `item[field].getTime() === value.getTime()`
- Plain non-Date value → `item[field] === value`
- `gt/lt/gte/lte` with `Date` → compare `.getTime()`
- `gt/lt/gte/lte` with `number | string` → JS comparison operators
- `in/notIn` → `Array.includes` with strict equality
- `contains/startsWith/endsWith` → `String(item[field]).toLowerCase()` vs `value.toLowerCase()`

## Files Affected

| File | Change |
|------|--------|
| `packages/enforma/src/datasource/types.ts` | Add `FilterPredicate`, `FilterValue`, `FilterSpec`; update `DataSourceParams.filters` and `DataSourceProp.filters` return type |
| `packages/enforma/src/datasource/applyFilters.ts` | New — pure evaluator function |
| `packages/enforma/src/datasource/applyFilters.test.ts` | New — unit tests for evaluator |
| `packages/enforma/src/hooks/useDataSource.ts` | Use `applyFilters`, narrow filter types |
| `packages/enforma/src/hooks/useDataSource.test.tsx` | Add tests for richer predicates |
