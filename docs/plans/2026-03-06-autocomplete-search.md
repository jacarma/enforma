# Autocomplete Server-Side Search — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `resolve`, `minSearchLength`, and automatic `disableClientFilter` to the Autocomplete component, then replace the PokéAPI autocomplete demo with an Open Library book search that exercises all three features.

**Architecture:** `resolveDefinition` is exported from `useDataSource.ts` so `AutocompleteDispatch` can inspect the active datasource type without re-implementing the registry lookup. `minSearchLength` gates whether a datasource is passed to `useDataSource` at all (passing `undefined` when below threshold). `disableClientFilter` is auto-detected from whether the resolved definition has a `query` function.

**Tech Stack:** TypeScript strict, React hooks, Vitest + @testing-library/react, MUI Autocomplete v6, Open Library REST API (no auth, CORS-enabled)

---

## Task 1: Types + Infrastructure

Add `resolve` to `DataSourceDefinition`, add `minSearchLength`/`disableClientFilter` to component types, and export `resolveDefinition` from `useDataSource`.

**Files:**
- Modify: `packages/enforma/src/datasource/types.ts`
- Modify: `packages/enforma/src/hooks/useDataSource.ts`
- Modify: `packages/enforma/src/components/types.ts`

**Step 1: Add `resolve` to `DataSourceDefinition`**

In `packages/enforma/src/datasource/types.ts`, change lines 29-31:

```ts
export type DataSourceDefinition<TItem> =
  | TItem[]
  | {
      query: (params: DataSourceParams) => QueryResult<TItem> | Promise<QueryResult<TItem>>;
      resolve?: (value: unknown) => TItem | Promise<TItem>;
    };
```

**Step 2: Export `resolveDefinition` from `useDataSource.ts`**

In `packages/enforma/src/hooks/useDataSource.ts`, change line 63 from:

```ts
function resolveDefinition<TItem>(
```

to:

```ts
export function resolveDefinition<TItem>(
```

**Step 3: Add `minSearchLength` to `AutocompleteProps` and `disableClientFilter` to `ResolvedAutocompleteProps`**

In `packages/enforma/src/components/types.ts`, change lines 68-71:

```ts
export type AutocompleteProps = CommonProps & {
  dataSource?: DataSourceProp<unknown>;
  children?: ReactNode;
  minSearchLength?: Reactive<number>;
};
```

And change lines 78-87:

```ts
export type ResolvedAutocompleteProps = ResolvedCommonProps & {
  value: unknown;
  setValue: (value: unknown) => void;
  options: { value: unknown; label: string }[];
  children: ReactNode;
  displayValue: string;
  isLoading: boolean;
  dataSourceError: Error | null;
  onInputChange: (value: string) => void;
  disableClientFilter: boolean;
};
```

**Step 4: Run typecheck — expect failures**

```bash
cd /Users/krisish/dev/enforma/.worktrees/pokeapi-autocomplete
nvm use 20 && pnpm typecheck
```

Expected: errors because `disableClientFilter` is not yet passed in `fields.tsx` or consumed in `Autocomplete.tsx`. This confirms the type is wired correctly and will guide the next tasks.

**Step 5: Commit**

```bash
git add packages/enforma/src/datasource/types.ts \
        packages/enforma/src/hooks/useDataSource.ts \
        packages/enforma/src/components/types.ts
git commit -m "feat(enforma): add resolve to DataSourceDefinition, minSearchLength/disableClientFilter to Autocomplete types"
```

---

## Task 2: `minSearchLength` in `AutocompleteDispatch` (TDD)

Gate the datasource query behind `minSearchLength`: when `inputValue.length < minSearchLength`, pass `undefined` as datasource so no query fires.

**Files:**
- Modify: `packages/enforma-mui/src/components/Autocomplete.test.tsx` (add test)
- Modify: `packages/enforma/src/components/fields.tsx` (implement)

**Step 1: Write the failing test**

Add to `packages/enforma-mui/src/components/Autocomplete.test.tsx` inside the `describe` block, after all existing tests:

```tsx
it('does not fire a query when inputValue is shorter than minSearchLength', async () => {
  const query = vi.fn().mockResolvedValue([]);
  render(
    <Form values={{ item: '' }} onChange={() => undefined} dataSources={{ items: { query } }}>
      <Enforma.Autocomplete bind="item" label="Item" dataSource="items" minSearchLength={2} />
    </Form>,
  );
  // inputValue='' < minSearchLength=2 → no query on mount
  await new Promise((r) => setTimeout(r, 50));
  expect(query).not.toHaveBeenCalled();

  // Type 1 character — still below threshold
  const combobox = screen.getByRole('combobox');
  await userEvent.type(combobox, 'a');
  await new Promise((r) => setTimeout(r, 50));
  expect(query).not.toHaveBeenCalled();

  // Type a 2nd character — now at threshold, query fires
  await userEvent.type(combobox, 'b');
  await vi.waitFor(() => {
    expect(query).toHaveBeenCalledWith(expect.objectContaining({ search: 'ab' }));
  });
});
```

**Step 2: Run the test — verify it fails**

```bash
nvm use 20 && pnpm --filter enforma-mui test -- --reporter=verbose 2>&1 | tail -20
```

Expected: FAIL — "does not fire a query when inputValue is shorter than minSearchLength". The query currently fires immediately on mount regardless.

**Step 3: Implement `minSearchLength` in `AutocompleteDispatch`**

In `packages/enforma/src/components/fields.tsx`:

Add `useReactiveProp` to the existing import (it is already imported — check line 37). If not already there, add it.

Change `AutocompleteDispatch` (currently starting at line 258):

```tsx
function AutocompleteDispatch(props: AutocompleteProps) {
  const [inputValue, setInputValue] = React.useState('');
  const resolved = useFieldProps<FieldResolved<unknown>>(props);
  const minSearchLength = useReactiveProp(props.minSearchLength) ?? 0;
  const activeDataSource = inputValue.length >= minSearchLength ? props.dataSource : undefined;
  const {
    items,
    isLoading,
    error: dataSourceError,
  } = useDataSource(activeDataSource, {
    bind: props.bind,
    search: inputValue,
  });
  const options = buildSelectOptions(items, props.children);
  const AutocompleteOptionImpl = getComponent('AutocompleteOption');
  if (!AutocompleteOptionImpl) {
    throw new Error('Enforma: component "AutocompleteOption" is not registered.');
  }
  const renderedOptions = options.map((opt) => (
    <AutocompleteOptionImpl key={String(opt.value)} value={opt.value} label={opt.label} />
  ));
  const matched = options.find((opt) => opt.value === resolved.value);
  const displayValue = matched?.label ?? (typeof resolved.value === 'string' ? resolved.value : '');
  return dispatchComponent('Autocomplete', {
    ...resolved,
    options,
    children: renderedOptions,
    displayValue,
    isLoading,
    dataSourceError: dataSourceError ?? null,
    onInputChange: setInputValue,
    disableClientFilter: false, // placeholder — Task 3 will set this correctly
  } as ResolvedAutocompleteProps);
}
```

**Step 4: Run the test — verify it passes**

```bash
nvm use 20 && pnpm --filter enforma-mui test -- --reporter=verbose 2>&1 | tail -20
```

Expected: All tests pass. `disableClientFilter: false` placeholder satisfies the type for now.

**Step 5: Run lint and typecheck**

```bash
nvm use 20 && pnpm lint && pnpm typecheck
```

Expected: Lint errors because `disableClientFilter` is still missing in `Autocomplete.tsx`. Typecheck error for the same reason. These will be resolved in Task 3.

**Step 6: Commit (tests pass; lint/typecheck errors are expected — Task 3 fixes them)**

```bash
git add packages/enforma/src/components/fields.tsx \
        packages/enforma-mui/src/components/Autocomplete.test.tsx
git commit -m "feat(enforma): implement minSearchLength gating in AutocompleteDispatch"
```

---

## Task 3: `disableClientFilter` in `AutocompleteDispatch` + MUI adapter (TDD)

Auto-detect query datasources and pass `disableClientFilter: true` to the adapter. Update the MUI adapter to apply `filterOptions={(x) => x}` only when `disableClientFilter` is true.

**Files:**
- Modify: `packages/enforma-mui/src/components/Autocomplete.test.tsx` (add 2 tests)
- Modify: `packages/enforma/src/components/fields.tsx` (detect + pass)
- Modify: `packages/enforma-mui/src/components/Autocomplete.tsx` (consume)

**Step 1: Write the failing tests**

Add to `Autocomplete.test.tsx` inside the `describe` block:

```tsx
it('filters inline options client-side when not using a query datasource', async () => {
  render(
    <Form values={{ country: '' }} onChange={() => undefined}>
      <Enforma.Autocomplete bind="country" label="Country">
        <AutocompleteOption value="au" label="Australia" />
        <AutocompleteOption value="nz" label="New Zealand" />
      </Enforma.Autocomplete>
    </Form>,
  );
  const combobox = screen.getByRole('combobox');
  await userEvent.click(combobox);
  await userEvent.type(combobox, 'xyz');
  // MUI client-side filter → no options match 'xyz'
  expect(screen.queryAllByRole('option')).toHaveLength(0);
});

it('does not filter query datasource options client-side', async () => {
  const query = vi.fn().mockResolvedValue([
    { value: 'au', label: 'Australia' },
    { value: 'nz', label: 'New Zealand' },
  ]);
  render(
    <Form
      values={{ country: '' }}
      onChange={() => undefined}
      dataSources={{ countries: { query } }}
    >
      <Enforma.Autocomplete bind="country" label="Country" dataSource="countries" />
    </Form>,
  );
  const combobox = await screen.findByRole('combobox');
  await vi.waitFor(() => {
    expect(query).toHaveBeenCalledTimes(1);
  });

  await userEvent.type(combobox, 'xyz');

  // Wait for query with search:'xyz' to complete
  await vi.waitFor(() => {
    expect(query).toHaveBeenCalledWith(expect.objectContaining({ search: 'xyz' }));
  });

  // disableClientFilter → MUI passes all datasource results through
  await vi.waitFor(() => {
    expect(screen.queryAllByRole('option')).toHaveLength(2);
  });
});
```

**Step 2: Run the tests — verify they fail**

```bash
nvm use 20 && pnpm --filter enforma-mui test -- --reporter=verbose 2>&1 | tail -30
```

Expected: FAIL — "filters inline options client-side" fails because `filterOptions={(x) => x}` is currently unconditional, so all options pass through even for inline datasources.

**Step 3: Implement `disableClientFilter` detection in `AutocompleteDispatch`**

At the top of `fields.tsx`, add the import for `useDataSources` and `resolveDefinition`:

```ts
import { useDataSource, resolveDefinition } from '../hooks/useDataSource';
import { useDataSources } from '../context/DataSourceContext';
```

(Remove the old `import { useDataSource } from '../hooks/useDataSource';` and replace with the combined import above.)

Update `AutocompleteDispatch`:

```tsx
function AutocompleteDispatch(props: AutocompleteProps) {
  const [inputValue, setInputValue] = React.useState('');
  const resolved = useFieldProps<FieldResolved<unknown>>(props);
  const registry = useDataSources();
  const minSearchLength = useReactiveProp(props.minSearchLength) ?? 0;
  const activeDataSource = inputValue.length >= minSearchLength ? props.dataSource : undefined;
  const {
    items,
    isLoading,
    error: dataSourceError,
  } = useDataSource(activeDataSource, {
    bind: props.bind,
    search: inputValue,
  });

  // Auto-detect: disable MUI client-side filtering when datasource owns search
  const definition =
    props.dataSource !== undefined ? resolveDefinition(props.dataSource, registry) : null;
  const disableClientFilter =
    definition !== null &&
    definition !== 'reactive' &&
    !Array.isArray(definition) &&
    'query' in definition;

  const options = buildSelectOptions(items, props.children);
  const AutocompleteOptionImpl = getComponent('AutocompleteOption');
  if (!AutocompleteOptionImpl) {
    throw new Error('Enforma: component "AutocompleteOption" is not registered.');
  }
  const renderedOptions = options.map((opt) => (
    <AutocompleteOptionImpl key={String(opt.value)} value={opt.value} label={opt.label} />
  ));
  const matched = options.find((opt) => opt.value === resolved.value);
  const displayValue = matched?.label ?? (typeof resolved.value === 'string' ? resolved.value : '');
  return dispatchComponent('Autocomplete', {
    ...resolved,
    options,
    children: renderedOptions,
    displayValue,
    isLoading,
    dataSourceError: dataSourceError ?? null,
    onInputChange: setInputValue,
    disableClientFilter,
  } as ResolvedAutocompleteProps);
}
```

**Step 4: Update MUI adapter to conditionally apply `filterOptions`**

In `packages/enforma-mui/src/components/Autocomplete.tsx`, update the `Autocomplete` function:

```tsx
export function Autocomplete({
  value,
  setValue,
  label,
  disabled = false,
  error,
  showError,
  onBlur,
  options,
  isLoading,
  dataSourceError,
  onInputChange,
  disableClientFilter,
}: ResolvedAutocompleteProps) {
  const currentOption = options.find((opt) => opt.value === value) ?? null;

  return (
    <MuiAutocomplete<OptionItem>
      options={options as OptionItem[]}
      value={currentOption}
      onChange={(_, selected) => {
        setValue(selected?.value ?? undefined);
      }}
      onInputChange={(_, newValue) => {
        onInputChange(newValue);
      }}
      {...(disableClientFilter && { filterOptions: (x) => x })}
      getOptionLabel={(opt) => opt.label}
      isOptionEqualToValue={(opt, val) => opt.value === val.value}
      disabled={disabled}
      onBlur={onBlur}
      fullWidth
      renderInput={(params) =>
        renderTextField(params, label, showError, error, dataSourceError, isLoading)
      }
    />
  );
}
```

**Step 5: Run the tests — verify they pass**

```bash
nvm use 20 && pnpm --filter enforma-mui test -- --reporter=verbose 2>&1 | tail -30
```

Expected: All tests pass.

**Step 6: Run lint and typecheck — both must pass**

```bash
nvm use 20 && pnpm lint && pnpm typecheck
```

Expected: Clean. The `disableClientFilter` is now passed everywhere.

**Step 7: Commit**

```bash
git add packages/enforma/src/components/fields.tsx \
        packages/enforma-mui/src/components/Autocomplete.tsx \
        packages/enforma-mui/src/components/Autocomplete.test.tsx
git commit -m "feat(enforma): auto-detect disableClientFilter for query datasources"
```

---

## Task 4: `resolve` in `AutocompleteDispatch` (TDD)

When the field has a pre-selected value that is not in the loaded options, call `datasource.resolve(value)` to fetch the item and show its label.

**Files:**
- Modify: `packages/enforma-mui/src/components/Autocomplete.test.tsx` (add 2 tests)
- Modify: `packages/enforma/src/components/fields.tsx` (implement)

**Step 1: Write the failing tests**

Add to `Autocomplete.test.tsx` inside the `describe` block:

```tsx
it('resolves pre-selected value label via datasource resolve', async () => {
  const query = vi.fn().mockResolvedValue([]);
  const resolve = vi.fn().mockResolvedValue({ value: 'au', label: 'Australia' });
  render(
    <Form
      values={{ country: 'au' }}
      onChange={() => undefined}
      dataSources={{ countries: { query, resolve } }}
    >
      <Enforma.Autocomplete bind="country" label="Country" dataSource="countries" />
    </Form>,
  );
  await vi.waitFor(() => {
    expect(screen.getByRole('combobox')).toHaveValue('Australia');
  });
});

it('does not call resolve when value is already in query results', async () => {
  const query = vi.fn().mockResolvedValue([{ value: 'au', label: 'Australia' }]);
  const resolve = vi.fn();
  render(
    <Form
      values={{ country: 'au' }}
      onChange={() => undefined}
      dataSources={{ countries: { query, resolve } }}
    >
      <Enforma.Autocomplete bind="country" label="Country" dataSource="countries" />
    </Form>,
  );
  await vi.waitFor(() => {
    expect(query).toHaveBeenCalledTimes(1);
  });
  // Give resolve a chance to be called if it's going to be
  await new Promise((r) => setTimeout(r, 50));
  expect(resolve).not.toHaveBeenCalled();
});
```

**Step 2: Run the tests — verify they fail**

```bash
nvm use 20 && pnpm --filter enforma-mui test -- --reporter=verbose 2>&1 | tail -30
```

Expected: FAIL — combobox shows `'au'` (raw value) instead of `'Australia'`; resolve is not called.

**Step 3: Implement `resolve` logic in `AutocompleteDispatch`**

In `fields.tsx`, update `AutocompleteDispatch` to add resolve state and effect. This is the complete updated function (replaces the version from Task 3):

```tsx
function AutocompleteDispatch(props: AutocompleteProps) {
  const [inputValue, setInputValue] = React.useState('');
  const [resolvedItem, setResolvedItem] = React.useState<{
    value: unknown;
    label: string;
  } | null>(null);
  const resolved = useFieldProps<FieldResolved<unknown>>(props);
  const registry = useDataSources();
  const minSearchLength = useReactiveProp(props.minSearchLength) ?? 0;
  const activeDataSource = inputValue.length >= minSearchLength ? props.dataSource : undefined;
  const {
    items,
    isLoading,
    error: dataSourceError,
  } = useDataSource(activeDataSource, {
    bind: props.bind,
    search: inputValue,
  });

  // Auto-detect: disable MUI client-side filtering when datasource owns search
  const definition =
    props.dataSource !== undefined ? resolveDefinition(props.dataSource, registry) : null;
  const disableClientFilter =
    definition !== null &&
    definition !== 'reactive' &&
    !Array.isArray(definition) &&
    'query' in definition;

  const options = buildSelectOptions(items, props.children);
  const currentValue = resolved.value;
  const valueInOptions = options.some((opt) => opt.value === currentValue);

  // Resolve pre-selected values that are not in the loaded options.
  // Uses a ref to avoid re-calling resolve for the same value.
  const lastResolvedValueRef = React.useRef<unknown>(undefined);
  React.useEffect(() => {
    if (!currentValue || valueInOptions) {
      lastResolvedValueRef.current = undefined;
      setResolvedItem(null);
      return;
    }
    if (lastResolvedValueRef.current === currentValue) return;
    if (definition === null || definition === 'reactive' || Array.isArray(definition)) return;
    if (!('resolve' in definition) || !definition.resolve) return;

    lastResolvedValueRef.current = currentValue;
    let cancelled = false;
    void Promise.resolve(definition.resolve(currentValue)).then((item) => {
      if (cancelled) return;
      const [mappedItem] = buildSelectOptions([item], props.children);
      if (mappedItem !== undefined) setResolvedItem(mappedItem);
    });
    return () => {
      cancelled = true;
    };
    // definition, registry, props.children intentionally omitted —
    // resolve re-triggers on value/options changes, not datasource identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentValue, valueInOptions]);

  // Merge resolved item into options so the combobox displays the correct label
  const mergedOptions =
    resolvedItem !== null && !valueInOptions ? [resolvedItem, ...options] : options;

  const AutocompleteOptionImpl = getComponent('AutocompleteOption');
  if (!AutocompleteOptionImpl) {
    throw new Error('Enforma: component "AutocompleteOption" is not registered.');
  }
  const renderedOptions = mergedOptions.map((opt) => (
    <AutocompleteOptionImpl key={String(opt.value)} value={opt.value} label={opt.label} />
  ));
  const matched = mergedOptions.find((opt) => opt.value === currentValue);
  const displayValue = matched?.label ?? (typeof currentValue === 'string' ? currentValue : '');
  return dispatchComponent('Autocomplete', {
    ...resolved,
    options: mergedOptions,
    children: renderedOptions,
    displayValue,
    isLoading,
    dataSourceError: dataSourceError ?? null,
    onInputChange: setInputValue,
    disableClientFilter,
  } as ResolvedAutocompleteProps);
}
```

**Step 4: Run the tests — verify they pass**

```bash
nvm use 20 && pnpm --filter enforma-mui test -- --reporter=verbose 2>&1 | tail -30
```

Expected: All tests pass.

**Step 5: Run lint and typecheck**

```bash
nvm use 20 && pnpm lint && pnpm typecheck
```

Expected: Clean.

**Step 6: Run full test suite**

```bash
nvm use 20 && pnpm test 2>&1 | tail -10
```

Expected: All tests pass (count ≥ 125 + new tests).

**Step 7: Commit**

```bash
git add packages/enforma/src/components/fields.tsx \
        packages/enforma-mui/src/components/Autocomplete.test.tsx
git commit -m "feat(enforma): resolve pre-selected values via datasource resolve in AutocompleteDispatch"
```

---

## Task 5: Demo — Open Library

Replace the PokéAPI autocomplete fields with an Open Library book search that demonstrates all three new features: `minSearchLength`, automatic `disableClientFilter`, and `resolve` for pre-selected IDs.

**Files:**
- Modify: `apps/demo/src/App.tsx`

**What to change:**

1. Remove `PokemonItem`, `capitalize`, `cachedTypes`, `cachedPokemon`, `POKEMON_DATASOURCES` (they are only used in the autocomplete form — the "API DataSources" Select section has its own separate form with its own `dataSources` prop and is unaffected)
2. Add Open Library types and `OPEN_LIBRARY_DATASOURCES`
3. Update `autocompleteValues` initial state to pre-select a fantasy book
4. Update the Autocomplete form's `dataSources` and JSX
5. Add a duplicate pair of autocompletes (same `bind` values) below the first pair to demonstrate sync

**Step 1: Remove PokéAPI code from the top of the file**

Delete these lines (the module-level definitions, not touching the Select demo):
- `type PokemonItem = ...`
- `function capitalize ...`
- `let cachedTypes ...`
- `const cachedPokemon ...`
- `const POKEMON_DATASOURCES ...`

**Step 2: Add Open Library types and datasources**

Add after the `DATASOURCE_DEMO_SOURCES` block:

```ts
type BookItem = {
  key: string;
  title: string;
  label: string;
};

interface OLSearchDoc {
  key: string;
  title: string;
  author_name?: string[];
}

interface OLSearchResponse {
  docs: OLSearchDoc[];
}

interface OLWorkResponse {
  key: string;
  title: string;
}

const OPEN_LIBRARY_DATASOURCES: Record<string, DataSourceDefinition<BookItem>> = {
  books: {
    query: async ({ search, filters }: DataSourceParams): Promise<BookItem[]> => {
      if (!search) return [];
      const params = new URLSearchParams({
        q: search,
        fields: 'key,title,author_name',
        limit: '10',
      });
      const subject = filters.subject as string | undefined;
      if (subject) params.set('subject', subject);
      const res = await fetch(`https://openlibrary.org/search.json?${params.toString()}`);
      const data = (await res.json()) as OLSearchResponse;
      return data.docs.map((doc) => ({
        key: doc.key,
        title: doc.title,
        label: doc.author_name?.length
          ? `${doc.title} — ${doc.author_name[0]}`
          : doc.title,
      }));
    },
    resolve: async (value: unknown): Promise<BookItem> => {
      const id = (value as string).replace('/works/', '');
      const res = await fetch(`https://openlibrary.org/works/${id}.json`);
      const data = (await res.json()) as OLWorkResponse;
      return { key: data.key, title: data.title, label: data.title };
    },
  },
};
```

**Step 3: Update `autocompleteValues` initial state**

Change lines 128-133 from:

```ts
const [autocompleteValues, setAutocompleteValues] = useState<Record<string, unknown>>({
  country: '',
  plan: '',
  type: '',
  pokemon: '',
});
```

to:

```ts
const [autocompleteValues, setAutocompleteValues] = useState<Record<string, unknown>>({
  country: '',
  plan: '',
  subject: 'fantasy',
  book: '/works/OL82563W',
});
```

**Step 4: Update the Autocomplete form**

Replace the existing `<Enforma.Form ... aria-label="autocomplete demo form">` block (lines 338-372) with:

```tsx
<Enforma.Form
  values={autocompleteValues}
  onChange={setAutocompleteValues}
  aria-label="autocomplete demo form"
  dataSources={{ ...DATASOURCE_DEMO_SOURCES, ...OPEN_LIBRARY_DATASOURCES }}
>
  {/* Autocomplete — inline options, MUI filters client-side */}
  <Enforma.Autocomplete bind="country" label="Country">
    <Enforma.Autocomplete.Option value="au" label="Australia" />
    <Enforma.Autocomplete.Option value="nz" label="New Zealand" />
    <Enforma.Autocomplete.Option value="us" label="United States" />
  </Enforma.Autocomplete>

  {/* Autocomplete — datasource with template mapping */}
  <Enforma.Autocomplete bind="plan" label="Plan (datasource)" dataSource="countries">
    <Enforma.Autocomplete.Option label="name" value="code" />
  </Enforma.Autocomplete>

  {/* Autocomplete — inline subject options, MUI filters client-side */}
  <Enforma.Autocomplete bind="subject" label="Subject">
    <Enforma.Autocomplete.Option value="fantasy" label="Fantasy" />
    <Enforma.Autocomplete.Option value="science_fiction" label="Science Fiction" />
    <Enforma.Autocomplete.Option value="mystery" label="Mystery" />
    <Enforma.Autocomplete.Option value="history" label="History" />
    <Enforma.Autocomplete.Option value="romance" label="Romance" />
  </Enforma.Autocomplete>

  {/* Autocomplete — Open Library server-side search, minSearchLength=2, resolve for pre-selected */}
  <Enforma.Autocomplete
    bind="book"
    label="Book (type 2+ chars to search)"
    dataSource={{
      source: 'books',
      filters: (scope) => ({ subject: scope.subject as string }),
    }}
    minSearchLength={2}
  >
    <Enforma.Autocomplete.Option label="label" value="key" />
  </Enforma.Autocomplete>

  <p style={{ color: '#777', fontSize: '0.85rem', marginTop: '0.5rem' }}>
    Duplicate pair below is bound to the same values — changes sync instantly.
  </p>

  {/* Duplicate pair — same bindings, verifies sync and resolve */}
  <Enforma.Autocomplete bind="subject" label="Subject (duplicate)">
    <Enforma.Autocomplete.Option value="fantasy" label="Fantasy" />
    <Enforma.Autocomplete.Option value="science_fiction" label="Science Fiction" />
    <Enforma.Autocomplete.Option value="mystery" label="Mystery" />
    <Enforma.Autocomplete.Option value="history" label="History" />
    <Enforma.Autocomplete.Option value="romance" label="Romance" />
  </Enforma.Autocomplete>

  <Enforma.Autocomplete
    bind="book"
    label="Book (duplicate)"
    dataSource={{
      source: 'books',
      filters: (scope) => ({ subject: scope.subject as string }),
    }}
    minSearchLength={2}
  >
    <Enforma.Autocomplete.Option label="label" value="key" />
  </Enforma.Autocomplete>
</Enforma.Form>
```

**Step 5: Update the description paragraph above the Autocomplete form**

Change the `<p>` tag above the Autocomplete form to describe what the demo now shows:

```tsx
<p style={{ color: '#555', marginBottom: '1rem' }}>
  <code>Autocomplete</code> is a searchable combobox. Subject uses inline options with
  MUI client-side filtering. Book uses{' '}
  <a href="https://openlibrary.org" target="_blank" rel="noreferrer">
    Open Library
  </a>{' '}
  server-side search — type 2+ chars to search, optional subject filter. Pre-selected book
  resolves its label on mount.
</p>
```

**Step 6: Check for unused imports**

After removing POKEMON_DATASOURCES, verify `DataSourceParams` is still used (it is, in the Open Library datasource). `DataSourceDefinition` is also still used.

**Step 7: Run lint and typecheck**

```bash
nvm use 20 && pnpm lint && pnpm typecheck
```

Expected: Clean.

**Step 8: Run full test suite**

```bash
nvm use 20 && pnpm test 2>&1 | tail -10
```

Expected: All tests pass.

**Step 9: Commit**

```bash
git add apps/demo/src/App.tsx
git commit -m "feat(demo): replace PokéAPI autocomplete with Open Library server-side search"
```

---

## Verification

After all tasks complete:

```bash
nvm use 20 && pnpm lint && pnpm typecheck && pnpm test
```

Expected:
- Lint: 0 errors, 0 warnings
- Typecheck: 0 errors
- Tests: all pass

Manual verification in the browser (`pnpm --filter demo dev`):
1. Open the Autocomplete section
2. Subject shows "Fantasy" pre-selected (inline options, MUI client filters as you type)
3. Book shows the title of `/works/OL82563W` resolved on mount (not the raw key)
4. Typing 1 char in Book → no query fires
5. Typing 2+ chars → Open Library results appear, filtered by selected subject
6. Selecting a subject → Book field clears (filter change)
7. Duplicate pair syncs instantly with the first pair
