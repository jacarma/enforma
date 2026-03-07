# PokéAPI Autocomplete with Server-Side Search — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Augment the Autocomplete demo with PokéAPI-backed fields where typed input is forwarded to the datasource query function (server-side search), not filtered by the MUI component.

**Architecture:** Add `onInputChange` to `ResolvedAutocompleteProps` and wire it through `AutocompleteDispatch` (which tracks local `inputValue` state and passes it as `search` to `useDataSource`). The MUI adapter calls `onInputChange` and disables its own client-side filtering. The demo's `pokemon` datasource filters by `search` in the query function.

**Tech Stack:** TypeScript strict, React, Vitest + @testing-library/react, MUI Autocomplete, PokéAPI

---

### Task 1: Add `onInputChange` to `ResolvedAutocompleteProps`

**Files:**
- Modify: `packages/enforma/src/components/types.ts`

No test needed — type changes are caught by `pnpm typecheck`. This unlocks subsequent tasks.

**Step 1: Add the prop**

In `packages/enforma/src/components/types.ts`, find `ResolvedAutocompleteProps` (line 78) and add one field:

```ts
export type ResolvedAutocompleteProps = ResolvedCommonProps & {
  value: unknown;
  setValue: (value: unknown) => void;
  options: { value: unknown; label: string }[];
  children: ReactNode;
  displayValue: string;
  isLoading: boolean;
  dataSourceError: Error | null;
  onInputChange: (value: string) => void;  // ← add this
};
```

**Step 2: Run typecheck**

```bash
nvm use 20 && pnpm typecheck
```

Expected: errors about `onInputChange` not being passed — that's correct, we'll fix it in Task 2.

---

### Task 2: Wire `inputValue` state and `search` in `AutocompleteDispatch`

**Files:**
- Modify: `packages/enforma/src/components/fields.tsx`

**Step 1: Write the failing test**

In `packages/enforma-mui/src/components/Autocomplete.test.tsx`, add inside `describe('MUI Autocomplete', ...)`:

```tsx
it('forwards typed text as search to the datasource query', async () => {
  const query = vi.fn().mockResolvedValue([]);
  render(
    <Form
      values={{ item: '' }}
      onChange={() => undefined}
      dataSources={{ items: { query } }}
    >
      <Enforma.Autocomplete bind="item" label="Item" dataSource="items" />
    </Form>,
  );
  // Wait for initial query (search='')
  await vi.waitFor(() => expect(query).toHaveBeenCalledTimes(1));
  query.mockClear();

  await userEvent.type(screen.getByRole('combobox'), 'bul');

  await vi.waitFor(() =>
    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'bul' }),
    ),
  );
});
```

**Step 2: Run the test to confirm it fails**

```bash
nvm use 20 && pnpm test --filter enforma-mui -- Autocomplete
```

Expected: FAIL — the test expects the query to be called with `search: 'bul'` but the current code never passes search.

**Step 3: Update `AutocompleteDispatch` in `fields.tsx`**

Replace the existing `AutocompleteDispatch` function (lines 258–285) with:

```tsx
function AutocompleteDispatch(props: AutocompleteProps) {
  const [inputValue, setInputValue] = React.useState('');
  const resolved = useFieldProps<FieldResolved<unknown>>(props);
  const {
    items,
    isLoading,
    error: dataSourceError,
  } = useDataSource(props.dataSource, {
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
  } as ResolvedAutocompleteProps);
}
```

**Step 4: Run the test**

```bash
nvm use 20 && pnpm test --filter enforma-mui -- Autocomplete
```

Expected: the new test still fails because the MUI adapter doesn't call `onInputChange` yet. All pre-existing tests should still pass.

**Step 5: Commit the type + dispatch changes**

```bash
git add packages/enforma/src/components/types.ts packages/enforma/src/components/fields.tsx
git commit -m "feat(enforma): forward inputValue as search to datasource in AutocompleteDispatch"
```

---

### Task 3: Update MUI adapter to call `onInputChange` and disable client-side filtering

**Files:**
- Modify: `packages/enforma-mui/src/components/Autocomplete.tsx`

**Step 1: Update the adapter**

Replace the full content of `packages/enforma-mui/src/components/Autocomplete.tsx` with:

```tsx
// packages/enforma-mui/src/components/Autocomplete.tsx
import {
  CircularProgress,
  Autocomplete as MuiAutocomplete,
  TextField,
  type TextFieldProps,
} from '@mui/material';
import { type ResolvedAutocompleteProps } from 'enforma';

type OptionItem = { value: unknown; label: string };

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
}: ResolvedAutocompleteProps) {
  const currentOption = options.find((opt) => opt.value === value) ?? null;

  if (isLoading) {
    return <CircularProgress size={20} />;
  }

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
      filterOptions={(x) => x}
      getOptionLabel={(opt) => opt.label}
      isOptionEqualToValue={(opt, val) => opt.value === val.value}
      disabled={disabled}
      onBlur={onBlur}
      fullWidth
      renderInput={(params) => (
        <TextField
          {...(params as TextFieldProps)}
          label={label}
          error={showError}
          helperText={showError ? (dataSourceError?.message ?? error) : undefined}
          margin="dense"
        />
      )}
    />
  );
}
```

Key changes:
- Destructure `onInputChange` from props
- Add `onInputChange` handler forwarding `newValue` to it
- Add `filterOptions={(x) => x}` to disable MUI's built-in client-side filtering (datasource owns filtering now)

**Step 2: Run all tests**

```bash
nvm use 20 && pnpm test --filter enforma-mui
```

Expected: all tests pass, including the new one added in Task 2.

**Step 3: Run lint and typecheck**

```bash
nvm use 20 && pnpm lint && pnpm typecheck
```

Expected: no errors.

**Step 4: Commit**

```bash
git add packages/enforma-mui/src/components/Autocomplete.tsx
git commit -m "feat(enforma-mui): wire onInputChange and disable client-side filtering in Autocomplete"
```

---

### Task 4: Update demo — merge datasources, state, and add PokéAPI autocomplete fields

**Files:**
- Modify: `apps/demo/src/App.tsx`

**Step 1: Update `POKEMON_DATASOURCES.pokemon.query` to filter by search**

Find the `pokemon` query function (around line 76) and update it to accept and use `search`:

```ts
pokemon: {
  query: async ({ filters, search }: DataSourceParams): Promise<PokemonItem[]> => {
    const type = filters.type as string;
    if (!type) return [];
    const res = await fetch(`https://pokeapi.co/api/v2/type/${type}`);
    const data = (await res.json()) as {
      pokemon: { pokemon: { name: string } }[];
    };
    const all = data.pokemon.map(({ pokemon }) => ({
      name: pokemon.name,
      label: capitalize(pokemon.name),
    }));
    if (!search) return all;
    const q = search.toLowerCase();
    return all.filter((p) => p.name.includes(q));
  },
},
```

**Step 2: Add `type` and `pokemon` to `autocompleteValues` initial state**

Find (line 111):

```ts
const [autocompleteValues, setAutocompleteValues] = useState<Record<string, unknown>>({
  country: '',
  plan: '',
});
```

Change to:

```ts
const [autocompleteValues, setAutocompleteValues] = useState<Record<string, unknown>>({
  country: '',
  plan: '',
  type: '',
  pokemon: '',
});
```

**Step 3: Merge datasources and add PokéAPI fields to the existing Autocomplete form**

Find the existing Autocomplete `<Enforma.Form>` (around line 319). Change `dataSources` to merge both sources, and add the two new fields before the closing `</Enforma.Form>`:

```tsx
<Enforma.Form
  values={autocompleteValues}
  onChange={setAutocompleteValues}
  aria-label="autocomplete demo form"
  dataSources={{ ...DATASOURCE_DEMO_SOURCES, ...POKEMON_DATASOURCES }}
>
  {/* Autocomplete — inline options */}
  <Enforma.Autocomplete bind="country" label="Country">
    <Enforma.Autocomplete.Option value="au" label="Australia" />
    <Enforma.Autocomplete.Option value="nz" label="New Zealand" />
    <Enforma.Autocomplete.Option value="us" label="United States" />
  </Enforma.Autocomplete>

  {/* Autocomplete — datasource with template mapping */}
  <Enforma.Autocomplete bind="plan" label="Plan (datasource)" dataSource="countries">
    <Enforma.Autocomplete.Option label="name" value="code" />
  </Enforma.Autocomplete>

  {/* Autocomplete — async PokéAPI, server-side search */}
  <Enforma.Autocomplete bind="type" label="Pokémon Type" dataSource="types">
    <Enforma.Autocomplete.Option label="label" value="name" />
  </Enforma.Autocomplete>

  <Enforma.Autocomplete
    bind="pokemon"
    label="Pokémon (filtered by type)"
    dataSource={{ source: 'pokemon', filters: (scope) => ({ type: scope.type as string }) }}
  >
    <Enforma.Autocomplete.Option label="label" value="name" />
  </Enforma.Autocomplete>
</Enforma.Form>
```

**Step 4: Run lint and typecheck**

```bash
nvm use 20 && pnpm lint && pnpm typecheck
```

Expected: no errors.

**Step 5: Run all tests**

```bash
nvm use 20 && pnpm test
```

Expected: all tests pass.

**Step 6: Commit**

```bash
git add apps/demo/src/App.tsx
git commit -m "feat(demo): add PokéAPI autocomplete with server-side search to Autocomplete section"
```
