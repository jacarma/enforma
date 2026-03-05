# Autocomplete Server-Side Search — Design

## Goal

Extend the Autocomplete component with three framework improvements that together enable clean server-side search patterns: automatic client/server filter detection, configurable minimum search length, and datasource-level value resolution for pre-selected IDs. Replace the PokéAPI demo with Open Library to demonstrate true server-side text search.

---

## Framework Changes

### 1. `DataSourceDefinition.resolve`

Add an optional `resolve` method to query datasource definitions:

```ts
type QueryDataSource<TItem> = {
  query: (params: DataSourceParams) => Promise<TItem[]> | TItem[];
  resolve?: (value: unknown) => Promise<TItem> | TItem;
};
```

**When it is called:** `AutocompleteDispatch` calls `resolve(value)` when the field has a non-empty value on mount (or when value changes) and that value is not found in the currently loaded options. This covers the common case where the form holds an opaque ID and the search endpoint does not return that item until the user types.

**Mapping:** The item returned by `resolve` is passed through the same `buildSelectOptions` template mapping as query results — no new concepts at the adapter layer.

**Fallback:** If `resolve` is not defined, the raw value string is shown as the label.

---

### 2. `minSearchLength` on `AutocompleteProps`

```ts
type AutocompleteProps = CommonProps & {
  dataSource?: DataSourceProp<unknown>;
  children?: ReactNode;
  minSearchLength?: Reactive<number>; // default: 0
};
```

**Behaviour in `AutocompleteDispatch`:**

- When `inputValue.length < minSearchLength`, pass `undefined` as datasource to `useDataSource`. No query fires; options are empty.
- When `inputValue.length >= minSearchLength`, normal query behaviour.
- `resolve` is **not** gated by `minSearchLength` — pre-selected values always resolve their label on mount regardless of this setting.

**Default `0`** preserves existing eager behaviour. Setting `1` or `2` makes the field search-driven (nothing pre-fetches on mount).

---

### 3. Automatic `disableClientFilter`

**Problem:** The MUI adapter currently applies `filterOptions={(x) => x}` unconditionally, disabling MUI's built-in filtering even for inline options and static arrays.

**Fix:** `AutocompleteDispatch` checks whether the active datasource resolves to a definition with a `query` function (using `useDataSources()` registry, same logic as `resolveDefinition`). It sets `disableClientFilter: boolean` on `ResolvedAutocompleteProps`.

```ts
type ResolvedAutocompleteProps = ResolvedCommonProps & {
  // ... existing fields ...
  onInputChange: (value: string) => void;
  disableClientFilter: boolean; // new
};
```

The MUI adapter applies `filterOptions={(x) => x}` only when `disableClientFilter` is `true`. Inline options and static arrays keep MUI's default filtering automatically.

---

## Demo — Open Library

Replaces the PokéAPI section in `apps/demo/src/App.tsx`.

### API endpoints used

| Purpose | Endpoint |
|---|---|
| Search books | `https://openlibrary.org/search.json?q={search}&subject={subject}&fields=key,title,author_name&limit=10` |
| Resolve by key | `https://openlibrary.org/works/{id}.json` |

No auth required. CORS enabled.

### Datasources

**`subjects`** — static inline options (Science Fiction, Fantasy, Mystery, History, Romance). Demonstrates client-side MUI filtering as contrast to server-side book search.

**`books`** — query datasource:
- `query({ search, filters })`: fetches from Open Library with `q={search}` and optionally `subject={filters.subject}`. Returns items with shape `{ key, title, label }` where label is `"Title — Author"`.
- `resolve(value)`: fetches `/works/{id}.json`, returns item with same shape so template mapping works.

### Form

```tsx
<Enforma.Autocomplete bind="subject" label="Subject">
  <Enforma.Autocomplete.Option value="fantasy" label="Fantasy" />
  {/* ... */}
</Enforma.Autocomplete>

<Enforma.Autocomplete
  bind="book"
  label="Book"
  dataSource={{ source: 'books', filters: (scope) => ({ subject: scope.subject as string }) }}
  minSearchLength={2}
>
  <Enforma.Autocomplete.Option label="label" value="key" />
</Enforma.Autocomplete>
```

- Subject uses inline options → MUI filters client-side (no `disableClientFilter`)
- Book uses query datasource → `disableClientFilter` set automatically → Open Library handles filtering
- `minSearchLength={2}` on book — nothing loads on mount, search starts at 2 chars
- `resolve` loads the label when form opens with a pre-selected book key

### Testing pre-selected values

Initial state: `{ subject: 'fantasy', book: '/works/OL82563W' }` (a known fantasy book key). On mount, the subject shows "Fantasy" (from inline options), the book field calls `resolve('/works/OL82563W')` and displays the title.

A duplicate pair of autocompletes bound to the same `subject`/`book` values verifies they stay in sync and both show correct labels.

---

## What is not changing

- `ExclusiveToggle`, `Select`, `RadioGroup` — unaffected
- `useDataSource` internals — no changes needed; `minSearchLength` is handled by conditionally passing `undefined` as datasource
- Debouncing — not in scope; the datasource implementation can debounce internally if needed
