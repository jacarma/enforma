# npm Publishing Readiness: enforma & enforma-mui

**Date:** 2026-03-15
**Status:** Approved
**Scope:** Prepare both packages for first publish to npm

---

## Goal

Fix all blocking and important issues identified in the pre-publish audit so that `enforma` and `enforma-mui` can be safely published to npm.

---

## Issues to Fix

### 🔴 Critical

| # | Package | Issue | Fix |
|---|---------|-------|-----|
| 1 | both | No `files` field — publishes all source, tests, config | Add `"files": ["dist", "README.md"]` |
| 2 | enforma | No `README.md` | Write a README |
| 3 | enforma-mui | README references non-existent `outlined`/`classic`/`standard` exports | Rewrite README to match actual API |
| 4 | both | No `prepublishOnly` script | Add `"prepublishOnly": "pnpm build"` |
| 5 | enforma-mui | `@mui/material/styles` not externalized (gets bundled) | Add `/^@mui\/material/` regex to `rollupOptions.external` |
| 6 | both | Mixed default+named exports produce CJS interop warning | Add `output.exports: "named"` to vite build config |

### 🟡 Important

| # | Package | Issue | Fix |
|---|---------|-------|-----|
| 7 | both | Missing `license` field | Add `"license": "MIT"` (or chosen license) |
| 8 | both | Missing `description` | Add concise description |
| 9 | both | Missing `keywords` | Add relevant keywords |
| 10 | both | Missing `repository` | Add GitHub URL |
| 11 | both | Missing `sideEffects: false` | Add to both `package.json` files |
| 12 | enforma-mui | `workspace:*` — must publish `enforma` first | Publish order: enforma → enforma-mui |

---

## Architecture Notes

### `files` field
Only `dist/` and `README.md` should be published. Source files, test files, `vite.config.ts`, `tsconfig.json`, and `eslint.config.js` must be excluded.

### CJS interop (issue #6)
Both index files use `export default X` alongside named exports. Add `exports: "named"` inside the existing `output: {}` object in `rollupOptions` in each package's `vite.config.ts`. This suppresses the Rollup warning. CJS consumers will access the default export via `.default`:
```js
const { default: Enforma } = require('enforma');
```
This is standard behaviour for dual ESM/CJS packages and should be documented.

### `@mui/material` externalization (issue #5)
The current external list uses exact strings `'@mui/material'` and `'@mui/x-date-pickers'`, which do not match sub-path imports like `@mui/material/styles`. Replace both with regexes:
- `'@mui/material'` → `/^@mui\/material/`
- `'@mui/x-date-pickers'` → `/^@mui\/x-date-pickers/`

### `sideEffects: false` (issue #11)
Both packages are pure — no global side effects at import time. This flag enables bundler tree-shaking so consumers only pay for what they use.

### enforma README
The monorepo root `README.md` already contains most of what's needed: tagline, "Why Enforma" rationale, a full usage example, installation instructions, features list, and the packages table. The package-level README should draw from this content rather than starting from scratch. It should cover: what enforma is, installation, basic usage, linking to enforma-mui, and TypeScript support. The primary usage example should use the default namespace pattern since that is the intended API:
```tsx
import Enforma from 'enforma';

<Enforma.Form values={{}} onSubmit={handleSubmit}>
  <Enforma.TextInput bind="name" label="Name" />
</Enforma.Form>
```
Also document `registerComponents` (required before rendering), `Scope`, `List`, and key hooks (`useFormValue`, `useDataSource`).

### enforma-mui README
Current README is inaccurate. The actual API:
- Default export: `muiComponents` (the full registry object, satisfies `Partial<EnformaComponentRegistry>`)
- Named exports: `Output`, `Calculated`, `TextInput`, `Textarea`, `Checkbox`, `Switch`, `NumberInput`, `DatePicker`, `TimePicker`, `DateTimePicker`, `Fieldset`, `Select`, `SelectOption`, `RadioGroup`, `RadioGroupOption`, `Autocomplete`, `AutocompleteOption`, `ExclusiveToggle`, `ExclusiveToggleOption`, `List`, `ListItem`, `AddButton`, `FormModal`, `MuiFormWrap`, `Submit`
- `registerComponents` is imported from `enforma`, not `enforma-mui`
- Variant is set via the second argument to `registerComponents` (defined in `RegisterOptions` in enforma):
  ```ts
  registerComponents(muiComponents, { variant: 'outlined' }); // 'classic' | 'outlined' | 'standard'
  ```
- Type export: `MuiVariant` (`'classic' | 'outlined' | 'standard'`)

---

## Out of Scope

- Tree-shaking at component level (chunked dist) — deferred
- CHANGELOG — deferred
- CI publish pipeline — deferred
- Version bump to `0.1.0` — user decision

---

## Publish Order

1. Fix all issues above
2. Run `pnpm build`, `pnpm lint`, `pnpm test` — all must pass
3. `pnpm --filter enforma publish --access public`
4. `pnpm --filter enforma-mui publish --access public`

> **Important:** Always publish via `pnpm publish`, not `npm publish`. pnpm automatically rewrites `workspace:*` to the resolved version (`0.0.1`) in the published tarball. Using `npm publish` directly will leave `workspace:*` in the published `package.json`, breaking installs.
