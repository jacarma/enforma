# API DataSource Demo Design

**Date:** 2026-02-25
**Status:** Approved

## Goal

Add a second demo section to `apps/demo/src/App.tsx` that demonstrates the async query path of the datasource system using the free, no-auth [PokeAPI](https://pokeapi.co). The demo mirrors the existing countries/cities pattern but with both datasources backed by real API calls.

## Architecture

Two new query-based datasource definitions added to a `POKEMON_DATASOURCES` constant in `App.tsx`:

- **`types`** — fetches `https://pokeapi.co/api/v2/type?limit=20` on mount, maps results to `{ name, label }`. Filters out non-game types (`unknown`, `shadow`). No pagination (only ~18 usable types).
- **`pokemon`** — fetches `https://pokeapi.co/api/v2/type/{type}` when a type filter is applied. Maps `data.pokemon[].pokemon.name` to `{ name, label }`. Returns all Pokémon for that type.

The form shape is `{ type: '', pokemon: '' }`.

## Form Structure

```tsx
<Enforma.Form
  values={{ type: '', pokemon: '' }}
  onChange={...}
  dataSources={POKEMON_DATASOURCES}
>
  <Enforma.Select bind="type" label="Type" dataSource="types">
    <Enforma.Select.Option label="label" value="name" />
  </Enforma.Select>

  <Enforma.Select
    bind="pokemon"
    label="Pokémon"
    dataSource={{ source: 'pokemon', filters: (scope) => ({ type: scope.type }) }}
  >
    <Enforma.Select.Option label="label" value="name" />
  </Enforma.Select>
</Enforma.Form>
```

- Existing `DemoSelect` handles `isLoading` by disabling the `<select>` — no new adapter component needed.
- `bind` on the Pokémon select triggers auto-clear when the filtered list changes (type changes → Pokémon value clears).

## Key Behaviours Demonstrated

1. **Loading state** — both selects are disabled while their query is in flight.
2. **Form-reactive filtering** — Pokémon list reloads from the API whenever the selected type changes.
3. **Auto-clear** — selected Pokémon value resets automatically when the type (and thus the Pokémon list) changes.

## Files Affected

- `apps/demo/src/App.tsx` — add `POKEMON_DATASOURCES` constant and new form section. No new files needed.

## Out of Scope

- Pagination UI
- Search input
- Error display UI (loading failure is silent in the demo)
