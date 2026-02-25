// packages/enforma/src/hooks/useDataSource.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { type ReactNode } from 'react';
import { Form } from '../components/Form';
import { useDataSource } from './useDataSource';
import { useScope } from '../context/ScopeContext';
import type { FormStore } from '../store/FormStore';
import type { DataSourceDefinition } from '../datasource/types';

type Country = { code: string; name: string };

const countries: Country[] = [
  { code: 'us', name: 'United States' },
  { code: 'gb', name: 'United Kingdom' },
];

function makeWrapper(dataSources?: Record<string, DataSourceDefinition<unknown>>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <Form
        values={{}}
        onChange={() => undefined}
        {...(dataSources !== undefined ? { dataSources } : {})}
      >
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
  it('filters a named static array by equality when { source, filters } form is used', () => {
    type City = { code: string; name: string; country: string };
    const cities: City[] = [
      { code: 'nyc', name: 'New York', country: 'us' },
      { code: 'lon', name: 'London', country: 'gb' },
    ];

    const { result } = renderHook(
      () =>
        useDataSource<City>({
          source: 'cities',
          filters: () => ({ country: 'us' }),
        }),
      { wrapper: makeWrapper({ cities }) },
    );

    expect(result.current.items).toEqual([{ code: 'nyc', name: 'New York', country: 'us' }]);
    expect(result.current.isLoading).toBe(false);
  });

  it('returns all items when no filter values match any items', () => {
    type City = { code: string; name: string; country: string };
    const cities: City[] = [
      { code: 'nyc', name: 'New York', country: 'us' },
      { code: 'lon', name: 'London', country: 'gb' },
    ];

    const { result } = renderHook(
      () =>
        useDataSource<City>({
          source: 'cities',
          filters: () => ({ country: 'de' }),
        }),
      { wrapper: makeWrapper({ cities }) },
    );

    expect(result.current.items).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });
});

describe('useDataSource — query DataSource', () => {
  it('starts with isLoading:true and resolves to items', async () => {
    const queryFn = vi.fn().mockResolvedValue([{ code: 'us', name: 'United States' }]);
    const ds = { countries: { query: queryFn } };

    const { result } = renderHook(() => useDataSource<Country>('countries'), {
      wrapper: makeWrapper(ds),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.items).toEqual([{ code: 'us', name: 'United States' }]);
    expect(result.current.error).toBeNull();
  });

  it('supports paginated results — populates total', async () => {
    const queryFn = vi.fn().mockResolvedValue({
      items: [{ code: 'us', name: 'United States' }],
      total: 42,
    });
    const ds = { countries: { query: queryFn } };

    const { result } = renderHook(() => useDataSource<Country>('countries'), {
      wrapper: makeWrapper(ds),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.items).toEqual([{ code: 'us', name: 'United States' }]);
    expect(result.current.total).toBe(42);
  });

  it('sets error when the query rejects', async () => {
    const queryFn = vi.fn().mockRejectedValue(new Error('Network error'));
    const ds = { countries: { query: queryFn } };

    const { result } = renderHook(() => useDataSource<Country>('countries'), {
      wrapper: makeWrapper(ds),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Network error');
    expect(result.current.items).toEqual([]);
  });

  it('passes component params (search, sort, pagination) to the query function', async () => {
    const queryFn = vi.fn().mockResolvedValue([]);

    renderHook(
      () =>
        useDataSource<Country>('countries', {
          search: 'uni',
          sort: { field: 'name', direction: 'asc' },
          pagination: { page: 2, pageSize: 10 },
        }),
      { wrapper: makeWrapper({ countries: { query: queryFn } }) },
    );

    await waitFor(() => {
      expect(queryFn).toHaveBeenCalledWith({
        search: 'uni',
        filters: {},
        sort: { field: 'name', direction: 'asc' },
        pagination: { page: 2, pageSize: 10 },
      });
    });
  });

  it('re-runs the query when search changes', async () => {
    const queryFn = vi.fn().mockResolvedValue([]);
    const ds = { countries: { query: queryFn } };

    let search = 'a';
    const { rerender } = renderHook(() => useDataSource<Country>('countries', { search }), {
      wrapper: makeWrapper(ds),
    });

    await waitFor(() => {
      expect(queryFn).toHaveBeenCalledTimes(1);
    });

    search = 'ab';
    rerender();

    await waitFor(() => {
      expect(queryFn).toHaveBeenCalledTimes(2);
    });
  });

  it('passes form-derived filters to the query function', async () => {
    const queryFn = vi.fn().mockResolvedValue([]);

    renderHook(
      () =>
        useDataSource<Country>({
          source: 'cities',
          filters: (scope) => ({ country: scope.country }),
        }),
      {
        wrapper: ({ children }) => (
          <Form
            values={{ country: 'us' }}
            onChange={() => undefined}
            dataSources={{ cities: { query: queryFn } }}
          >
            {children}
          </Form>
        ),
      },
    );

    await waitFor(() => {
      expect(queryFn).toHaveBeenCalledWith(expect.objectContaining({ filters: { country: 'us' } }));
    });
  });
});

describe('useDataSource — auto-clear on items change', () => {
  type City = { code: string; name: string; country: string };

  const allCities: City[] = [
    { code: 'nyc', name: 'New York', country: 'us' },
    { code: 'lon', name: 'London', country: 'gb' },
  ];

  function makeAutoWrapper(initialValues: Record<string, unknown>) {
    let capturedStore: FormStore | null = null;

    function GrabStore() {
      capturedStore = useScope().store;
      return null;
    }

    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <Form values={initialValues} onChange={() => undefined} dataSources={{ cities: allCities }}>
          <GrabStore />
          {children}
        </Form>
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return { Wrapper, getStore: () => capturedStore! };
  }

  it('clears the bound field when filtered items change after mount', async () => {
    const { Wrapper, getStore } = makeAutoWrapper({ country: 'us', city: 'nyc' });

    renderHook(
      () =>
        useDataSource<City>(
          { source: 'cities', filters: (scope) => ({ country: scope.country }) },
          { bind: 'city' },
        ),
      { wrapper: Wrapper },
    );

    // After initial mount the city value must be preserved.
    expect(getStore().getField('city')).toBe('nyc');

    // Changing country changes the filtered set → should clear city.
    act(() => {
      getStore().setField('country', 'gb');
    });

    await waitFor(() => {
      expect(getStore().getField('city')).toBe('');
    });
  });

  it('does not clear the bound field on initial mount', () => {
    const { Wrapper, getStore } = makeAutoWrapper({ country: 'us', city: 'nyc' });

    renderHook(
      () =>
        useDataSource<City>(
          { source: 'cities', filters: (scope) => ({ country: scope.country }) },
          { bind: 'city' },
        ),
      { wrapper: Wrapper },
    );

    // Initial mount must not wipe a pre-populated value.
    expect(getStore().getField('city')).toBe('nyc');
  });

  it('does nothing when bind is not provided', async () => {
    const { Wrapper, getStore } = makeAutoWrapper({ country: 'us', city: 'nyc' });

    renderHook(
      () =>
        useDataSource<City>(
          { source: 'cities', filters: (scope) => ({ country: scope.country }) },
          // no bind
        ),
      { wrapper: Wrapper },
    );

    act(() => {
      getStore().setField('country', 'gb');
    });

    await waitFor(() => {
      // City should NOT be cleared since bind was not provided.
      expect(getStore().getField('city')).toBe('nyc');
    });
  });
});
