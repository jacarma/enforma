// packages/enforma/src/hooks/useDataSource.ts
import { useState, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { useScope, joinPath } from '../context/ScopeContext';
import { useDataSources } from '../context/DataSourceContext';
import type { FormValues } from '../store/FormStore';
import { applyFilters } from '../datasource/applyFilters';
import type {
  DataSourceDefinition,
  DataSourceProp,
  DataSourceResult,
  DataSourceParams,
  QueryResult,
  FilterSpec,
} from '../datasource/types';

type ComponentParams = {
  bind?: string;
  search?: string;
  sort?: { field: string; direction: 'asc' | 'desc' } | null;
  pagination?: { page: number; pageSize: number };
};

const emptyItems: unknown[] = [];

// Module-level in-flight request deduplication.
// Prevents double network requests caused by React StrictMode (mount → cleanup → remount).
type NormalizedResult = { items: unknown[]; total: number | undefined };
const queryInFlight = new WeakMap<object, Map<string, Promise<NormalizedResult>>>();

function deduplicatedQuery<TItem>(
  definition: {
    query: (params: DataSourceParams) => QueryResult<TItem> | Promise<QueryResult<TItem>>;
  },
  queryParams: DataSourceParams,
  paramsKey: string,
): Promise<{ items: TItem[]; total: number | undefined }> {
  let defMap = queryInFlight.get(definition);
  if (defMap === undefined) {
    defMap = new Map();
    queryInFlight.set(definition, defMap);
  }
  const cached = defMap.get(paramsKey);
  if (cached !== undefined) {
    return cached as Promise<{ items: TItem[]; total: number | undefined }>;
  }
  const promise: Promise<NormalizedResult> = Promise.resolve(definition.query(queryParams))
    .then((result) => normalizeResult(result) as NormalizedResult)
    .finally(() => {
      defMap.delete(paramsKey);
    });
  defMap.set(paramsKey, promise);
  return promise as Promise<{ items: TItem[]; total: number | undefined }>;
}

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

  const bind = params.bind;
  const search = params.search ?? '';
  const sort = params.sort ?? null;
  const pagination = params.pagination ?? { page: 0, pageSize: 20 };

  // Compute form-derived filters (if applicable).
  const filters: FilterSpec =
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
    return applyFilters(definition, filters);
    // definition and filtersKey capture the two things that can change the result.
    // dataSource and filters are intentionally omitted — they change every render
    // but their semantics are captured by definition (resolved array ref) and filtersKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [definition, filtersKey]);

  // Auto-clear the bound field when the filtered items change after initial mount.
  // This handles the case where a dependent field's value is no longer valid
  // (e.g., city select should reset when country changes and filters city list).
  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    if (!bind) return;
    store.setField(joinPath(prefix, bind), '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staticItems]);

  // Auto-clear the bound field when form-derived filters change for query-based datasources.
  // This mirrors the static-items auto-clear above, but fires on filtersKey instead of staticItems.
  const didMountQueryClear = useRef(false);
  useEffect(() => {
    if (!didMountQueryClear.current) {
      didMountQueryClear.current = true;
      return;
    }
    if (!bind || dataSource === undefined) return;
    const def = resolveDefinition(dataSource, registry);
    if (def === null || Array.isArray(def) || def === 'reactive') return;
    store.setField(joinPath(prefix, bind), '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

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
    const paramsKey = JSON.stringify(queryParams);

    deduplicatedQuery(definition, queryParams, paramsKey)
      .then(({ items, total }) => {
        if (cancelled) return;
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
