// packages/enforma/src/context/DataSourceContext.ts
import { createContext, useContext } from 'react';
import type { DataSourceDefinition } from '../datasource/types';

type DataSourceMap = Record<string, DataSourceDefinition<unknown>>;

export const DataSourceContext = createContext<DataSourceMap>({});

export function useDataSources(): DataSourceMap {
  return useContext(DataSourceContext);
}
