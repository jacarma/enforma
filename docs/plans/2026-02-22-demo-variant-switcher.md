# Demo Variant Switcher Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `<select>` control to the demo app that switches all forms between `classic`, `outlined`, and `standard` MUI variants at runtime.

**Architecture:** React `useState` tracks the active variant. The handler calls `registerComponents` with the matching bundle then sets state — the re-render causes all `Form` instances to call `getComponent('FormWrap')` and pick up the new provider. Form values are preserved. Module-level `registerComponents(classic)` handles initialization (unchanged pattern).

**Tech Stack:** TypeScript strict, React 18, enforma, enforma-mui, Vite demo app. No tests in the demo app — verify with lint only.

---

### Task 1: Add variant switcher to App.tsx

**Files:**
- Modify: `apps/demo/src/App.tsx`

This is a single-file change. There are no tests for the demo app, so we skip straight to implementation, lint, and commit.

**Step 1: Update imports**

Open `apps/demo/src/App.tsx`. Replace line 4:

```ts
import { classic } from 'enforma-mui';
```

With:

```ts
import { classic, outlined, standard } from 'enforma-mui';
```

**Step 2: Add bundleMap constant**

After the import block (before `registerComponents(classic)`), add:

```ts
const bundleMap = { classic, outlined, standard } as const;
type VariantKey = keyof typeof bundleMap;
```

**Step 3: Add variant state inside App**

Inside `export function App()`, add this line alongside the other `useState` declarations:

```ts
const [variant, setVariant] = useState<VariantKey>('classic');
```

**Step 4: Add the variant change handler**

Inside `App`, add this handler before the `return`:

```ts
const handleVariantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
  const v = e.target.value as VariantKey;
  registerComponents(bundleMap[v]);
  setVariant(v);
};
```

**Step 5: Add the `<select>` control to the JSX**

Directly after `<h1>Enforma Demo</h1>`, add:

```tsx
<div style={{ marginBottom: '1.5rem' }}>
  <label htmlFor="variant-select" style={{ marginRight: '0.5rem' }}>
    Variant:
  </label>
  <select id="variant-select" value={variant} onChange={handleVariantChange}>
    <option value="classic">Classic</option>
    <option value="outlined">MUI Outline</option>
    <option value="standard">MUI Default</option>
  </select>
</div>
```

**Step 6: Run lint**

```bash
pnpm --filter demo lint
```

Expected: exits 0.

**Step 7: Commit**

```bash
git add apps/demo/src/App.tsx
git commit -m "feat: add variant switcher to demo app"
```
