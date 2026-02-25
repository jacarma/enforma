// packages/enforma/src/hooks/useDataSource.ts
import { useState, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useScope } from '../context/ScopeContext';
import { useDataSources } from '../context/DataSourceContext';
import type { FormValues } from '../store/FormStore';
import type {
  DataSourceDefinition,
  DataSourceProp,
  DataSourceResult,
  DataSourceParams,
  QueryResult,
} from '../datasource/types';

type ComponentParams = {
  bind?: string;
  search?: string;
  sort?: { field: string; direction: 'asc' | 'desc' } | null;
  pagination?: { page: number; pageSize: number };
};

const emptyItems: unknown[] = [];

function normalizeResult<TItem>(result: QueryResult<TItem>): {
  items: TItem[];
  total: number | undefined;
} {
  if (Array.isArray(result)) return { items: result, total: undefined };
  return { items: result.items, total: result.total };
}

function resolveDefinition<TItem>(
  dataSource: DataSourceProp<TItem>,
  registry: Record<string, DataSourceDefinition<unknown>>,
): DataSourceDefinition<TItem> | 'reactive' | null {
  if (typeof dataSource === 'function') return 'reactive';
  if (Array.isArray(dataSource)) return dataSource;
  if (typeof dataSource === 'string') {
    const def = registry[dataSource] as DataSourceDefinition<TItem> | undefined;
    return def ?? null;
  }
  // { source, filters }
  const src = dataSource.source;
  if (typeof src === 'string') {
    const def = registry[src] as DataSourceDefinition<TItem> | undefined;
    return def ?? null;
  }
  return src as DataSourceDefinition<TItem>;
}

export function useDataSource<TItem>(
  dataSource: DataSourceProp<TItem> | undefined,
  params: ComponentParams = {},
): DataSourceResult<TItem> {
  const registry = useDataSources();
  const { store, prefix } = useScope();

  // Always subscribe to form store — needed for reactive items and filter evaluation.
  const scopeValues = useSyncExternalStore(
    (cb) => store.subscribe(cb),
    (): FormValues => {
      const raw = prefix === '' ? store.getSnapshot() : store.getField(prefix);
      return raw !== null && typeof raw === 'object' ? (raw as FormValues) : store.getSnapshot();
    },
  );

  const allValues = useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => store.getSnapshot(),
  );

  // Query async state — always present; no-op for static/reactive modes.
  const [queryState, setQueryState] = useState<{
    items: TItem[];
    total: number | undefined;
    isLoading: boolean;
    error: Error | null;
  }>({ items: emptyItems as TItem[], total: undefined, isLoading: false, error: null });

  const search = params.search ?? '';
  const sort = params.sort ?? null;
  const pagination = params.pagination ?? { page: 0, pageSize: 20 };

  // Compute form-derived filters (if applicable).
  const filters: Record<string, unknown> =
    dataSource !== undefined &&
    typeof dataSource === 'object' &&
    !Array.isArray(dataSource) &&
    typeof dataSource !== 'function' &&
    'filters' in dataSource
      ? dataSource.filters(scopeValues, allValues)
      : {};

  const filtersKey = JSON.stringify(filters);

  // Resolve definition and memoize filtered static items.
  // useMemo gives a stable reference so the auto-clear effect only fires when the
  // filtered set actually changes, not on every render.
  const definition = dataSource !== undefined ? resolveDefinition(dataSource, registry) : null;

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

  useEffect(() => {
    if (dataSource === undefined) return;

    const definition = resolveDefinition(dataSource, registry);
    if (definition === null || definition === 'reactive' || Array.isArray(definition)) return;
    if (!('query' in definition)) return;

    let cancelled = false;
    setQueryState((s) => ({ ...s, isLoading: true, error: null }));

    const queryParams: DataSourceParams = {
      search,
      filters,
      sort,
      pagination,
    };

    Promise.resolve(definition.query(queryParams))
      .then((result) => {
        if (cancelled) return;
        const { items, total } = normalizeResult(result);
        setQueryState({ items, total, isLoading: false, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setQueryState((s) => ({
          ...s,
          isLoading: false,
          error: err instanceof Error ? err : new Error(String(err)),
        }));
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, search, sort?.field, sort?.direction, pagination.page, pagination.pageSize]);

  if (dataSource === undefined) {
    return { items: emptyItems as TItem[], total: undefined, isLoading: false, error: null };
  }

  // Static array (inline or named) — items may be filtered by equality predicates.
  if (Array.isArray(definition)) {
    return { items: staticItems, total: undefined, isLoading: false, error: null };
  }

  // Form-reactive function
  if (definition === 'reactive') {
    const fn = dataSource as (scopeValues: FormValues, allValues: FormValues) => TItem[];
    return { items: fn(scopeValues, allValues), total: undefined, isLoading: false, error: null };
  }

  // Query — return async state
  return queryState;
}
