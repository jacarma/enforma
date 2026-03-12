# Docs Site — Scaffold Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create and deploy a live `apps/docs` Astro + Starlight site to GitHub Pages with a working homepage (split-card hero with interactive demo) and stub content pages for all sections.

**Architecture:** New pnpm workspace app `apps/docs` using Astro with the Starlight integration. The homepage is a fully custom `index.astro` page with a React island (`HeroDemo.tsx`) for the live form demo. Starlight handles all `/docs/**` routing. Deployed via GitHub Actions to `https://jacarma.github.io/enforma/`.

**Tech Stack:** Astro 5, @astrojs/starlight, @astrojs/react, React 18, enforma + enforma-mui (workspace packages), @mui/material 6, Vitest + @testing-library/react, ESLint 9 flat config

---

## File Map

| File | Purpose |
|------|---------|
| `apps/docs/package.json` | Workspace app manifest — all deps including Vitest and ESLint |
| `apps/docs/tsconfig.json` | TypeScript config extending `astro/tsconfigs/strict` |
| `apps/docs/astro.config.mjs` | Astro + Starlight config: site URL, base path, sidebar, custom CSS, logo |
| `apps/docs/eslint.config.js` | ESLint 9 flat config for TypeScript + React hooks |
| `apps/docs/vitest.config.ts` | Vitest config (jsdom, globals, setupFiles) |
| `apps/docs/src/test/setup.ts` | Vitest setup (`@testing-library/jest-dom`) |
| `apps/docs/src/styles/custom.css` | Starlight accent colour overrides (`#890079` light, `#c93abf` dark) |
| `apps/docs/src/components/HeroDemo.tsx` | React island: live enforma form for the homepage hero |
| `apps/docs/src/components/HeroDemo.test.tsx` | Vitest smoke test for HeroDemo |
| `apps/docs/src/pages/index.astro` | Custom homepage: hero split-card + features strip + footer |
| `apps/docs/public/enforma-logo.svg` | SVG logo (copied from `docs/enforma-logo.svg`) |
| `apps/docs/public/enforma-logo.png` | PNG logo (copied from `docs/enforma-logo.png`) |
| `apps/docs/src/content/docs/*.mdx` | Stub MDX pages (25 files) — content filled in by Plan 2 |
| `.github/workflows/docs.yml` | CI/CD workflow |

---

## Chunk 1: Workspace Scaffold & Starlight Config

### Task 1: Create `apps/docs` package files

**Files:**
- Create: `apps/docs/package.json`
- Create: `apps/docs/tsconfig.json`
- Create: `apps/docs/eslint.config.js`
- Create: `apps/docs/vitest.config.ts`
- Create: `apps/docs/src/test/setup.ts`

- [ ] **Step 1: Create `apps/docs/package.json`**

All deps — including Vitest, testing-library, and ESLint — are declared upfront so monorepo-level `pnpm lint`, `pnpm typecheck`, and `pnpm test` all work from Task 1 onward. The `test` script uses `--passWithNoTests` until HeroDemo.test.tsx is written in Task 5.

```json
{
  "name": "docs",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "lint": "eslint src",
    "test": "vitest run --passWithNoTests",
    "typecheck": "astro check"
  },
  "engines": {
    "node": ">=20",
    "pnpm": ">=9"
  },
  "dependencies": {
    "astro": "^5.0.0",
    "@astrojs/starlight": "^0.30.0",
    "@astrojs/react": "^4.0.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "@mui/material": "^6.4.6",
    "@emotion/react": "^11.14.0",
    "@emotion/styled": "^11.14.1",
    "enforma": "workspace:*",
    "enforma-mui": "workspace:*"
  },
  "devDependencies": {
    "@testing-library/react": "^16.2.0",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/user-event": "^14.5.2",
    "@vitejs/plugin-react": "^4.3.4",
    "eslint": "^9.20.0",
    "eslint-plugin-react-hooks": "^5.1.0",
    "jsdom": "^25.0.0",
    "typescript": "^5.7.3",
    "typescript-eslint": "^8.24.0",
    "vitest": "^2.1.9"
  }
}
```

- [ ] **Step 2: Create `apps/docs/tsconfig.json`**

`astro/tsconfigs/strict` already enables `strict: true` and `target: ES2022`.

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

- [ ] **Step 3: Create `apps/docs/eslint.config.js`**

```js
// apps/docs/eslint.config.js
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

// Uses `recommended` (not `strictTypeChecked`) intentionally — Astro component
// types are difficult to check through ESLint's type-aware rules.
export default tseslint.config(
  { ignores: ['dist/', '.astro/'] },
  ...tseslint.configs.recommended,
  {
    plugins: { 'react-hooks': reactHooks },
    rules: { ...reactHooks.configs.recommended.rules },
  },
);
```

- [ ] **Step 4: Create `apps/docs/vitest.config.ts`**

```ts
// apps/docs/vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

- [ ] **Step 5: Create `apps/docs/src/test/setup.ts`**

```bash
mkdir -p apps/docs/src/test
```

```ts
// apps/docs/src/test/setup.ts
import '@testing-library/jest-dom';
```

- [ ] **Step 6: Install dependencies from monorepo root**

```bash
nvm use 20 && pnpm install
```

Expected: pnpm resolves workspace packages (`enforma`, `enforma-mui`). No errors. `apps/docs` appears in install output.

- [ ] **Step 7: Verify monorepo-level scripts pass on the new workspace**

```bash
nvm use 20 && pnpm lint && pnpm test
```

Expected: Both pass with no errors. `pnpm test` reports "No test files found" but exits 0 due to `--passWithNoTests`.

- [ ] **Step 8: Commit**

```bash
git add apps/docs/package.json apps/docs/tsconfig.json apps/docs/eslint.config.js apps/docs/vitest.config.ts apps/docs/src/test/ pnpm-lock.yaml
git commit -m "chore(docs): scaffold apps/docs workspace with all config files"
```

---

### Task 2: Create `astro.config.mjs`

**Files:**
- Create: `apps/docs/astro.config.mjs`

- [ ] **Step 1: Create the config file**

```js
// apps/docs/astro.config.mjs
// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://jacarma.github.io',
  base: '/enforma/',
  output: 'static',
  integrations: [
    starlight({
      title: 'Enforma',
      logo: {
        // Resolved relative to apps/docs/ (the Astro project root)
        src: './public/enforma-logo.svg',
      },
      customCss: ['./src/styles/custom.css'],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Installation', slug: 'installation' },
            { label: 'Quick start', slug: 'quick-start' },
          ],
        },
        {
          label: 'Concepts',
          items: [
            { label: 'Reactive props', slug: 'concepts/reactive-props' },
            { label: 'Validation', slug: 'concepts/validation' },
            { label: 'Data sources', slug: 'concepts/datasources' },
          ],
        },
        {
          label: 'Components',
          items: [
            { label: 'Form', slug: 'components/form' },
            { label: 'TextInput', slug: 'components/text-input' },
            { label: 'Textarea', slug: 'components/textarea' },
            { label: 'Select', slug: 'components/select' },
            { label: 'Checkbox & Switch', slug: 'components/checkbox-switch' },
            { label: 'RadioGroup', slug: 'components/radio-group' },
            { label: 'Autocomplete', slug: 'components/autocomplete' },
            { label: 'ExclusiveToggle', slug: 'components/exclusive-toggle' },
            { label: 'NumberInput', slug: 'components/number-input' },
            { label: 'Date & Time', slug: 'components/date-time' },
            { label: 'Fieldset', slug: 'components/fieldset' },
            { label: 'List', slug: 'components/list' },
            { label: 'Calculated', slug: 'components/calculated' },
            { label: 'Output', slug: 'components/output' },
            { label: 'Scope', slug: 'components/scope' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'Custom components', slug: 'guides/custom-components' },
            { label: 'Adapters', slug: 'guides/adapters' },
            { label: 'Plain React comparison', slug: 'guides/plain-react-comparison' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'CommonProps', slug: 'reference/common-props' },
            { label: 'API', slug: 'reference/api' },
          ],
        },
      ],
    }),
    react(),
  ],
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/docs/astro.config.mjs
git commit -m "chore(docs): add Astro + Starlight config"
```

---

### Task 3: Custom CSS theming + logos

**Files:**
- Create: `apps/docs/src/styles/custom.css`
- Copy: `docs/enforma-logo.svg` → `apps/docs/public/enforma-logo.svg`
- Copy: `docs/enforma-logo.png` → `apps/docs/public/enforma-logo.png`

Run all commands from the **monorepo root**.

- [ ] **Step 1: Verify logos exist**

```bash
ls docs/enforma-logo.svg docs/enforma-logo.png
```

Expected: Both files listed. If either is missing, stop — the files must be present before continuing.

- [ ] **Step 2: Copy logo files**

```bash
mkdir -p apps/docs/public
cp docs/enforma-logo.svg apps/docs/public/enforma-logo.svg
cp docs/enforma-logo.png apps/docs/public/enforma-logo.png
```

- [ ] **Step 3: Create `apps/docs/src/styles/custom.css`**

```bash
mkdir -p apps/docs/src/styles
```

```css
/* apps/docs/src/styles/custom.css */
/* Brand accent derived from logo: #890079 (deep magenta) */

:root {
  --sl-color-accent-low: hsl(306, 100%, 93%);
  --sl-color-accent: #890079;
  --sl-color-accent-high: hsl(306, 100%, 18%);
}

:root[data-theme='dark'] {
  --sl-color-accent-low: hsl(306, 100%, 14%);
  --sl-color-accent: #c93abf;
  --sl-color-accent-high: hsl(306, 100%, 88%);
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/docs/public/ apps/docs/src/styles/
git commit -m "chore(docs): add brand theming and logo assets"
```

---

### Task 4: Create stub MDX pages

Starlight (Astro 5) reads `.mdx` files from `src/content/docs/` automatically — no `config.ts` needed. Every file needs a `title` in its frontmatter.

**Files:**
- Create: `apps/docs/src/content/docs/` directory tree + 25 stub `.mdx` files

- [ ] **Step 1: Create the directory structure**

```bash
mkdir -p apps/docs/src/content/docs/concepts
mkdir -p apps/docs/src/content/docs/components
mkdir -p apps/docs/src/content/docs/guides
mkdir -p apps/docs/src/content/docs/reference
```

- [ ] **Step 2: Create all 25 stub pages**

Each file uses this exact pattern:

```mdx
---
title: Page Title Here
description: One-sentence description here.
---

Coming soon.
```

Create these files (all paths relative to `apps/docs/src/content/docs/`):

| File | title | description |
|------|-------|-------------|
| `installation.mdx` | Installation | How to install Enforma in your project. |
| `quick-start.mdx` | Quick start | Build your first form in minutes. |
| `concepts/reactive-props.mdx` | Reactive props | How props can be functions that respond to form state. |
| `concepts/validation.mdx` | Validation | Declaring and running field validators. |
| `concepts/datasources.mdx` | Data sources | Loading select options from static data or async APIs. |
| `components/form.mdx` | Form | The root component that owns form state. |
| `components/text-input.mdx` | TextInput | Single-line text field with optional mask support. |
| `components/textarea.mdx` | Textarea | Multi-line text field. |
| `components/select.mdx` | Select | Dropdown field for single selection. |
| `components/checkbox-switch.mdx` | Checkbox & Switch | Boolean fields bound to a true/false value. |
| `components/radio-group.mdx` | RadioGroup | Radio button group for single selection. |
| `components/autocomplete.mdx` | Autocomplete | Searchable combobox with type-ahead filtering. |
| `components/exclusive-toggle.mdx` | ExclusiveToggle | Segmented button group for single selection from a small set. |
| `components/number-input.mdx` | NumberInput | Numeric field with locale-aware formatting. |
| `components/date-time.mdx` | Date & Time | Calendar and clock pickers for date, time, and combined values. |
| `components/fieldset.mdx` | Fieldset | Groups fields under a nested key in the form state. |
| `components/list.mdx` | List | Repeating sections driven by an array value. |
| `components/calculated.mdx` | Calculated | A field whose value is derived from other form values. |
| `components/output.mdx` | Output | Read-only inline element that renders a value or static text. |
| `components/scope.mdx` | Scope | Restricts field bindings to a nested scope without writing to the store. |
| `guides/custom-components.mdx` | Custom components | Build your own field components using useFieldProps. |
| `guides/adapters.mdx` | Adapters | Connecting Enforma to a UI component library. |
| `guides/plain-react-comparison.mdx` | Plain React comparison | Side-by-side comparison with a vanilla React form. |
| `reference/common-props.mdx` | CommonProps | Props shared by all field components. |
| `reference/api.mdx` | API | Public hooks exported from enforma. |

- [ ] **Step 3: Build workspace packages first**

`apps/docs` imports `enforma` and `enforma-mui` via `workspace:*`. Astro resolves these from their `dist/` output, so the packages must be built before the docs build runs.

```bash
nvm use 20 && pnpm --filter './packages/*' build
```

Expected: Both `packages/enforma` and `packages/enforma-mui` build successfully. `dist/` directories appear in each.

- [ ] **Step 4: Verify the docs build passes**

```bash
nvm use 20 && pnpm --filter docs build
```

Expected: Build completes with no errors. `apps/docs/dist/` is created. No 404 warnings about missing sidebar slugs.

- [ ] **Step 5: Verify dev server**

```bash
nvm use 20 && pnpm --filter docs dev
```

Open `http://localhost:4321/enforma/` in a browser. Confirm:
- Starlight sidebar shows all 5 groups with correct labels (Getting Started, Concepts, Components, Guides, Reference)
- Clicking any sidebar link loads a page with the correct title and "Coming soon." body
- Enforma logo appears in the Starlight header
- Accent colour is magenta (not default blue)

- [ ] **Step 6: Commit**

```bash
git add apps/docs/src/content/
git commit -m "chore(docs): add stub MDX pages for all sidebar entries"
```

---

## Chunk 2: HeroDemo Component + Homepage

### Task 5: Write HeroDemo component (TDD)

**Files:**
- Create: `apps/docs/src/components/HeroDemo.test.tsx`
- Create: `apps/docs/src/components/HeroDemo.tsx`
- Modify: `apps/docs/package.json` — remove `--passWithNoTests` from `test` script

- [ ] **Step 1: Write the failing test**

```bash
mkdir -p apps/docs/src/components
```

```tsx
// apps/docs/src/components/HeroDemo.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HeroDemo } from './HeroDemo';

test('renders name and email fields', () => {
  render(<HeroDemo />);
  expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
});

test('email field is disabled until name is entered', async () => {
  const user = userEvent.setup();
  render(<HeroDemo />);
  const email = screen.getByLabelText(/email/i);
  expect(email).toBeDisabled();
  await user.type(screen.getByLabelText(/name/i), 'Alice');
  expect(email).toBeEnabled();
});
```

- [ ] **Step 2: Run test — expect it to fail**

```bash
nvm use 20 && pnpm --filter docs test
```

Expected: FAIL — `Cannot find module './HeroDemo'`.

- [ ] **Step 3: Write `HeroDemo.tsx`**

```tsx
// apps/docs/src/components/HeroDemo.tsx
import { useState } from 'react';
import Enforma, { type FormValues, registerComponents } from 'enforma';
import muiComponents from 'enforma-mui';

registerComponents(muiComponents, { variant: 'outlined' });

export function HeroDemo() {
  const [values, setValues] = useState<FormValues>({});

  return (
    <Enforma.Form values={values} onChange={setValues}>
      <Enforma.TextInput
        bind="name"
        label="Name"
        placeholder="Your name"
      />
      <Enforma.TextInput
        bind="email"
        label="Email"
        placeholder="your@email.com"
        disabled={({ name }) => !name}
      />
      <button type="submit" style={{ marginTop: '0.5rem' }}>
        Submit
      </button>
    </Enforma.Form>
  );
}
```

- [ ] **Step 4: Run test — expect it to pass**

```bash
nvm use 20 && pnpm --filter docs test
```

Expected: PASS — both tests green.

- [ ] **Step 5: Remove `--passWithNoTests` from the `test` script in `apps/docs/package.json`**

Change `"test": "vitest run --passWithNoTests"` to `"test": "vitest run"`.

- [ ] **Step 6: Verify lint passes on the new files**

```bash
nvm use 20 && pnpm --filter docs lint
```

Expected: No ESLint errors or warnings.

- [ ] **Step 7: Commit**

```bash
git add apps/docs/src/components/ apps/docs/package.json
git commit -m "feat(docs): add HeroDemo React island with tests"
```

---

### Task 6: Custom homepage (`index.astro`)

**Files:**
- Create: `apps/docs/src/pages/index.astro`

- [ ] **Step 1: Create the pages directory and `index.astro`**

```bash
mkdir -p apps/docs/src/pages
```

```astro
---
// apps/docs/src/pages/index.astro
import { HeroDemo } from '../components/HeroDemo';
import { Code } from '@astrojs/starlight/components';

// This string is intentionally hardcoded and kept in sync with HeroDemo.tsx manually.
// The demo is small and stable — update this if HeroDemo changes.
const heroCode = `
<Enforma.Form values={values} onChange={setValues}>
  <Enforma.TextInput
    bind="name"
    label="Name"
    placeholder="Your name"
  />
  <Enforma.TextInput
    bind="email"
    label="Email"
    placeholder="your@email.com"
    disabled={({ name }) => !name}
  />
  <button type="submit">Submit</button>
</Enforma.Form>
`.trim();
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Enforma — Healthy forms for React</title>
    <link rel="icon" type="image/svg+xml" href="/enforma/enforma-logo.svg" />
    <style>
      *, *::before, *::after { box-sizing: border-box; }

      body {
        margin: 0;
        font-family: system-ui, -apple-system, sans-serif;
        background: #f9f9fb;
        color: #111;
      }

      /* ── Header ── */
      .site-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem 2rem;
        background: #fff;
        border-bottom: 1px solid #e8e8e8;
      }
      .site-header img { height: 2rem; }
      .site-header nav a {
        margin-left: 1.5rem;
        text-decoration: none;
        color: #555;
        font-size: 0.9rem;
      }
      .site-header nav a:hover { color: #890079; }

      /* ── Hero ── */
      .hero {
        max-width: 1100px;
        margin: 4rem auto;
        padding: 0 2rem;
      }
      .hero-headline {
        text-align: center;
        margin-bottom: 2.5rem;
      }
      .hero-headline h1 {
        font-size: clamp(2rem, 5vw, 3.5rem);
        font-weight: 700;
        margin: 0 0 0.75rem;
        background: linear-gradient(135deg, hsl(340,96%,57%), hsl(306,100%,34%));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .hero-headline p {
        font-size: 1.15rem;
        color: #555;
        margin: 0;
      }

      .hero-card {
        display: grid;
        grid-template-columns: 1fr 1fr;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 32px rgba(0,0,0,0.10);
      }
      @media (max-width: 700px) {
        .hero-card { grid-template-columns: 1fr; }
      }
      .hero-left {
        background: #fff;
        padding: 2.5rem;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .hero-right {
        background: #1a1a2e;
        padding: 2.5rem;
        overflow: auto;
      }
      .hero-right pre { margin: 0; font-size: 0.85rem; line-height: 1.6; }

      .hero-ctas {
        display: flex;
        gap: 1rem;
        justify-content: center;
        margin-top: 2rem;
      }
      .btn {
        display: inline-block;
        padding: 0.65rem 1.5rem;
        border-radius: 6px;
        text-decoration: none;
        font-size: 0.95rem;
        font-weight: 600;
        transition: opacity 0.15s;
      }
      .btn:hover { opacity: 0.85; }
      .btn-primary {
        background: linear-gradient(135deg, hsl(340,96%,57%), hsl(306,100%,34%));
        color: #fff;
      }
      .btn-outline {
        border: 2px solid #890079;
        color: #890079;
      }

      /* ── Features ── */
      .features {
        max-width: 1100px;
        margin: 4rem auto;
        padding: 0 2rem;
      }
      .features-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 1.5rem;
      }
      .feature-card {
        background: #fff;
        border-radius: 10px;
        padding: 1.5rem;
        box-shadow: 0 2px 12px rgba(0,0,0,0.06);
      }
      .feature-icon { font-size: 1.75rem; margin-bottom: 0.75rem; }
      .feature-card h3 { margin: 0 0 0.5rem; font-size: 1rem; }
      .feature-card p { margin: 0; color: #666; font-size: 0.9rem; line-height: 1.5; }

      /* ── Footer ── */
      footer {
        text-align: center;
        padding: 2rem;
        color: #888;
        font-size: 0.85rem;
        border-top: 1px solid #e8e8e8;
        margin-top: 4rem;
      }
      footer a { color: #890079; text-decoration: none; }
    </style>
  </head>
  <body>
    <header class="site-header">
      <img src="/enforma/enforma-logo.svg" alt="Enforma" />
      <nav>
        <a href="/enforma/docs/installation">Docs</a>
        <a href="https://github.com/jacarma/enforma" target="_blank" rel="noreferrer">GitHub</a>
      </nav>
    </header>

    <section class="hero">
      <div class="hero-headline">
        <h1>Healthy forms for React</h1>
        <p>Write only your business logic — Enforma handles the rest.</p>
      </div>

      <div class="hero-card">
        <div class="hero-left">
          <!-- client:load hydrates HeroDemo as an interactive React island -->
          <HeroDemo client:load />
        </div>
        <div class="hero-right">
          <Code code={heroCode} lang="tsx" theme="github-dark" />
        </div>
      </div>

      <div class="hero-ctas">
        <a class="btn btn-primary" href="/enforma/docs/installation">Get started</a>
        <a class="btn btn-outline" href="https://github.com/jacarma/enforma" target="_blank" rel="noreferrer">View on GitHub</a>
      </div>
    </section>

    <section class="features">
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon">✍️</div>
          <h3>Only write what's yours</h3>
          <p>No state management, no touched/error tracking, no blur handlers. Declare your fields and logic — Enforma handles the plumbing.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🎨</div>
          <h3>UI library agnostic</h3>
          <p>Swap MUI for shadcn or build your own components — your form logic is untouched.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">⚡</div>
          <h3>Reactive attributes</h3>
          <p><code>disabled</code>, <code>label</code>, <code>placeholder</code> accept functions that respond to live form state.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🚀</div>
          <h3>High performance</h3>
          <p>Each field re-renders only when its own value changes, powered by <code>useSyncExternalStore</code>.</p>
        </div>
      </div>
    </section>

    <footer>
      <p>MIT License · <a href="https://github.com/jacarma/enforma" target="_blank" rel="noreferrer">GitHub</a></p>
    </footer>
  </body>
</html>
```

- [ ] **Step 2: Verify the build passes**

```bash
nvm use 20 && pnpm --filter './packages/*' build && pnpm --filter docs build
```

Expected: Both package builds and docs build complete with no errors.

- [ ] **Step 3: Verify homepage locally**

```bash
nvm use 20 && pnpm --filter docs dev
```

Open `http://localhost:4321/enforma/` and verify:
- Header with logo and nav links renders
- Hero headline with gradient text is visible
- Left panel: rendered MUI outlined-variant form with Name + Email fields
- Email field is disabled until Name has a value — type a name to verify email unlocks
- Right panel: syntax-highlighted JSX on dark background matches what HeroDemo renders
- "Get started" and "View on GitHub" CTA buttons render below the card
- 4 feature cards render in a row
- Footer is visible

- [ ] **Step 4: Commit**

```bash
git add apps/docs/src/pages/
git commit -m "feat(docs): add homepage with split-card hero and features strip"
```

---

## Chunk 3: GitHub Actions Deployment

### Task 7: GitHub Actions workflow + GitHub Pages setup

**Files:**
- Create: `.github/workflows/docs.yml`

- [ ] **Step 1: Create the `.github/workflows/` directory if it does not exist**

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: Create the workflow file**

The workflow builds both workspace packages before the docs build, because `apps/docs` imports `enforma` and `enforma-mui` via `workspace:*` and Astro resolves them from their compiled `dist/` output.

```yaml
# .github/workflows/docs.yml
name: Deploy docs to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install pnpm via Corepack
        run: corepack enable && corepack prepare pnpm@9 --activate

      - name: Install dependencies
        run: pnpm install

      - name: Build workspace packages
        run: pnpm --filter './packages/*' build

      - name: Build docs
        run: pnpm --filter docs build

      - uses: actions/upload-pages-artifact@v3
        with:
          path: apps/docs/dist

      - uses: actions/deploy-pages@v4
        id: deployment
```

- [ ] **Step 3: Enable GitHub Pages in the repository settings (manual, one-time)**

Do this in the GitHub web UI **before pushing**:
1. Navigate to `https://github.com/jacarma/enforma/settings/pages`
2. Under "Build and deployment" → Source → select **GitHub Actions**
3. Save

Without this step, the `deploy-pages` action will fail with "Pages not enabled".

- [ ] **Step 4: Commit and push**

```bash
git add .github/workflows/docs.yml
git commit -m "ci: deploy docs to GitHub Pages on push to main"
git push
```

- [ ] **Step 5: Verify deployment**

1. Go to `https://github.com/jacarma/enforma/actions`
2. Watch the "Deploy docs to GitHub Pages" workflow — all steps should be green
3. Open `https://jacarma.github.io/enforma/` — the homepage loads
4. Click "Docs" in the header — navigates to `/enforma/docs/installation/`
5. Verify the Starlight sidebar shows all 5 groups with correct labels

---

## Final verification

- [ ] Run full monorepo checks from the monorepo root:

```bash
nvm use 20 && pnpm lint && pnpm typecheck && pnpm test
```

Expected: All pass with no errors or warnings.

The scaffold is live at `https://jacarma.github.io/enforma/`. All 25 stub pages show "Coming soon." Proceed to `2026-03-11-docs-site-content.md` to write the actual documentation.
