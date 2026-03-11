# Docs Site Design — 2026-03-11

## Overview

A public documentation site for the Enforma monorepo, hosted on GitHub Pages and generated with Astro + Starlight. The site has two distinct areas: a custom marketing homepage and a Starlight-powered docs section.

---

## Project Structure

New pnpm workspace app at `apps/docs`:

```
apps/docs/
├── astro.config.mjs          # Starlight integration + sidebar config
├── package.json
├── tsconfig.json             # Must enable strict mode to match monorepo standard
├── public/                   # Static assets (favicon, og image)
└── src/
    ├── pages/
    │   └── index.astro       # Custom landing page (homepage)
    ├── content/
    │   └── docs/             # Starlight MDX pages
    │       ├── installation.mdx
    │       ├── quick-start.mdx
    │       ├── concepts/
    │       │   ├── reactive-props.mdx
    │       │   ├── validation.mdx
    │       │   └── datasources.mdx
    │       ├── components/
    │       │   ├── form.mdx
    │       │   ├── text-input.mdx
    │       │   ├── textarea.mdx
    │       │   ├── select.mdx
    │       │   ├── checkbox-switch.mdx     # Checkbox and Switch share one page
    │       │   ├── radio-group.mdx
    │       │   ├── autocomplete.mdx
    │       │   ├── exclusive-toggle.mdx
    │       │   ├── number-input.mdx
    │       │   ├── date-time.mdx           # DatePicker, TimePicker, DateTimePicker share one page
    │       │   ├── fieldset.mdx
    │       │   ├── list.mdx
    │       │   ├── calculated.mdx
    │       │   ├── output.mdx
    │       │   └── scope.mdx
    │       ├── guides/
    │       │   ├── custom-components.mdx   # migrated from docs/custom-components.md
    │       │   ├── adapters.mdx            # migrated from docs/adapting.md
    │       │   └── plain-react-comparison.mdx  # migrated from docs/plain-react-comparison.md
    │       └── reference/
    │           ├── common-props.mdx
    │           └── api.mdx
    └── components/
        └── HeroDemo.tsx      # React island for the homepage split-card
```

### Dependencies

`apps/docs/package.json` depends on:
- `astro`, `@astrojs/starlight`, `@astrojs/react` — framework
- `enforma` and `enforma-mui` as workspace packages (`workspace:*`)
- `@mui/material`, `@emotion/react`, `@emotion/styled` — required by enforma-mui

`HeroDemo.tsx` uses only `TextInput` and basic enforma-mui setup — no DatePicker, no masked input. Therefore `@mui/x-date-pickers`, `imask`, and `react-imask` are **not** required in `apps/docs`.

---

## Homepage (`src/pages/index.astro`)

Fully custom Astro page — no Starlight layout constraints. Astro + Starlight supports a custom `src/pages/index.astro` alongside Starlight's `/docs/` routes without conflict; Starlight does not claim the root route by default.

### Hero — Split Card

Full-width card with two equal columns:

- **Left (white background)**: Live `<HeroDemo />` React island (`client:load`) — a small but real interactive form using `enforma` + `enforma-mui`. Shows a name field, an email field, and a reactive prop (email disabled until name is entered) to demonstrate the core value proposition.
- **Right (dark background)**: The equivalent JSX as a **hardcoded static string**, syntax-highlighted with Shiki via Astro's built-in `Code` component. If `HeroDemo.tsx` changes, the code string in `index.astro` is updated manually — the demo is intentionally kept small and stable so this is acceptable.

Above the card: headline ("Healthy forms for React") + one-line subheadline.

Below the card: two CTAs:
- "Get started" → `/docs/installation`
- "View on GitHub" → GitHub repo

### Features Strip

4 cards in a row, each with icon + title + one-sentence description:

1. **Only write what's yours** — No state management, no touched/error tracking, no blur handlers.
2. **UI library agnostic** — Swap MUI for shadcn or build your own components — form logic is untouched.
3. **Reactive attributes** — `disabled`, `label`, `placeholder` accept functions that respond to live form state.
4. **High performance** — Each field re-renders only when its own value changes, powered by `useSyncExternalStore`.

### Footer

Minimal: MIT license + GitHub link.

---

## Docs Section (`/docs/**`)

Starlight handles all routing, layout, search, and theming under `/docs/`.

### Sidebar Navigation

Configured in `astro.config.mjs`. Each sidebar item maps directly to an MDX file.

**Getting Started**
- Installation → `/docs/installation`
- Quick start → `/docs/quick-start`

**Concepts**
- Reactive props → `/docs/concepts/reactive-props`
- Validation → `/docs/concepts/validation`
- Data sources → `/docs/concepts/datasources`

**Components**
- Form → `/docs/components/form`
- TextInput → `/docs/components/text-input`
- Textarea → `/docs/components/textarea`
- Select → `/docs/components/select`
- Checkbox & Switch → `/docs/components/checkbox-switch` *(single page, both components)*
- RadioGroup → `/docs/components/radio-group`
- Autocomplete → `/docs/components/autocomplete`
- ExclusiveToggle → `/docs/components/exclusive-toggle`
- NumberInput → `/docs/components/number-input`
- Date & Time → `/docs/components/date-time` *(single page: DatePicker, TimePicker, DateTimePicker)*
- Fieldset → `/docs/components/fieldset`
- List → `/docs/components/list`
- Calculated → `/docs/components/calculated`
- Output → `/docs/components/output`
- Scope → `/docs/components/scope`

**Guides**
- Custom components → `/docs/guides/custom-components`
- Adapters → `/docs/guides/adapters`
- Plain React comparison → `/docs/guides/plain-react-comparison`

**Reference**
- CommonProps → `/docs/reference/common-props`
- API → `/docs/reference/api`

### Reference: API page

Documents all public hook exports: `useFieldProps`, `useFormValue`, `useReactiveProp`, `useVisibility`, `useFieldValidation`, `useListState`, `useDataSource`. All are public exports and all are documented.

### Component Page Template

Each component page follows this structure:

```mdx
---
title: ComponentName
description: One-sentence description
---

## Overview
One paragraph: what it does, when to use it.

## Usage
Minimal code snippet for the most basic case.
"Open in StackBlitz" link (see StackBlitz section below).

## Props
Table: Prop | Type | Default | Description
Covers component-specific props only. Links to [CommonProps](/docs/reference/common-props)
for the shared props (bind, label, placeholder, disabled, hidden, removed, validate, required, description).

## Examples
2–4 focused examples with heading + code snippet + "Open in StackBlitz" link.
e.g. "With validation", "Reactive label", "With datasource"

## Notes (optional)
Edge cases, gotchas, integration-specific notes.
```

`CommonProps` are documented once at `/docs/reference/common-props`; component pages link to it rather than repeating the 9 rows on every page.

### StackBlitz Links

Each "Open in StackBlitz" link is a **static URL** to a manually maintained StackBlitz project. The workflow:

1. A single base StackBlitz project with `enforma` + `enforma-mui` pre-installed serves as the template.
2. Each example is a separate StackBlitz project created once and linked as a static `https://stackblitz.com/...` URL in the MDX.
3. Links are manually updated if the API changes. Auto-generation is out of scope for now.

---

## Deployment

### GitHub Actions

Workflow at `.github/workflows/docs.yml`:

```yaml
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
      - run: corepack enable && corepack prepare pnpm@latest --activate
      - run: pnpm install
      - run: pnpm --filter docs build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: apps/docs/dist
      - uses: actions/deploy-pages@v4
        id: deployment
```

`corepack enable && corepack prepare pnpm@latest --activate` installs pnpm via Corepack, respecting the `packageManager` field in `package.json` if present, rather than pulling an arbitrary version via `npm install -g pnpm`.

### GitHub Pages

- Configured to deploy from Actions (not a `gh-pages` branch)
- Live URL: `https://jacarma.github.io/enforma/`
- `astro.config.mjs` sets `site: 'https://jacarma.github.io'` and `base: '/enforma/'` so internal links resolve correctly under the subpath

---

## Out of Scope (for now)

- Auto-generated prop tables from TypeScript types (tracked in todo.md)
- Custom domain
- Versioned docs
- Dark/light theme toggle on the homepage (Starlight handles it in docs)
