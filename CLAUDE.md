# Enforma

## Reglas obligatorias en cada paso

- Ejecutar `pnpm lint` antes de cualquier commit. Debe pasar sin errores ni warnings.
- Ejecutar `pnpm test` antes de cualquier commit. Todos los tests deben pasar.
- Un paso no se considera completo hasta que ambos comandos pasen sin errores.

## Stack

- pnpm workspaces (monorepo)
- TypeScript strict
- Vite (library mode en packages/enforma, app en apps/demo)
- Vitest + @testing-library/react
- ESLint 9 flat config con typescript-eslint strict-type-checked

## Estructura

- `packages/enforma` — librería publicable
- `apps/demo` — playground de desarrollo
