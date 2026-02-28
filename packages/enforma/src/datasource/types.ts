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
