// packages/enforma/src/context/DataSourceContext.test.tsx
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { type ReactNode } from 'react';
import { DataSourceContext, useDataSources } from './DataSourceContext';

describe('useDataSources', () => {
  it('returns an empty map when no provider is present', () => {
    // useDataSources should NOT throw — it returns {} by default
    const { result } = renderHook(() => useDataSources());
    expect(result.current).toEqual({});
  });

  it('returns the dataSources map provided by the context', () => {
    const countries = [{ code: 'us', name: 'United States' }];
    const wrapper = ({ children }: { children: ReactNode }) => (
      <DataSourceContext.Provider value={{ countries }}>{children}</DataSourceContext.Provider>
    );
    const { result } = renderHook(() => useDataSources(), { wrapper });
    expect(result.current).toEqual({ countries });
  });
});
