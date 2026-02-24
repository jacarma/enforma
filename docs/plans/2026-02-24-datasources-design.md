# DataSources — Design

**Date:** 2026-02-24

## Goal

Introduce a DataSource system so components like `Select`, `Autocomplete`, and `DataTable` can
receive data from a static list, form values, or an async API — without adapter authors duplicating
resolution logic.

---

## Types

### DataSourceDefinition

What gets passed to `<Form dataSources={{}}>` or used inline at the component.

```ts
type DataSourceParams = {
  search: string
  filters: Record<string, unknown>
  sort: { field: string; direction: 'asc' | 'desc' } | null
  pagination: { page: number; pageSize: number }
}

type QueryResult<TItem> = TItem[] | { items: TItem[]; total: number }

type DataSourceDefinition<TItem> =
  | TItem[]
  | { query: (params: DataSourceParams) => QueryResult<TItem> | Promise<QueryResult<TItem>> }
```

### DataSourceProp

What a component accepts as its `dataSource` prop.

```ts
type DataSourceProp<TItem> =
  | string                                                          // named ref — looks up in Form's dataSources
  | TItem[]                                                         // inline static array
  | ((scopeValues: FormValues, allValues: FormValues) => TItem[])  // form-reactive (sync)
  | {
      source: string | TItem[]                                      // named or inline static
      filters: (scopeValues: FormValues, allValues: FormValues) => Record<string, unknown>
    }
```

### DataSourceResult

What `useDataSource` returns to the adapter.

```ts
type DataSourceResult<TItem> = {
  items: TItem[]
  total: number | undefined   // only populated for paginated query results
  isLoading: boolean
  error: Error | null
}
```

---

## Form-level DataSources

DataSources are registered per-form via the `dataSources` prop. There is no global registry —
this avoids naming conflicts between forms on the same page and makes dependencies explicit.

For reuse across forms, define DataSources as exported constants and import them where needed.

```ts
// dataSources.ts
export const countries: DataSourceDefinition<Country> = [
  { code: 'us', name: 'United States' },
  { code: 'gb', name: 'United Kingdom' },
]

export const cities: DataSourceDefinition<City> = {
  query: async ({ filters, search }) => {
    const res = await fetch(`/api/cities?country=${String(filters.country)}&q=${search}`)
    return res.json() // { items: City[], total: number }
  },
}
```

```tsx
// MyForm.tsx
import { countries, cities } from './dataSources'

<Enforma.Form values={values} dataSources={{ countries, cities }}>
  <Enforma.Select bind="country" dataSource="countries">
    <Enforma.Select.Option label="name" value="code" />
  </Enforma.Select>

  <Enforma.Select
    bind="city"
    dataSource={{ source: 'cities', filters: (scope) => ({ country: scope.country }) }}
  >
    <Enforma.Select.Option label="name" value="code" />
  </Enforma.Select>
</Enforma.Form>
```

`FormProps` gains:

```ts
type FormProps = {
  // existing props...
  dataSources?: Record<string, DataSourceDefinition<unknown>>
}
```

The `dataSources` map is stored in a new `DataSourceContext` provided by `Form`.

---

## Component-level DataSource prop

Three inline forms that work without registering on the Form:

```tsx
// Inline static array
<Enforma.Select bind="role" dataSource={roleOptions}>
  <Enforma.Select.Option label="name" value="id" />
</Enforma.Select>

// Form-reactive (synchronous, derived from form values)
<Enforma.Select
  bind="city"
  dataSource={(scope) => allCities.filter((c) => c.country === scope.country)}
>
  <Enforma.Select.Option label="name" value="code" />
</Enforma.Select>

// Named source with form-derived filters
<Enforma.Select
  bind="city"
  dataSource={{ source: 'cities', filters: (scope) => ({ country: scope.country }) }}
>
  <Enforma.Select.Option label="name" value="code" />
</Enforma.Select>
```

---

## `useDataSource` hook

Primary hook for adapter authors. The adapter passes its own component state; the library
handles registry lookup, form-reactive filter evaluation, and async lifecycle.

### Signature

```ts
function useDataSource<TItem>(
  dataSource: DataSourceProp<TItem> | undefined,
  params?: {
    search?: string
    sort?: { field: string; direction: 'asc' | 'desc' } | null
    pagination?: { page: number; pageSize: number }
  },
): DataSourceResult<TItem>
```

### Resolution steps

1. **Resolve definition**
   - `string` → look up in `DataSourceContext`
   - `TItem[]` → use directly as a static definition
   - `{ source, filters }` → look up `source` in `DataSourceContext`, keep `filters` fn
   - `(scope, all) => TItem[]` → form-reactive path, skip to step 3

2. **Evaluate form-derived filters** (subscribes to form store via `useSyncExternalStore`)
   ```ts
   const filters = dataSource.filters?.(scopeValues, allValues) ?? {}
   ```

3. **Resolve items**
   - Static array → `items = definition`, `isLoading = false`
   - Form-reactive function → `items = fn(scopeValues, allValues)`, re-evaluates on store change
   - Query → call `definition.query({ search, filters, sort, pagination })` via `useEffect`,
     manage `{ items, total, isLoading, error }` with `useState`

4. **Re-run query on param changes**
   Query `useEffect` deps: `[search, filters, sort, pagination]`

### Adapter usage

```ts
// Select adapter — no component params needed
function MySelect(props: SelectProps) {
  const { items, isLoading } = useDataSource(props.dataSource)
  // resolve label/value from Select.Option child...
}

// Autocomplete adapter — passes search
function MyAutocomplete(props: AutocompleteProps) {
  const [search, setSearch] = useState('')
  const { items, isLoading } = useDataSource(props.dataSource, { search })
}

// DataTable adapter — passes all params
function MyDataTable(props: DataTableProps) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<Sort | null>(null)
  const [pagination, setPagination] = useState({ page: 0, pageSize: 20 })
  const { items, total, isLoading, error } = useDataSource(props.dataSource, {
    search,
    sort,
    pagination,
  })
}
```

---

## `Select.Option` slot

Defined in the core library so all adapters share the same contract. Follows the same
`string | ((item) => T)` pattern as `evalProp` in `enforma-mui/List`.

```ts
// packages/enforma/src/components/SelectOption.tsx
type SelectOptionProps<TItem = FormValues> = {
  label: string | ((item: TItem) => string)
  value: string | ((item: TItem) => unknown)
}

export function SelectOption(_: SelectOptionProps): null { return null }
```

`SelectProps` gains `dataSource` and `children`:

```ts
type SelectProps = CommonProps & {
  dataSource?: DataSourceProp<unknown>
  children?: ReactNode
}
```

`Select` in `fields.tsx` gets `Object.assign` to expose `Select.Option`:

```ts
export const Select = Object.assign(
  memo((props: SelectProps) => dispatchComponent('Select', props), stablePropsEqual),
  { Option: SelectOption },
)
```

Adapters parse the slot via `React.Children`:

```ts
React.Children.forEach(props.children, (child) => {
  if (React.isValidElement(child) && child.type === SelectOption) {
    const { label, value } = child.props as SelectOptionProps
    // use label/value to map items
  }
})
```

---

## File structure

```
packages/enforma/src/
  datasource/
    types.ts              — DataSourceDefinition, DataSourceParams, DataSourceProp, DataSourceResult
  context/
    DataSourceContext.ts  — context + useDataSources (internal lookup hook)
  hooks/
    useDataSource.ts      — public useDataSource hook for adapter authors
  components/
    SelectOption.tsx      — SelectOption slot component
    types.ts              — SelectProps + FormProps updated
    fields.tsx            — Select.Option attached via Object.assign
  index.ts                — updated exports
```

---

## Public API additions

```ts
// hooks
export { useDataSource } from './hooks/useDataSource'

// components
export { SelectOption } from './components/SelectOption'

// types
export type {
  DataSourceDefinition,
  DataSourceParams,
  DataSourceProp,
  DataSourceResult,
} from './datasource/types'
```

---

## Testing strategy

- `useDataSource` with an inline static array
- `useDataSource` with a named static DataSource (looked up from context)
- `useDataSource` with a form-reactive function — re-evaluates when form state changes
- `useDataSource` with a query DataSource — returns `isLoading: true` then resolves to items
- `useDataSource` with a query DataSource + `filters` from scope — filters passed to query
- `useDataSource` with component params (`search`, `sort`, `pagination`) — re-runs on change
- `useDataSource` when query rejects — returns `error`
- `Select.Option` label/value resolution with string key and function variants
- `FormProps.dataSources` — named DataSource available to child components
