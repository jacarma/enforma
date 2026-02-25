# API DataSource Demo Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a PokeAPI-backed demo section to `apps/demo/src/App.tsx` showing two linked async-query datasources (Type → Pokémon), plus the hook fix that makes auto-clear work for query-based datasources.

**Architecture:** The existing `useDataSource` hook already queries async datasources and passes form-derived filters, but its auto-clear effect only fires for static arrays. Task 1 extends auto-clear to query-based datasources so that when the Type filter changes, the bound Pokémon field resets. Task 2 adds the demo form using PokeAPI endpoints.

**Tech Stack:** React, TypeScript strict, Vitest + @testing-library/react, PokeAPI (free, no auth)

---

### Task 1: Extend auto-clear to query-based datasources

The current auto-clear logic in `useDataSource` fires only when `staticItems` changes (i.e., only for static array datasources). Query-based datasources need the same behaviour: when form-derived filters change, clear the bound field.

**Files:**
- Modify: `packages/enforma/src/hooks/useDataSource.test.tsx` (append new describe block)
- Modify: `packages/enforma/src/hooks/useDataSource.ts`

---

**Step 1: Write the failing tests**

Append this describe block at the end of `packages/enforma/src/hooks/useDataSource.test.tsx` (after the closing `}` of the last describe):

```tsx
describe('useDataSource — auto-clear on filter change for query datasource', () => {
  type PokemonItem = { name: string };

  function makeQueryWrapper(
    initialValues: Record<string, unknown>,
    queryFn: ReturnType<typeof vi.fn>,
  ) {
    let capturedStore: FormStore | null = null;

    function GrabStore() {
      capturedStore = useScope().store;
      return null;
    }

    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <Form
          values={initialValues}
          onChange={() => undefined}
          dataSources={{ pokemon: { query: queryFn } }}
        >
          <GrabStore />
          {children}
        </Form>
      );
    }

    return { Wrapper, getStore: () => capturedStore! };
  }

  it('clears the bound field when filters change after mount for a query datasource', async () => {
    const queryFn = vi.fn().mockResolvedValue([]);
    const { Wrapper, getStore } = makeQueryWrapper(
      { type: 'fire', pokemon: 'charizard' },
      queryFn,
    );

    renderHook(
      () =>
        useDataSource<PokemonItem>(
          { source: 'pokemon', filters: (scope) => ({ type: scope.type }) },
          { bind: 'pokemon' },
        ),
      { wrapper: Wrapper },
    );

    // Initial mount must preserve the existing value.
    expect(getStore().getField('pokemon')).toBe('charizard');

    // Changing the filter key triggers a clear.
    act(() => {
      getStore().setField('type', 'water');
    });

    await waitFor(() => {
      expect(getStore().getField('pokemon')).toBe('');
    });
  });

  it('does not clear the bound field on initial mount for a query datasource', () => {
    const queryFn = vi.fn().mockResolvedValue([]);
    const { Wrapper, getStore } = makeQueryWrapper(
      { type: 'fire', pokemon: 'charizard' },
      queryFn,
    );

    renderHook(
      () =>
        useDataSource<PokemonItem>(
          { source: 'pokemon', filters: (scope) => ({ type: scope.type }) },
          { bind: 'pokemon' },
        ),
      { wrapper: Wrapper },
    );

    expect(getStore().getField('pokemon')).toBe('charizard');
  });

  it('does nothing when bind is not provided for a query datasource', async () => {
    const queryFn = vi.fn().mockResolvedValue([]);
    const { Wrapper, getStore } = makeQueryWrapper(
      { type: 'fire', pokemon: 'charizard' },
      queryFn,
    );

    renderHook(
      () =>
        useDataSource<PokemonItem>({
          source: 'pokemon',
          filters: (scope) => ({ type: scope.type }),
        }),
      { wrapper: Wrapper },
    );

    act(() => {
      getStore().setField('type', 'water');
    });

    await waitFor(() => {
      expect(getStore().getField('pokemon')).toBe('charizard');
    });
  });
});
```

---

**Step 2: Run tests to confirm they fail**

```bash
nvm use 20 && cd /Users/krisish/dev/enforma && pnpm test --filter enforma -- --reporter=verbose 2>&1 | tail -30
```

Expected: 3 new tests fail (the two "clears" tests will fail because auto-clear doesn't fire for query sources; the "does not clear on mount" test may pass trivially).

---

**Step 3: Implement auto-clear for query datasources**

In `packages/enforma/src/hooks/useDataSource.ts`, add a new `useRef` guard and `useEffect` immediately after the existing static-items auto-clear effect (after line 127, before the query `useEffect`):

```typescript
// Auto-clear the bound field when form-derived filters change for query-based datasources.
// This mirrors the static-items auto-clear above, but fires on filtersKey instead of staticItems.
const didMountQueryClear = useRef(false);
useEffect(() => {
  if (!didMountQueryClear.current) {
    didMountQueryClear.current = true;
    return;
  }
  if (!bind || dataSource === undefined) return;
  const def = resolveDefinition(dataSource, registry);
  if (def === null || Array.isArray(def) || def === 'reactive') return;
  store.setField(joinPath(prefix, bind), '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [filtersKey]);
```

Place this block between the static-items `useEffect` (ending at line 127) and the query `useEffect` (starting at line 129).

---

**Step 4: Run tests to confirm they pass**

```bash
nvm use 20 && cd /Users/krisish/dev/enforma && pnpm test --filter enforma -- --reporter=verbose 2>&1 | tail -30
```

Expected: all tests pass including the 3 new ones.

---

**Step 5: Run lint and typecheck**

```bash
nvm use 20 && cd /Users/krisish/dev/enforma && pnpm lint && pnpm typecheck
```

Expected: no errors or warnings.

---

**Step 6: Commit**

```bash
cd /Users/krisish/dev/enforma && git add packages/enforma/src/hooks/useDataSource.ts packages/enforma/src/hooks/useDataSource.test.tsx && git commit -m "$(cat <<'EOF'
feat: auto-clear bound field on filter change for query datasources

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Add PokeAPI demo section to App.tsx

**Files:**
- Modify: `apps/demo/src/App.tsx`

No unit tests for demo UI. Visual verification is sufficient.

---

**Step 1: Add imports**

`apps/demo/src/App.tsx` already imports `DataSourceProp` from `enforma`. Add `DataSourceDefinition` and `DataSourceParams` to the same import:

Change:
```typescript
import Enforma, {
  type FormValues,
  registerComponents,
  useFieldProps,
  useDataSource,
  SelectOption,
  type SelectProps,
  type SelectOptionProps,
  type DataSourceProp,
} from 'enforma';
```

To:
```typescript
import Enforma, {
  type FormValues,
  registerComponents,
  useFieldProps,
  useDataSource,
  SelectOption,
  type SelectProps,
  type SelectOptionProps,
  type DataSourceProp,
  type DataSourceDefinition,
  type DataSourceParams,
} from 'enforma';
```

---

**Step 2: Add the POKEMON_DATASOURCES constant**

Add this block immediately after the `DATASOURCE_DEMO_SOURCES` constant (after line 32 in the current file):

```typescript
type PokemonItem = { name: string; label: string };

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const POKEMON_DATASOURCES: Record<string, DataSourceDefinition<PokemonItem>> = {
  types: {
    query: async (): Promise<PokemonItem[]> => {
      const res = await fetch('https://pokeapi.co/api/v2/type?limit=20');
      const data = (await res.json()) as { results: { name: string }[] };
      return data.results
        .filter((t) => t.name !== 'unknown' && t.name !== 'shadow')
        .map((t) => ({ name: t.name, label: capitalize(t.name) }));
    },
  },
  pokemon: {
    query: async ({ filters }: DataSourceParams): Promise<PokemonItem[]> => {
      const type = filters.type as string;
      if (!type) return [];
      const res = await fetch(`https://pokeapi.co/api/v2/type/${type}`);
      const data = (await res.json()) as {
        pokemon: { pokemon: { name: string } }[];
      };
      return data.pokemon.map(({ pokemon }) => ({
        name: pokemon.name,
        label: capitalize(pokemon.name),
      }));
    },
  },
};
```

---

**Step 3: Add the API DataSources demo section**

Append the following block inside the `App` component's JSX, just before the closing `</div>` at the end of the return (after the existing DataSources `</Enforma.Form>` block at line ~283):

```tsx
      <hr style={{ margin: '2rem 0' }} />

      <h2>API DataSources</h2>
      <p style={{ color: '#555', marginBottom: '1rem' }}>
        Select options loaded from the{' '}
        <a href="https://pokeapi.co" target="_blank" rel="noreferrer">
          PokeAPI
        </a>
        . Both selects use async query datasources. Picking a type reloads and
        clears the Pokémon select.
      </p>

      <Enforma.Form
        values={{ type: '', pokemon: '' }}
        onChange={() => {}}
        aria-label="api datasource demo form"
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

---

**Step 4: Run lint, typecheck, and tests**

```bash
nvm use 20 && cd /Users/krisish/dev/enforma && pnpm lint && pnpm typecheck && pnpm test
```

Expected: no errors, all tests pass.

---

**Step 5: Commit**

```bash
cd /Users/krisish/dev/enforma && git add apps/demo/src/App.tsx && git commit -m "$(cat <<'EOF'
feat: add PokeAPI datasource demo with linked type/pokemon selects

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```
