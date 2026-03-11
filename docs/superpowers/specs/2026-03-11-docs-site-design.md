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
├── public/                   # Static assets (favicon, og image)
└── src/
    ├── pages/
    │   └── index.astro       # Custom landing page (homepage)
    ├── content/
    │   └── docs/             # Starlight MDX pages
    │       ├── getting-started.mdx
    │       ├── concepts/
    │       │   ├── reactive-props.mdx
    │       │   ├── validation.mdx
    │       │   └── datasources.mdx
    │       ├── components/
    │       │   ├── text-input.mdx
    │       │   ├── select.mdx
    │       │   └── ...one per component
    │       └── guides/
    │           ├── custom-components.mdx
    │           └── adapters.mdx
    └── components/
        └── HeroDemo.tsx      # React island for the homepage split-card
```

Existing `docs/*.md` files (adapting.md, custom-components.md) are migrated into Starlight MDX content.

---

## Homepage (`src/pages/index.astro`)

Fully custom Astro page — no Starlight layout constraints.

### Hero — Split Card

Full-width card with two equal columns:

- **Left (white background)**: Live `<HeroDemo />` React island (`client:load`) — a small but real interactive form using `enforma` + `enforma-mui`. Shows a name field, an email field, and at least one reactive prop (e.g. email disabled until name is entered) to demonstrate the core value proposition.
- **Right (dark background)**: The equivalent JSX, syntax-highlighted with Shiki (Astro's built-in highlighter).

Above the card: headline ("Healthy forms for React") + one-line subheadline.

Below the card: two CTAs:
- "Get started" → `/docs/getting-started`
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

**Getting Started**
- Installation
- Quick start

**Concepts**
- Reactive props
- Validation
- Data sources
- Custom components
- Adapters

**Components**
- Form
- TextInput
- Textarea
- Select
- Checkbox / Switch
- RadioGroup
- Autocomplete
- ExclusiveToggle
- NumberInput
- DatePicker / TimePicker / DateTimePicker
- Fieldset
- List
- Calculated
- Output
- Scope

**Reference**
- API (exported hooks: `useFieldProps`, `useFormValue`, `useReactiveProp`, `useVisibility`, `useListState`, `useDataSource`)

Closely related components (Checkbox/Switch, date pickers) share a single page. Components not yet implemented are omitted.

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
"Open in StackBlitz" link.

## Props
Table: Prop | Type | Default | Description
Links to the shared CommonProps reference rather than repeating the 9 common props on every page.

## Examples
2–4 focused examples with heading + code snippet + "Open in StackBlitz" link.
e.g. "With validation", "Reactive label", "With datasource"

## Notes (optional)
Edge cases, gotchas, integration-specific notes.
```

`CommonProps` (`bind`, `label`, `placeholder`, `disabled`, `hidden`, `removed`, `validate`, `required`, `description`) are documented once in the Reference section; component pages link to it.

---

## Deployment

### GitHub Actions

Workflow at `.github/workflows/docs.yml`:

- **Trigger**: push to `main`
- **Steps**: checkout → `actions/setup-node@v4` (Node 20) → `pnpm install` → `pnpm --filter docs build` → deploy via `actions/deploy-pages`
- **Permissions**: `pages: write`, `id-token: write`

### GitHub Pages

- Configured to deploy from Actions (not a `gh-pages` branch)
- Live URL: `https://jacarma.github.io/enforma/`
- `astro.config.mjs` sets `base: '/enforma/'` so internal links resolve correctly

---

## Out of Scope (for now)

- Auto-generated prop tables from TypeScript types (tracked in todo.md)
- Custom domain
- Versioned docs
- Dark/light theme toggle on the homepage (Starlight handles it in docs)
