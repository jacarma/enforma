// packages/enforma/src/hooks/useDataSource.ts
import { useState, useEffect, useSyncExternalStore } from 'react';
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
  search?: string;
  sort?: { field: string; direction: 'asc' | 'desc' } | null;
  pagination?: { page: number; pageSize: number };
};

const emptyItems: unknown[] = [];

function normalizeResult<TItem>(result: QueryResult<TItem>): { items: TItem[]; total: number | undefined } {
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
    return (registry[dataSource] as DataSourceDefinition<TItem>) ?? null;
  }
  // { source, filters }
  const src = dataSource.source;
  if (typeof src === 'string') {
    return (registry[src] as DataSourceDefinition<TItem>) ?? null;
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
    dataSource !== null &&
    dataSource !== undefined &&
    typeof dataSource === 'object' &&
    !Array.isArray(dataSource) &&
    typeof dataSource !== 'function' &&
    'filters' in dataSource
      ? dataSource.filters(scopeValues, allValues)
      : {};

  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    if (dataSource === undefined || dataSource === null) return;

    const definition = resolveDefinition(dataSource as DataSourceProp<TItem>, registry);
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
        const { items, total } = normalizeResult(result as QueryResult<TItem>);
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

  const definition = resolveDefinition(dataSource, registry);

  // Static array (inline or named)
  if (Array.isArray(definition)) {
    return { items: definition, total: undefined, isLoading: false, error: null };
  }

  // Form-reactive function
  if (definition === 'reactive') {
    const fn = dataSource as (scopeValues: FormValues, allValues: FormValues) => TItem[];
    return { items: fn(scopeValues, allValues), total: undefined, isLoading: false, error: null };
  }

  // Query — return async state
  return queryState;
}
