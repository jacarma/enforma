# Design: PokéAPI Autocomplete Demo with Server-Side Search

**Date:** 2026-03-05

## Goal

Augment the existing Autocomplete demo section in `apps/demo/src/App.tsx` with PokéAPI-backed fields that demonstrate server-side search — where typed input is forwarded to the datasource query function rather than filtered client-side by the component.

## Changes Required

### 1. Core library — `packages/enforma/src/components/fields.tsx`

Add local `inputValue` state to `AutocompleteDispatch`. Pass it as `search` to `useDataSource`. Expose `onInputChange` in the resolved props so adapters can report typed text back up.

### 2. Core types — `packages/enforma/src/components/types.ts`

Add `onInputChange: (value: string) => void` to `ResolvedAutocompleteProps`.

### 3. MUI adapter — `packages/enforma-mui/src/components/Autocomplete.tsx`

Accept `onInputChange` from `ResolvedAutocompleteProps`. Wire MUI's `onInputChange` callback to call it, so typed text flows from the input back into the datasource query.

### 4. Demo — `apps/demo/src/App.tsx`

- Merge datasources on the existing Autocomplete form: `{ ...DATASOURCE_DEMO_SOURCES, ...POKEMON_DATASOURCES }`
- Add `type: ''` and `pokemon: ''` to `autocompleteValues` initial state
- Add two new fields inside the existing form:
  - `Autocomplete` bound to `type`, datasource `"types"`
  - `Autocomplete` bound to `pokemon`, datasource `{ source: 'pokemon', filters: scope => ({ type: scope.type }) }`
- Update `POKEMON_DATASOURCES.pokemon.query` to filter results by the `search` param (PokéAPI has no text-search endpoint; fetch all Pokémon for the type, then filter by name prefix in the query function — the datasource owns filtering, not the component)

## Data Flow

```
User types in Autocomplete input
  → MuiAutocomplete onInputChange fires
  → calls ResolvedAutocompleteProps.onInputChange(text)
  → AutocompleteDispatch updates inputValue state
  → useDataSource receives search=inputValue
  → query() is called with { search, filters: { type } }
  → query fetches pokemon by type, filters by name.startsWith(search)
  → filtered items returned to component
```

## What is NOT changed

- Client-side filtering by the MUI Autocomplete component should be disabled (`filterOptions={x => x}`) since filtering is now the datasource's responsibility.
- The `types` datasource does not need search support (small fixed list, but the `search` param will still be passed and can filter by label if desired).

## Testing

- Existing Autocomplete tests must continue to pass.
- No new tests required for the demo app itself.
