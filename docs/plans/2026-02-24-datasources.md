# DataSources Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a DataSource system to the core library so Select, Autocomplete, and DataTable adapters can receive data from static lists, form values, or async queries via a single `useDataSource` hook.

**Architecture:** Three new modules: `datasource/types.ts` (shared types), `context/DataSourceContext.ts` (form-scoped registry), and `hooks/useDataSource.ts` (the adapter-facing hook). `Form` grows a `dataSources` prop that feeds the context. `SelectOption` is added as a core slot component mirroring the existing `evalProp` pattern in `enforma-mui/List`. No global registry — DataSources are scoped per form instance to avoid cross-page conflicts.

**Tech Stack:** TypeScript strict, React 18, Vitest, @testing-library/react. Tests use `renderHook` for hook-only tests, `render` for component integration tests. All tests live alongside source files (e.g. `useDataSource.test.ts` next to `useDataSource.ts`). The global test setup in `src/test/setup.tsx` registers a `DefaultTextInput` and clears the registry between tests — you do not need to repeat this per file.

---

## Task 1: DataSource types

**Files:**
- Create: `packages/enforma/src/datasource/types.ts`

**Step 1: Create the file**

```ts
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
```

**Step 2: Verify**

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm --filter enforma typecheck
```

Expected: no errors.

**Step 3: Commit**

```bash
git add packages/enforma/src/datasource/types.ts
git commit -m "feat: add DataSource types"
```

---

## Task 2: DataSourceContext

**Files:**
- Create: `packages/enforma/src/context/DataSourceContext.ts`
- Create: `packages/enforma/src/context/DataSourceContext.test.tsx`

**Step 1: Write the failing test**

```tsx
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
      <DataSourceContext.Provider value={{ countries }}>
        {children}
      </DataSourceContext.Provider>
    );
    const { result } = renderHook(() => useDataSources(), { wrapper });
    expect(result.current).toEqual({ countries });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
nvm use 20 && pnpm --filter enforma test -- DataSourceContext
```

Expected: FAIL — `DataSourceContext` not found.

**Step 3: Implement**

```ts
// packages/enforma/src/context/DataSourceContext.ts
import { createContext, useContext } from 'react';
import type { DataSourceDefinition } from '../datasource/types';

type DataSourceMap = Record<string, DataSourceDefinition<unknown>>;

export const DataSourceContext = createContext<DataSourceMap>({});

export function useDataSources(): DataSourceMap {
  return useContext(DataSourceContext);
}
```

**Step 4: Run test to verify it passes**

```bash
nvm use 20 && pnpm --filter enforma test -- DataSourceContext
```

Expected: PASS.

**Step 5: Commit**

```bash
git add packages/enforma/src/context/DataSourceContext.ts packages/enforma/src/context/DataSourceContext.test.tsx
git commit -m "feat: add DataSourceContext"
```

---

## Task 3: Form accepts `dataSources` prop

**Files:**
- Modify: `packages/enforma/src/components/Form.tsx`
- Modify: `packages/enforma/src/components/Form.test.tsx`

**Step 1: Write the failing test**

Add this `describe` block to the bottom of `Form.test.tsx`:

```tsx
import { renderHook } from '@testing-library/react';
import { useDataSources } from '../context/DataSourceContext';

describe('Form dataSources', () => {
  it('makes named DataSources available to descendants via useDataSources', () => {
    const countries = [{ code: 'us', name: 'United States' }];

    const { result } = renderHook(() => useDataSources(), {
      wrapper: ({ children }) => (
        <Form values={{}} onChange={vi.fn()} dataSources={{ countries }}>
          {children}
        </Form>
      ),
    });

    expect(result.current).toEqual({ countries });
  });

  it('provides an empty map when dataSources prop is omitted', () => {
    const { result } = renderHook(() => useDataSources(), {
      wrapper: ({ children }) => (
        <Form values={{}} onChange={vi.fn()}>
          {children}
        </Form>
      ),
    });

    expect(result.current).toEqual({});
  });
});
```

**Step 2: Run test to verify it fails**

```bash
nvm use 20 && pnpm --filter enforma test -- Form.test
```

Expected: FAIL — `dataSources` prop not accepted.

**Step 3: Implement**

In `Form.tsx`, add the import at the top:

```ts
import { DataSourceContext } from '../context/DataSourceContext';
import type { DataSourceDefinition } from '../datasource/types';
```

Add `dataSources` to `FormProps`:

```ts
type FormProps = {
  values: FormValues;
  onChange: (values: FormValues, state: ValidationState) => void;
  onSubmit?: (values: FormValues) => void;
  showErrors?: boolean;
  messages?: Partial<Record<string, string>>;
  children: ReactNode;
  'aria-label'?: string;
  dataSources?: Record<string, DataSourceDefinition<unknown>>;
};
```

Add `dataSources` to the destructured params (with default `{}`):

```ts
export function Form({
  values,
  onChange,
  onSubmit,
  showErrors = false,
  messages = emptyMessages,
  children,
  'aria-label': ariaLabel = 'form',
  dataSources = emptyDataSources,
}: FormProps) {
```

Add the empty fallback constant near `emptyMessages` at the top of the file:

```ts
const emptyDataSources: Record<string, DataSourceDefinition<unknown>> = {};
```

Wrap the existing providers with `DataSourceContext.Provider`:

```tsx
return (
  <DataSourceContext.Provider value={dataSources}>
    <FormContext.Provider value={store}>
      <FormSettingsContext.Provider value={formSettings}>
        <ScopeContext.Provider value={scopeValue}>
          <form aria-label={ariaLabel} onSubmit={handleSubmit}>
            {wrappedChildren}
          </form>
        </ScopeContext.Provider>
      </FormSettingsContext.Provider>
    </FormContext.Provider>
  </DataSourceContext.Provider>
);
```

**Step 4: Run all tests**

```bash
nvm use 20 && pnpm --filter enforma test
```

Expected: all pass.

**Step 5: Commit**

```bash
git add packages/enforma/src/components/Form.tsx packages/enforma/src/components/Form.test.tsx
git commit -m "feat: Form accepts dataSources prop, provides DataSourceContext"
```

---

## Task 4: `useDataSource` — inline static array

**Files:**
- Create: `packages/enforma/src/hooks/useDataSource.ts`
- Create: `packages/enforma/src/hooks/useDataSource.test.tsx`

The hook always needs to be called inside a `<Form>` because it uses `useScope()` internally. All tests use a `Form` wrapper.

**Step 1: Write the failing test**

```tsx
// packages/enforma/src/hooks/useDataSource.test.tsx
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { type ReactNode } from 'react';
import { Form } from '../components/Form';
import { useDataSource } from './useDataSource';

type Country = { code: string; name: string };

const countries: Country[] = [
  { code: 'us', name: 'United States' },
  { code: 'gb', name: 'United Kingdom' },
];

function makeWrapper(dataSources?: Record<string, unknown>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <Form values={{}} onChange={() => undefined} dataSources={dataSources}>
        {children}
      </Form>
    );
  };
}

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
```

**Step 2: Run test to verify it fails**

```bash
nvm use 20 && pnpm --filter enforma test -- useDataSource
```

Expected: FAIL — `useDataSource` not found.

**Step 3: Implement (static array only)**

```ts
// packages/enforma/src/hooks/useDataSource.ts
import { useState, useEffect } from 'react';
import { useSyncExternalStore } from 'react';
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
```

**Step 4: Run test to verify it passes**

```bash
nvm use 20 && pnpm --filter enforma test -- useDataSource
```

Expected: PASS.

**Step 5: Commit**

```bash
git add packages/enforma/src/hooks/useDataSource.ts packages/enforma/src/hooks/useDataSource.test.tsx
git commit -m "feat: useDataSource — inline static array"
```

---

## Task 5: `useDataSource` — named static DataSource

**Files:**
- Modify: `packages/enforma/src/hooks/useDataSource.test.tsx`

**Step 1: Add the tests**

Add to `useDataSource.test.tsx`:

```tsx
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
```

**Step 2: Run tests**

```bash
nvm use 20 && pnpm --filter enforma test -- useDataSource
```

Expected: PASS — the implementation from Task 4 already handles this.

**Step 3: Commit**

```bash
git add packages/enforma/src/hooks/useDataSource.test.tsx
git commit -m "test: useDataSource — named static DataSource"
```

---

## Task 6: `useDataSource` — form-reactive function

**Files:**
- Modify: `packages/enforma/src/hooks/useDataSource.test.tsx`

**Step 1: Add the tests**

```tsx
import { act } from '@testing-library/react';
import { TextInput } from '../components/fields';
import { registerComponents } from '../components/registry';
import { useFieldProps } from './useField';
import type { TextInputProps } from '../components/types';

// (add this before the describe blocks — reuse DefaultTextInput already registered by setup.tsx)

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
```

**Step 2: Run tests**

```bash
nvm use 20 && pnpm --filter enforma test -- useDataSource
```

Expected: PASS — already handled in Task 4 implementation.

**Step 3: Commit**

```bash
git add packages/enforma/src/hooks/useDataSource.test.tsx
git commit -m "test: useDataSource — form-reactive function"
```

---

## Task 7: `useDataSource` — named source with form-derived filters

**Files:**
- Modify: `packages/enforma/src/hooks/useDataSource.test.tsx`

**Step 1: Add the test**

```tsx
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
```

**Step 2: Run tests**

```bash
nvm use 20 && pnpm --filter enforma test -- useDataSource
```

Expected: PASS.

**Step 3: Commit**

```bash
git add packages/enforma/src/hooks/useDataSource.test.tsx
git commit -m "test: useDataSource — named source with filters object form"
```

---

## Task 8: `useDataSource` — query DataSource

**Files:**
- Modify: `packages/enforma/src/hooks/useDataSource.test.tsx`

**Step 1: Add the tests**

```tsx
import { waitFor } from '@testing-library/react';
import { vi } from 'vitest';

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

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toEqual([{ code: 'us', name: 'United States' }]);
    expect(result.current.total).toBe(42);
  });

  it('sets error when the query rejects', async () => {
    const queryFn = vi.fn().mockRejectedValue(new Error('Network error'));
    const ds = { countries: { query: queryFn } };

    const { result } = renderHook(() => useDataSource<Country>('countries'), {
      wrapper: makeWrapper(ds),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Network error');
    expect(result.current.items).toEqual([]);
  });

  it('passes component params (search, sort, pagination) to the query function', async () => {
    const queryFn = vi.fn().mockResolvedValue([]);

    const { result: _ } = renderHook(
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
    const { rerender } = renderHook(
      () => useDataSource<Country>('countries', { search }),
      { wrapper: makeWrapper(ds) },
    );

    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(1));

    search = 'ab';
    rerender();

    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(2));
  });

  it('passes form-derived filters to the query function', async () => {
    const queryFn = vi.fn().mockResolvedValue([]);

    const { result: _ } = renderHook(
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
      expect(queryFn).toHaveBeenCalledWith(
        expect.objectContaining({ filters: { country: 'us' } }),
      );
    });
  });
});
```

**Step 2: Run tests**

```bash
nvm use 20 && pnpm --filter enforma test -- useDataSource
```

Expected: PASS — the Task 4 implementation already handles all these cases.

**Step 3: Run full suite to confirm no regressions**

```bash
nvm use 20 && pnpm --filter enforma test
```

Expected: all pass.

**Step 4: Commit**

```bash
git add packages/enforma/src/hooks/useDataSource.test.tsx
git commit -m "test: useDataSource — query DataSource, async state, component params, filters"
```

---

## Task 9: `SelectOption` slot + `Select.Option`

**Files:**
- Create: `packages/enforma/src/components/SelectOption.tsx`
- Modify: `packages/enforma/src/components/types.ts`
- Modify: `packages/enforma/src/components/fields.tsx`
- Create: `packages/enforma/src/components/SelectOption.test.tsx`

**Step 1: Write the failing tests**

```tsx
// packages/enforma/src/components/SelectOption.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Select, SelectOption } from './fields';

describe('SelectOption', () => {
  it('renders null', () => {
    const { container } = render(<SelectOption label="name" value="code" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('Select.Option', () => {
  it('Select.Option is the SelectOption component', () => {
    expect(Select.Option).toBe(SelectOption);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
nvm use 20 && pnpm --filter enforma test -- SelectOption
```

Expected: FAIL.

**Step 3: Create `SelectOption.tsx`**

```tsx
// packages/enforma/src/components/SelectOption.tsx
import type { FormValues } from '../store/FormStore';

export type SelectOptionProps<TItem = FormValues> = {
  label: string | ((item: TItem) => string);
  value: string | ((item: TItem) => unknown);
};

// Props are read externally by the adapter via React.Children — not used in the body.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function SelectOption(_: SelectOptionProps): null {
  return null;
}
```

**Step 4: Update `SelectProps` in `types.ts`**

In `packages/enforma/src/components/types.ts`, change:

```ts
export type SelectProps = CommonProps;
```

To:

```ts
import type { ReactNode } from 'react';
import type { DataSourceProp } from '../datasource/types';

export type SelectProps = CommonProps & {
  dataSource?: DataSourceProp<unknown>;
  children?: ReactNode;
};
```

**Step 5: Attach `Select.Option` in `fields.tsx`**

In `packages/enforma/src/components/fields.tsx`, add the import:

```ts
import { SelectOption } from './SelectOption';
```

Change the `Select` export from:

```ts
export const Select = memo(
  (props: SelectProps) => dispatchComponent('Select', props),
  stablePropsEqual,
);
```

To:

```ts
export const Select = Object.assign(
  memo((props: SelectProps) => dispatchComponent('Select', props), stablePropsEqual),
  { Option: SelectOption },
);
```

Also add `SelectOption` to the named exports at the bottom of `fields.tsx`:

```ts
export { SelectOption };
```

**Step 6: Run tests**

```bash
nvm use 20 && pnpm --filter enforma test -- SelectOption
```

Expected: PASS.

**Step 7: Run full suite**

```bash
nvm use 20 && pnpm --filter enforma test
```

Expected: all pass.

**Step 8: Commit**

```bash
git add packages/enforma/src/components/SelectOption.tsx packages/enforma/src/components/SelectOption.test.tsx packages/enforma/src/components/types.ts packages/enforma/src/components/fields.tsx
git commit -m "feat: add SelectOption slot and Select.Option"
```

---

## Task 10: Update public exports

**Files:**
- Modify: `packages/enforma/src/index.ts`

**Step 1: Add new exports**

In `packages/enforma/src/index.ts`, add:

```ts
export { useDataSource } from './hooks/useDataSource';
export { SelectOption } from './components/SelectOption';
export type {
  DataSourceDefinition,
  DataSourceParams,
  DataSourceProp,
  DataSourceResult,
} from './datasource/types';
export type { SelectOptionProps } from './components/SelectOption';
```

**Step 2: Verify typecheck and tests**

```bash
nvm use 20 && pnpm lint && pnpm typecheck && pnpm test
```

Expected: all pass, no errors or warnings.

**Step 3: Commit**

```bash
git add packages/enforma/src/index.ts
git commit -m "feat: export DataSource API from enforma public index"
```

---

## Task 11: Demo app

Add a DataSource example to the demo so the feature is visible end-to-end. This requires a minimal Select adapter registered in the demo (since `enforma-mui` does not yet have a DataSource-aware Select).

**Files:**
- Modify: `apps/demo/src/App.tsx`

**Step 1: Add a demo Select adapter and DataSource example**

At the top of `App.tsx`, add:

```tsx
import React from 'react';
import {
  registerComponents,
  useFieldProps,
  useDataSource,
  SelectOption,
  type SelectProps,
} from 'enforma';

// Minimal Select adapter for demo purposes
function DemoSelect(props: SelectProps) {
  const { value, setValue, label, error, showError } = useFieldProps<string>(props);

  // Parse Select.Option child
  let getLabel: (item: unknown) => string = (item) => String(item);
  let getValue: (item: unknown) => string = (item) => String(item);

  React.Children.forEach(props.children, (child) => {
    if (React.isValidElement(child) && child.type === SelectOption) {
      const optProps = child.props as { label: string | ((item: unknown) => string); value: string | ((item: unknown) => string) };
      getLabel = typeof optProps.label === 'function' ? optProps.label : (item) => String((item as Record<string, unknown>)[optProps.label as string] ?? '');
      getValue = typeof optProps.value === 'function' ? optProps.value : (item) => String((item as Record<string, unknown>)[optProps.value as string] ?? '');
    }
  });

  const { items, isLoading } = useDataSource(props.dataSource);

  return (
    <div style={{ marginBottom: '1rem' }}>
      {label && <label>{label}</label>}
      <select
        value={value ?? ''}
        onChange={(e) => { setValue(e.target.value); }}
        disabled={isLoading}
      >
        <option value="">— select —</option>
        {items.map((item, i) => (
          <option key={i} value={getValue(item)}>
            {getLabel(item)}
          </option>
        ))}
      </select>
      {showError && error && <span style={{ color: 'red' }}>{error}</span>}
    </div>
  );
}
```

Register it alongside `classic`:

```ts
registerComponents({ ...classic, Select: DemoSelect });
```

Add a DataSource demo section inside the returned JSX:

```tsx
<hr style={{ margin: '2rem 0' }} />

<h2>DataSources</h2>
<p style={{ color: '#555', marginBottom: '1rem' }}>
  Select options driven by a static DataSource defined on the Form.
</p>

<Enforma.Form
  values={{ country: '', city: '' }}
  onChange={() => undefined}
  aria-label="datasource demo form"
  dataSources={{
    countries: [
      { code: 'us', name: 'United States' },
      { code: 'gb', name: 'United Kingdom' },
      { code: 'fr', name: 'France' },
    ],
    cities: [
      { code: 'nyc', name: 'New York', country: 'us' },
      { code: 'la', name: 'Los Angeles', country: 'us' },
      { code: 'lon', name: 'London', country: 'gb' },
      { code: 'par', name: 'Paris', country: 'fr' },
    ],
  }}
>
  <Enforma.Select bind="country" label="Country" dataSource="countries">
    <Enforma.Select.Option label="name" value="code" />
  </Enforma.Select>

  <Enforma.Select
    bind="city"
    label="City"
    dataSource={{
      source: 'cities',
      filters: (scope) => ({ country: scope.country }),
    }}
  >
    <Enforma.Select.Option label="name" value="code" />
  </Enforma.Select>
</Enforma.Form>
```

**Step 2: Run the demo to verify visually**

```bash
nvm use 20 && pnpm dev
```

Open `http://localhost:5173`. Scroll to the DataSources section. Selecting a country should populate the city dropdown.

**Step 3: Run lint and tests**

```bash
nvm use 20 && pnpm lint && pnpm test
```

Expected: all pass.

**Step 4: Commit**

```bash
git add apps/demo/src/App.tsx
git commit -m "demo: add DataSources example with static and form-filtered selects"
```

---

## Final state

New public exports from `enforma`:

```ts
// Hook
useDataSource<TItem>(dataSource, params?) → DataSourceResult<TItem>

// Component
SelectOption  // + Select.Option shorthand

// Types
DataSourceDefinition<TItem>
DataSourceParams
DataSourceProp<TItem>
DataSourceResult<TItem>
SelectOptionProps<TItem>
```

Form usage:

```tsx
<Enforma.Form dataSources={{ countries: [...], cities: { query: fn } }}>
  <Enforma.Select bind="country" dataSource="countries">
    <Enforma.Select.Option label="name" value="code" />
  </Enforma.Select>
</Enforma.Form>
```
