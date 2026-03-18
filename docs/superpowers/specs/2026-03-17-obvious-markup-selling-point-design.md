# Obvious Markup — Selling Point Design

**Date:** 2026-03-17
**Status:** Approved

## Problem

Enforma's key differentiator — that a single component renders a complete, accessible field (wrapper, label, input, error message, description, aria) — is not surfaced in the README or docs homepage. The current "Why Enforma" section covers state management elimination and UI library portability, but not the fact that adapters remove the need to understand library-specific form control structure.

## Goal

Add "Obvious markup" as a third selling point in the two READMEs and the docs homepage feature grid.

## Wording

> **Obvious markup.** A single `<TextInput>` renders the wrapper, label, input, error message, description, and aria — exactly as your UI library expects.

## Changes

### 1. `README.md` (monorepo root)

Add as the second bullet in "Why Enforma", between "Only write what's yours" and "Your form logic doesn't change when your UI does":

```md
**Obvious markup.** A single `<TextInput>` renders the wrapper, label, input, error message, description, and aria — exactly as your UI library expects.
```

### 2. `packages/enforma/README.md`

Same bullet in the same position. This is the npm-facing README — highest traffic location.

### 3. `apps/docs/src/pages/index.astro`

Replace the existing "UI library agnostic" card (second card in the grid) with:

```html
<div class="feature-card">
  <div class="feature-icon" aria-hidden="true">🧩</div>
  <h3>Obvious markup</h3>
  <p>A single <code>&lt;TextInput&gt;</code> renders the wrapper, label, input, error message, description, and aria — exactly as your UI library expects.</p>
</div>
```

The "UI library agnostic" card is removed — the new card subsumes its meaning, and portability is still covered by the third README bullet.

## Non-goals

- No changes to component behaviour or API
- No new documentation pages
- The `## Features` bullet lists in both READMEs retain "UI library agnostic" — no change needed there
- The docs homepage does not need a portability card; the portability point lives in the README third bullet only
