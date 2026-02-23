# Enforma

## Mandatory rules at every step

- Run `pnpm lint` before any commit. It must pass with no errors or warnings.
- Run `pnpm typecheck` before any commit. It must pass with no errors or warnings.
- Run `pnpm test` before any commit. All tests must pass.
- A step is not considered complete until both commands pass with no errors.

## Stack

- pnpm workspaces (monorepo)
- TypeScript strict
- Vite (library mode in packages/enforma, app in apps/demo)
- Vitest + @testing-library/react
- ESLint 9 flat config with typescript-eslint strict-type-checked

## Structure

- `packages/enforma` — publishable library
- `apps/demo` — development playground
