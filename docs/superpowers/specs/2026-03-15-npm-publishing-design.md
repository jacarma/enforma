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
Both index files use `export default X` alongside named exports. Adding `output.exports: "named"` to the Rollup output config suppresses the Rollup warning. CJS consumers will access the default export via `.default`:
```js
const { default: Enforma } = require('enforma');
```
This is standard behaviour for dual ESM/CJS packages and should be documented.

### `@mui/material` externalization (issue #5)
The current external list uses the exact string `'@mui/material'`, which does not match sub-path imports like `@mui/material/styles`. Replace with a regex `/^@mui\/material/` to cover all sub-paths.

### `sideEffects: false` (issue #11)
Both packages are pure — no global side effects at import time. This flag enables bundler tree-shaking so consumers only pay for what they use.

### enforma README
Should cover: what enforma is, installation, basic usage (`Form`, `TextInput`, `registerComponents`), linking to enforma-mui, and TypeScript support.

### enforma-mui README
Current README is inaccurate. The actual API:
- Default export: `muiComponents` (the full registry object)
- Named exports: individual components (`TextInput`, `Select`, etc.)
- `registerComponents` is imported from `enforma`, not `enforma-mui`
- Variant is set via `registerComponents(muiComponents, { variant: 'outlined' })`

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
