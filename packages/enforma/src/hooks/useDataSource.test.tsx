// packages/enforma/src/hooks/useDataSource.test.tsx
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { type ReactNode } from 'react';
import { Form } from '../components/Form';
import { useDataSource } from './useDataSource';
import type { DataSourceDefinition } from '../datasource/types';

type Country = { code: string; name: string };

const countries: Country[] = [
  { code: 'us', name: 'United States' },
  { code: 'gb', name: 'United Kingdom' },
];

function makeWrapper(dataSources?: Record<string, DataSourceDefinition<unknown>>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <Form values={{}} onChange={() => undefined} {...(dataSources !== undefined ? { dataSources } : {})}>
        {children}
      </Form>
    );
  };
}

describe('useDataSource — named static DataSource', () => {
  it('returns items for a named static array from Form dataSources', () => {
    const { result } = renderHook(() => useDataSource<Country>('countries'), {
      wrapper: makeWrapper({ countries }),
    });
    expect(result.current.items).toEqual(countries);
    expect(result.current.isLoading).toBe(false);
  });

  it('returns empty items when the named DataSource is not found', () => {
    const { result } = renderHook(() => useDataSource<Country>('missing'), {
      wrapper: makeWrapper(),
    });
    expect(result.current.items).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });
});

describe('useDataSource — static array', () => {
  it('returns items immediately for an inline static array', () => {
    const { result } = renderHook(() => useDataSource<Country>(countries), {
      wrapper: makeWrapper(),
    });
    expect(result.current.items).toEqual(countries);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.total).toBeUndefined();
  });

  it('returns empty items when dataSource is undefined', () => {
    const { result } = renderHook(() => useDataSource<Country>(undefined), {
      wrapper: makeWrapper(),
    });
    expect(result.current.items).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });
});

describe('useDataSource — form-reactive function', () => {
  it('returns items derived from current form values', () => {
    type City = { name: string; country: string };
    const allCities: City[] = [
      { name: 'New York', country: 'us' },
      { name: 'London', country: 'gb' },
    ];

    const { result } = renderHook(
      () =>
        useDataSource<City>((scope) =>
          allCities.filter((c) => c.country === (scope.country as string)),
        ),
      {
        wrapper: ({ children }) => (
          <Form values={{ country: 'us' }} onChange={() => undefined}>
            {children}
          </Form>
        ),
      },
    );

    expect(result.current.items).toEqual([{ name: 'New York', country: 'us' }]);
    expect(result.current.isLoading).toBe(false);
  });
});

describe('useDataSource — named source with filters', () => {
  it('passes form-derived filters to a named static source (acts as client-side filter reference)', () => {
    // { source, filters } with a static array resolves the static array.
    // The filters are relevant for query DataSources (Task 8).
    // This test verifies the object form resolves the named static source.
    const { result } = renderHook(
      () =>
        useDataSource<Country>({
          source: 'countries',
          filters: (scope) => ({ continent: scope.continent }),
        }),
      {
        wrapper: makeWrapper({ countries }),
      },
    );

    expect(result.current.items).toEqual(countries);
    expect(result.current.isLoading).toBe(false);
  });
});
