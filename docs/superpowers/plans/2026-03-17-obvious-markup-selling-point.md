# Obvious Markup Selling Point Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Obvious markup" as a third selling point bullet in both READMEs and replace the "UI library agnostic" feature card on the docs homepage.

**Architecture:** Pure content edits — three files, no logic changes, no tests required. Each file is edited independently and committed separately.

**Tech Stack:** Markdown, Astro (HTML in .astro file)

**Spec:** `docs/superpowers/specs/2026-03-17-obvious-markup-selling-point-design.md`

---

## Chunk 1: README updates

### Task 1: Root README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add the new bullet**

Open `README.md`. In the `## Why Enforma` section, insert the new bullet between the two existing ones so the section reads:

```markdown
## Why Enforma

**Only write what's yours.** No state management, no touched/error tracking, no blur handlers. Declare your fields, validations, and submit logic — enforma handles the plumbing.

**Obvious markup.** A single `<TextInput>` renders the wrapper, label, input, error message, description, and aria — exactly as your UI library expects.

**Your form logic doesn't change when your UI does.** Switch to a different component library later — your form code is untouched.
```

- [ ] **Step 2: Verify**

Read the file and confirm the three bullets are present in the correct order with no extra blank lines or formatting issues.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add 'Obvious markup' selling point to root README"
```

---

### Task 2: Package README

**Files:**
- Modify: `packages/enforma/README.md`

- [ ] **Step 1: Add the new bullet**

Open `packages/enforma/README.md`. In the `## Why Enforma` section, insert the same bullet between the two existing ones:

```markdown
## Why Enforma

**Only write what's yours.** No state management, no touched/error tracking, no blur handlers. Declare your fields, validations, and submit logic — enforma handles the plumbing.

**Obvious markup.** A single `<TextInput>` renders the wrapper, label, input, error message, description, and aria — exactly as your UI library expects.

**Your form logic doesn't change when your UI does.** Switch to a different component library later — your form code is untouched.
```

- [ ] **Step 2: Verify**

Read the file and confirm the three bullets are present in the correct order.

- [ ] **Step 3: Commit**

```bash
git add packages/enforma/README.md
git commit -m "docs: add 'Obvious markup' selling point to package README"
```

---

## Chunk 2: Docs homepage update

### Task 3: Docs homepage feature card

**Files:**
- Modify: `apps/docs/src/pages/index.astro`

- [ ] **Step 1: Replace the card**

Open `apps/docs/src/pages/index.astro`. Find the "UI library agnostic" feature card (the second card in `<div class="features-grid">`):

```html
<div class="feature-card">
  <div class="feature-icon" aria-hidden="true">🎨</div>
  <h3>UI library agnostic</h3>
  <p>Swap MUI for shadcn or build your own components — your form logic is untouched.</p>
</div>
```

Replace it with:

```html
<div class="feature-card">
  <div class="feature-icon" aria-hidden="true">🧩</div>
  <h3>Obvious markup</h3>
  <p>A single <code>&lt;TextInput&gt;</code> renders the wrapper, label, input, error message, description, and aria — exactly as your UI library expects.</p>
</div>
```

- [ ] **Step 2: Verify**

Read the file and confirm:
- The "UI library agnostic" card is gone
- The "Obvious markup" card is now second in the grid
- The four cards in order are: "Only write what's yours", "Obvious markup", "Reactive attributes", "High performance"

- [ ] **Step 3: Commit**

```bash
git add apps/docs/src/pages/index.astro
git commit -m "docs: replace 'UI library agnostic' card with 'Obvious markup' on homepage"
```
