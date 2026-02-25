// packages/enforma/src/datasource/types.ts
import type { FormValues } from '../store/FormStore';

export type DataSourceParams = {
  search: string;
  filters: Record<string, unknown>;
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
      filters: (scopeValues: FormValues, allValues: FormValues) => Record<string, unknown>;
    };

export type DataSourceResult<TItem> = {
  items: TItem[];
  total: number | undefined;
  isLoading: boolean;
  error: Error | null;
};
