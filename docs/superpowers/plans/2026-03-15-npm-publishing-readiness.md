# npm Publishing Readiness Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all pre-publish audit issues so both `enforma` and `enforma-mui` are ready to publish to npm.

**Architecture:** Six files modified (two `package.json`, two `vite.config.ts`, two `README.md`). No new source code written — all changes are configuration and documentation. Each task is independent and can be verified immediately after.

**Tech Stack:** pnpm workspaces, Vite library build, Rollup externals, TypeScript, React 18

---

## Chunk 1: package.json fixes

### Task 1: Fix `enforma` package.json

**Files:**
- Modify: `packages/enforma/package.json`

Current state: missing `files`, `prepublishOnly`, `license`, `description`, `keywords`, `repository`, `sideEffects`.

- [ ] **Step 1: Open the file and confirm current state**

  Run: `cat packages/enforma/package.json`
  Expected: no `files`, `license`, `description`, `keywords`, `repository`, or `sideEffects` fields.

- [ ] **Step 2: Add all missing fields**

  Replace the full contents of `packages/enforma/package.json` with:

  ```json
  {
    "name": "enforma",
    "version": "0.0.1",
    "description": "Healthy forms for React — declare your fields, enforma handles the rest",
    "private": false,
    "type": "module",
    "license": "MIT",
    "sideEffects": false,
    "main": "./dist/enforma.cjs",
    "module": "./dist/enforma.js",
    "types": "./dist/index.d.ts",
    "source": "./src/index.ts",
    "files": [
      "dist",
      "README.md"
    ],
    "exports": {
      ".": {
        "source": "./src/index.ts",
        "types": "./dist/index.d.ts",
        "import": "./dist/enforma.js",
        "require": "./dist/enforma.cjs"
      }
    },
    "keywords": [
      "react",
      "form",
      "forms",
      "form-library",
      "validation",
      "typescript"
    ],
    "repository": {
      "type": "git",
      "url": "https://github.com/jacarma/enforma.git",
      "directory": "packages/enforma"
    },
    "scripts": {
      "build": "tsc --noEmit && vite build",
      "coverage": "vitest run --coverage",
      "dev": "vite build --watch",
      "lint": "eslint src",
      "prepublishOnly": "pnpm build",
      "test": "vitest run",
      "test:watch": "vitest",
      "typecheck": "tsc --noEmit",
      "typecheck:watch": "tsc --noEmit --watch"
    },
    "engines": {
      "node": ">=20",
      "pnpm": ">=9"
    },
    "peerDependencies": {
      "react": ">=18",
      "react-dom": ">=18"
    },
    "devDependencies": {
      "@testing-library/jest-dom": "^6.6.3",
      "@testing-library/react": "^16.2.0",
      "@testing-library/user-event": "^14.5.2",
      "@types/react": "^18.3.18",
      "@types/react-dom": "^18.3.5",
      "@vitejs/plugin-react": "^4.3.4",
      "@vitest/coverage-v8": "^2.1.9",
      "eslint": "^9.20.0",
      "eslint-plugin-react-hooks": "^5.1.0",
      "jsdom": "^25.0.0",
      "react": "^18.3.1",
      "react-dom": "^18.3.1",
      "typescript": "^5.7.3",
      "typescript-eslint": "^8.24.0",
      "vite": "^6.1.0",
      "vite-plugin-dts": "^4.5.0",
      "vitest": "^2.1.9"
    }
  }
  ```

- [ ] **Step 3: Verify pack output shows only dist + README**

  Run: `nvm use 20 && pnpm --filter enforma pack --dry-run 2>&1`
  Expected: tarball contents list only files under `dist/`, plus `README.md` and `package.json`. No `src/`, no `eslint.config.js`, no `vite.config.ts`.

- [ ] **Step 4: Commit**

  ```bash
  git add packages/enforma/package.json
  git commit -m "chore(enforma): add files, license, description, keywords, repository, sideEffects, prepublishOnly"
  ```

---

### Task 2: Fix `enforma-mui` package.json

**Files:**
- Modify: `packages/enforma-mui/package.json`

- [ ] **Step 1: Open the file and confirm current state**

  Run: `cat packages/enforma-mui/package.json`
  Expected: no `files`, `license`, `description`, `keywords`, `repository`, or `sideEffects` fields.

- [ ] **Step 2: Add all missing fields**

  Replace the full contents of `packages/enforma-mui/package.json` with:

  ```json
  {
    "name": "enforma-mui",
    "version": "0.0.1",
    "description": "Material UI adapter for enforma",
    "private": false,
    "type": "module",
    "license": "MIT",
    "sideEffects": false,
    "main": "./dist/enforma-mui.cjs",
    "module": "./dist/enforma-mui.js",
    "types": "./dist/index.d.ts",
    "source": "./src/index.ts",
    "files": [
      "dist",
      "README.md"
    ],
    "exports": {
      ".": {
        "source": "./src/index.ts",
        "types": "./dist/index.d.ts",
        "import": "./dist/enforma-mui.js",
        "require": "./dist/enforma-mui.cjs"
      }
    },
    "keywords": [
      "react",
      "form",
      "forms",
      "form-library",
      "mui",
      "material-ui",
      "enforma",
      "typescript"
    ],
    "repository": {
      "type": "git",
      "url": "https://github.com/jacarma/enforma.git",
      "directory": "packages/enforma-mui"
    },
    "scripts": {
      "build": "tsc --noEmit && vite build",
      "coverage": "vitest run --coverage",
      "dev": "vite build --watch",
      "lint": "eslint src",
      "prepublishOnly": "pnpm build",
      "test": "vitest run",
      "test:watch": "vitest",
      "typecheck": "tsc --noEmit",
      "typecheck:watch": "tsc --noEmit --watch"
    },
    "engines": {
      "node": ">=20",
      "pnpm": ">=9"
    },
    "dependencies": {
      "enforma": "workspace:*"
    },
    "peerDependencies": {
      "@emotion/react": "^11.14.0",
      "@emotion/styled": "^11.14.1",
      "@mui/material": "^6.4.6",
      "@mui/x-date-pickers": "^7 || ^8",
      "date-fns": "^3",
      "dayjs": "^1",
      "imask": "^7",
      "luxon": "^3",
      "moment": "^2",
      "react": ">=18",
      "react-dom": ">=18",
      "react-imask": "^7"
    },
    "peerDependenciesMeta": {
      "@mui/x-date-pickers": {
        "optional": true
      },
      "date-fns": {
        "optional": true
      },
      "dayjs": {
        "optional": true
      },
      "imask": {
        "optional": true
      },
      "luxon": {
        "optional": true
      },
      "moment": {
        "optional": true
      },
      "react-imask": {
        "optional": true
      }
    },
    "devDependencies": {
      "@mui/x-date-pickers": "^8.27.2",
      "@testing-library/jest-dom": "^6.6.3",
      "@testing-library/react": "^16.2.0",
      "@testing-library/user-event": "^14.5.2",
      "@types/react": "^18.3.18",
      "@types/react-dom": "^18.3.5",
      "@vitejs/plugin-react": "^4.3.4",
      "@vitest/coverage-v8": "^2.1.9",
      "dayjs": "^1",
      "eslint": "^9.20.0",
      "eslint-plugin-react-hooks": "^5.1.0",
      "imask": "^7.6.1",
      "jsdom": "^25.0.0",
      "react": "^18.3.1",
      "react-dom": "^18.3.1",
      "react-imask": "^7.6.1",
      "typescript": "^5.7.3",
      "typescript-eslint": "^8.24.0",
      "vite": "^6.1.0",
      "vite-plugin-dts": "^4.5.0",
      "vitest": "^2.1.9"
    }
  }
  ```

- [ ] **Step 3: Verify pack output shows only dist + README**

  Run: `nvm use 20 && pnpm --filter enforma-mui pack --dry-run 2>&1`
  Expected: tarball contents list only files under `dist/`, plus `README.md` and `package.json`. No `src/`, no `eslint.config.js`, no `vite.config.ts`.

- [ ] **Step 4: Commit**

  ```bash
  git add packages/enforma-mui/package.json
  git commit -m "chore(enforma-mui): add files, license, description, keywords, repository, sideEffects, prepublishOnly"
  ```

---

## Chunk 2: vite.config.ts fixes

### Task 3: Fix `enforma` vite.config.ts — add `exports: "named"`

**Files:**
- Modify: `packages/enforma/vite.config.ts`

The `rollupOptions.output` object is missing `exports: "named"`, which causes a Rollup warning about mixed default+named exports and confuses CJS consumers.

- [ ] **Step 1: Add `exports: "named"` to the output object**

  In `packages/enforma/vite.config.ts`, change the `output` object inside `rollupOptions` from:

  ```ts
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime',
        },
      },
  ```

  to:

  ```ts
      output: {
        exports: 'named',
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime',
        },
      },
  ```

- [ ] **Step 2: Build and verify warning is gone**

  Run: `nvm use 20 && pnpm --filter enforma build 2>&1`
  Expected: build succeeds, the line "Entry module 'src/index.ts' is using named and default exports together" does NOT appear.

- [ ] **Step 3: Confirm CJS exports still work**

  Run: `node -e "const pkg = require('./packages/enforma/dist/enforma.cjs'); console.log(typeof pkg.Form, typeof pkg.default)"`
  Expected: `function object` — named exports still accessible directly, default export available at `.default`.

- [ ] **Step 4: Run lint and tests**

  Run: `nvm use 20 && pnpm --filter enforma lint && pnpm --filter enforma test 2>&1`
  Expected: no lint errors, all tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add packages/enforma/vite.config.ts
  git commit -m "fix(enforma): add exports: named to suppress CJS interop warning"
  ```

---

### Task 4: Fix `enforma-mui` vite.config.ts — externals + `exports: "named"`

**Files:**
- Modify: `packages/enforma-mui/vite.config.ts`

Two issues: `@mui/material` and `@mui/x-date-pickers` are listed as bare strings, which don't match sub-path imports (e.g. `@mui/material/styles`). Also missing `exports: "named"`.

- [ ] **Step 1: Replace bare MUI strings with regexes and add `exports: "named"`**

  In `packages/enforma-mui/vite.config.ts`, replace the `rollupOptions` block from:

  ```ts
      rollupOptions: {
        external: [
          'react',
          'react-dom',
          'react/jsx-runtime',
          '@mui/material',
          '@emotion/react',
          '@emotion/styled',
          '@mui/x-date-pickers',
          'date-fns',
          /^date-fns\/.*/,
          'dayjs',
          'luxon',
          'moment',
          'enforma',
          'react-imask',
          'imask',
        ],
        output: {
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM',
            'react/jsx-runtime': 'jsxRuntime',
            '@mui/material': 'MuiMaterial',
            '@emotion/react': 'emotionReact',
            '@emotion/styled': 'emotionStyled',
            enforma: 'Enforma',
            'react-imask': 'ReactIMask',
            imask: 'IMask',
          },
        },
      },
  ```

  to:

  ```ts
      rollupOptions: {
        external: [
          'react',
          'react-dom',
          'react/jsx-runtime',
          /^@mui\/material/,
          '@emotion/react',
          '@emotion/styled',
          /^@mui\/x-date-pickers/,
          'date-fns',
          /^date-fns\/.*/,
          'dayjs',
          'luxon',
          'moment',
          'enforma',
          'react-imask',
          'imask',
        ],
        output: {
          exports: 'named',
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM',
            'react/jsx-runtime': 'jsxRuntime',
            '@mui/material': 'MuiMaterial',
            '@emotion/react': 'emotionReact',
            '@emotion/styled': 'emotionStyled',
            enforma: 'Enforma',
            'react-imask': 'ReactIMask',
            imask: 'IMask',
          },
        },
      },
  ```

- [ ] **Step 2: Build and verify**

  Run: `nvm use 20 && pnpm --filter enforma-mui build 2>&1`
  Expected:
  - Build succeeds
  - No "named and default exports together" warning
  - No `@mui/material/styles` or `@mui/material/colors` appear as bundled imports in the dist (they should be external)

- [ ] **Step 3: Spot-check the dist for bundled MUI sub-paths**

  Run: `grep -o "from ['\"][^'\"]*['\"]" packages/enforma-mui/dist/enforma-mui.js packages/enforma-mui/dist/*.js 2>/dev/null | grep "@mui" | sort | uniq`
  Expected: the output contains `from "@mui/material"`, `from "@emotion/react"`, `from "@emotion/styled"` as external imports. Critically, `@mui/material/styles`, `@mui/material/colors`, and any other `@mui/` sub-paths must NOT appear — they should be absent entirely (externalized, not bundled).

- [ ] **Step 4: Run lint and tests**

  Run: `nvm use 20 && pnpm --filter enforma-mui lint && pnpm --filter enforma-mui test 2>&1`
  Expected: no lint errors, all tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add packages/enforma-mui/vite.config.ts
  git commit -m "fix(enforma-mui): use regex externals for MUI sub-paths, add exports: named"
  ```

---

## Chunk 3: READMEs + final verification

### Task 5: Write `enforma` README.md

**Files:**
- Create: `packages/enforma/README.md`

Draw from the root `README.md` which already has the tagline, why section, usage example, and features. The package README should be a focused version of that content, plus a note about CJS usage.

- [ ] **Step 1: Create `packages/enforma/README.md`**

  ```markdown
  # enforma

  **Healthy forms for React.** Write only your business logic — enforma handles the rest.

  ## Why Enforma

  **Only write what's yours.** No state management, no touched/error tracking, no blur handlers. Declare your fields, validations, and submit logic — enforma handles the plumbing.

  **Your form logic doesn't change when your UI does.** Enforma is a facade over your component library. Swap MUI for shadcn, or build your own components — your form code is untouched.

  ## Installation

  ```bash
  npm install enforma
  ```

  Requires React 18+. Enforma has no UI of its own — you need a component adapter to render fields. See [enforma-mui](https://www.npmjs.com/package/enforma-mui) for the Material UI adapter.

  ## Setup

  Register a component adapter once before rendering any forms, typically in your app entry point:

  ```tsx
  import { registerComponents } from 'enforma';
  import muiComponents from 'enforma-mui';

  registerComponents(muiComponents, { variant: 'outlined' });
  ```

  ## Usage

  ```tsx
  import Enforma from 'enforma';

  export function CheckoutForm() {
    return (
      <Enforma.Form
        values={{}}
        onSubmit={(values) => fetch('/api/order', { method: 'POST', body: JSON.stringify(values) })}
      >
        <Enforma.Select bind="method" label="Delivery method">
          <Enforma.Select.Option value="delivery" label="Delivery" />
          <Enforma.Select.Option value="pickup" label="Pickup in store" />
        </Enforma.Select>
        <Enforma.TextInput
          bind="address"
          label="Delivery address"
          disabled={({ method }) => method !== 'delivery'}
          validate={(value, { method }) =>
            method === 'delivery' && !value ? 'Address is required' : null
          }
        />
        <Enforma.Submit>Place order</Enforma.Submit>
      </Enforma.Form>
    );
  }
  ```

  ## Features

  - **High performance** — each field re-renders only when its own value changes (powered by `useSyncExternalStore`)
  - **Reactive attributes** — `disabled`, `label`, `placeholder` accept static values or functions that respond to form state
  - **Cross-field validation** — validators receive the full form state
  - **Hierarchical scopes** — nest sections with automatic path prefixing via `Enforma.Scope`
  - **Dynamic lists** — field arrays with `Enforma.List`
  - **UI library agnostic** — swap your component library without touching form logic

  ## Custom components

  Use `useFieldProps` to build components that integrate with the form store:

  ```tsx
  import { useFieldProps } from 'enforma';

  function MyInput({ bind, label }: { bind: string; label: string }) {
    const { value, onChange, error } = useFieldProps({ bind, label });
    return <input value={value} onChange={(e) => onChange(e.target.value)} />;
  }
  ```

  ## CJS usage

  When using CommonJS `require`, access the default export via `.default`:

  ```js
  const { default: Enforma, registerComponents } = require('enforma');
  ```

  ## License

  MIT
  ```

- [ ] **Step 2: Verify the file was created**

  Run: `cat packages/enforma/README.md`
  Expected: file contents printed, no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add packages/enforma/README.md
  git commit -m "docs(enforma): add package README"
  ```

---

### Task 6: Rewrite `enforma-mui` README.md

**Files:**
- Modify: `packages/enforma-mui/README.md`

The current README references `outlined`, `classic`, `standard` as named imports from `enforma-mui` — those don't exist. The actual API uses the default export `muiComponents` and sets variant through `registerComponents`.

- [ ] **Step 1: Replace the full contents of `packages/enforma-mui/README.md`**

  ```markdown
  # enforma-mui

  Material UI adapter for [enforma](https://www.npmjs.com/package/enforma).

  ## Installation

  ```bash
  npm install enforma enforma-mui @mui/material @emotion/react @emotion/styled
  ```

  Requires React 18+.

  ## Setup

  Register the adapter once before rendering any forms, typically in your app entry point:

  ```tsx
  import { registerComponents } from 'enforma';
  import muiComponents from 'enforma-mui';

  registerComponents(muiComponents);
  ```

  Then use enforma components as normal — they will render as MUI fields:

  ```tsx
  import Enforma from 'enforma';

  export function MyForm() {
    return (
      <Enforma.Form values={{}} onSubmit={handleSubmit}>
        <Enforma.TextInput bind="name" label="Name" />
        <Enforma.TextInput bind="email" label="Email" />
        <Enforma.Submit>Submit</Enforma.Submit>
      </Enforma.Form>
    );
  }
  ```

  ## Variants

  Pass a `variant` option to `registerComponents` to set the visual style:

  ```tsx
  import { registerComponents } from 'enforma';
  import muiComponents from 'enforma-mui';

  registerComponents(muiComponents, { variant: 'outlined' });
  // variant: 'classic' | 'outlined' | 'standard'
  ```

  | Variant | Description |
  |---------|-------------|
  | `classic` | Compact fields with labels above inputs |
  | `outlined` | Standard MUI outlined text fields |
  | `standard` | Minimal underline-style text fields |

  ## Masked inputs

  Masked inputs are supported via `react-imask`. Install the optional dependencies:

  ```bash
  npm install react-imask imask
  ```

  Then pass a `mask` prop to any `TextInput`:

  ```tsx
  <Enforma.TextInput bind="phone" label="Phone" mask="+1 (000) 000-0000" />
  <Enforma.TextInput bind="dob" label="Date of birth" mask="DD/MM/YYYY" />
  ```

  If `react-imask` is not installed and a `mask` prop is used, enforma-mui throws at runtime with installation instructions.

  ## Date / time pickers

  Date, time, and datetime pickers require `@mui/x-date-pickers` and a date library:

  ```bash
  npm install @mui/x-date-pickers dayjs
  # or: date-fns, luxon, moment
  ```

  ## Exports

  Default export (`muiComponents`) is the full component registry. Named exports provide individual components for advanced use:

  `Output`, `Calculated`, `TextInput`, `Textarea`, `Checkbox`, `Switch`, `NumberInput`, `DatePicker`, `TimePicker`, `DateTimePicker`, `Fieldset`, `Select`, `SelectOption`, `RadioGroup`, `RadioGroupOption`, `Autocomplete`, `AutocompleteOption`, `ExclusiveToggle`, `ExclusiveToggleOption`, `List`, `ListItem`, `AddButton`, `FormModal`, `MuiFormWrap`, `Submit`

  Type export: `MuiVariant` (`'classic' | 'outlined' | 'standard'`)

  ## Peer dependencies

  | Package | Required |
  |---------|----------|
  | `react` >= 18 | Yes |
  | `react-dom` >= 18 | Yes |
  | `@mui/material` >= 6 | Yes |
  | `@emotion/react` >= 11 | Yes |
  | `@emotion/styled` >= 11 | Yes |
  | `@mui/x-date-pickers` >= 7 | Only for date/time pickers |
  | `react-imask` >= 7 | Only for masked inputs |
  | `imask` >= 7 | Only for masked inputs |

  ## CJS usage

  When using CommonJS `require`, access the default export via `.default`:

  ```js
  const { default: muiComponents, TextInput } = require('enforma-mui');
  ```

  ## License

  MIT
  ```

- [ ] **Step 2: Verify the file was updated**

  Run: `cat packages/enforma-mui/README.md`
  Expected: new content printed, no reference to `import { outlined } from 'enforma-mui'`.

- [ ] **Step 3: Commit**

  ```bash
  git add packages/enforma-mui/README.md
  git commit -m "docs(enforma-mui): rewrite README with accurate API"
  ```

---

### Task 7: Final verification

**Precondition:** Tasks 1–6 must all be complete. In particular, the `files` field added in Tasks 1 and 2 is required for Steps 4 and 5 to produce clean tarballs.

**Files:** none modified

- [ ] **Step 1: Run full build**

  Run: `nvm use 20 && pnpm build 2>&1`
  Expected: both packages build successfully, no "named and default exports together" warnings.

- [ ] **Step 2: Run lint**

  Run: `nvm use 20 && pnpm lint 2>&1`
  Expected: exits with no errors or warnings.

- [ ] **Step 3: Run tests**

  Run: `nvm use 20 && pnpm test 2>&1`
  Expected: all tests pass.

- [ ] **Step 4: Verify enforma tarball contents**

  Run: `nvm use 20 && pnpm --filter enforma pack --dry-run 2>&1`
  Expected: only `dist/**`, `README.md`, `package.json` — no `src/`, `eslint.config.js`, `tsconfig.json`, or `vite.config.ts`.

- [ ] **Step 5: Verify enforma-mui tarball contents**

  Run: `nvm use 20 && pnpm --filter enforma-mui pack --dry-run 2>&1`
  Expected: only `dist/**`, `README.md`, `package.json` — no `src/`, `eslint.config.js`, `tsconfig.json`, or `vite.config.ts`.

- [ ] **Step 6: Confirm `workspace:*` would be rewritten**

  Run: `nvm use 20 && pnpm --filter enforma-mui pack --dry-run 2>&1 | grep enforma`
  Expected: the `enforma` dependency version appears as `0.0.1`, not `workspace:*`.

  Note: pnpm rewrites `workspace:*` automatically at pack/publish time. This only works when publishing via `pnpm publish` (not `npm publish` directly).
