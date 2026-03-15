# DX Improvements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three DX issues found in user testing: README adapter rabbit hole, optional `values`/`onChange` on `Form`, and `submitDisabled` helper for TypeScript inference.

**Architecture:** Independent changes — a new `helpers.ts` file for the runtime helper, targeted edits to `Form.tsx` for uncontrolled mode, and README prose edits. No cross-task dependencies; tasks can proceed in order.

**Tech Stack:** TypeScript strict, React 18, Vitest + @testing-library/react, pnpm workspaces

---

## Chunk 1: `submitDisabled` helper

### Task 1: Create `helpers.ts` with `submitDisabled`

**Files:**
- Create: `packages/enforma/src/components/helpers.ts`
- Modify: `packages/enforma/src/index.ts`
- Test: `packages/enforma/src/components/helpers.test.ts` (new file)

**Context:** `types.ts` is types-only. Runtime value exports live in `helpers.ts` (convention established here). `SubmitDisabledFn` is already exported from `index.ts` as a type — adding a same-named value export is fine in TypeScript (one is a type, one is a value).

- [ ] **Step 1: Write the failing test**

Create `packages/enforma/src/components/helpers.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { submitDisabled } from './helpers';
import type { SubmitDisabledFn } from './types';

describe('submitDisabled', () => {
  it('returns the same function unchanged', () => {
    const fn: SubmitDisabledFn = (_, __, { formValid }) => !formValid;
    expect(submitDisabled(fn)).toBe(fn);
  });

  it('infers parameter types without explicit annotation', () => {
    // This must compile without importing SubmitDisabledFn.
    // If TypeScript errors here, the helper is not working.
    const fn = submitDisabled((_, __, { formValid }) => !formValid);
    expect(typeof fn).toBe('function');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
nvm use 20 && pnpm --filter enforma test -- helpers.test
```

Expected: FAIL — `Cannot find module './helpers'`

- [ ] **Step 3: Create `helpers.ts`**

Create `packages/enforma/src/components/helpers.ts`:

```typescript
import type { SubmitDisabledFn } from './types';

export function submitDisabled(fn: SubmitDisabledFn): SubmitDisabledFn {
  return fn;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
nvm use 20 && pnpm --filter enforma test -- helpers.test
```

Expected: PASS (2 tests)

- [ ] **Step 5: Export from `index.ts`**

In `packages/enforma/src/index.ts`, add after the last `export` line (line 95):

```typescript
export { submitDisabled } from './components/helpers';
```

- [ ] **Step 6: Verify lint and typecheck pass**

```bash
nvm use 20 && pnpm --filter enforma lint && pnpm --filter enforma typecheck
```

Expected: no errors or warnings

- [ ] **Step 7: Commit**

```bash
git add packages/enforma/src/components/helpers.ts \
        packages/enforma/src/components/helpers.test.ts \
        packages/enforma/src/index.ts
git commit -m "feat(enforma): add submitDisabled helper for TypeScript inference"
```

---

## Chunk 2: Uncontrolled form mode

### Task 2: Make `values` and `onChange` optional in `Form`

**Files:**
- Modify: `packages/enforma/src/components/Form.tsx`
- Modify: `packages/enforma/src/components/Form.test.tsx`

**Context:** Read `packages/enforma/src/components/Form.tsx` before editing. Key lines:
- Line 14–23: `FormProps` type — change `values` and `onChange` to optional
- Line 35–36: `onChangeRef` — needs explicit type annotation to accommodate `undefined` across renders
- Line 43: `new FormStore(values)` — must pass `values ?? {}`
- Line 44–49: store subscription callback — guard `onChangeRef.current` call with `?.`

The `FormStore` constructor accepts `FormValues` (which is `Record<string, unknown>`). Passing `{}` when `values` is absent is correct.

- [ ] **Step 1: Write the failing tests**

Add to `packages/enforma/src/components/Form.test.tsx`, inside the top-level `describe('Form', ...)` block, after the existing tests:

```typescript
describe('uncontrolled mode (values and onChange omitted)', () => {
  it('renders without values or onChange props', () => {
    render(<Form>{null}</Form>);
    expect(screen.getByRole('form')).toBeInTheDocument();
  });

  it('initializes store to empty object when values is omitted', async () => {
    const onSubmit = vi.fn();
    render(
      <Form onSubmit={onSubmit}>
        <button type="submit">Submit</button>
      </Form>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onSubmit).toHaveBeenCalledWith({});
  });

  it('does not throw when a field changes and onChange is omitted', async () => {
    registerComponents({
      TextInput: ({ value, setValue, label }: ResolvedTextInputProps) => (
        <input
          aria-label={label}
          value={value ?? ''}
          onChange={(e) => { setValue(e.target.value); }}
        />
      ),
    });
    render(
      <Form>
        <TextInput bind="name" label="Name" />
      </Form>,
    );
    await userEvent.type(screen.getByLabelText('Name'), 'hello');
    // No assertion needed — test passes if no exception is thrown
  });

  it('does not call onChange when it is omitted and a field changes', async () => {
    // Verify the optional guard works: if onChange were called despite being undefined,
    // this test would throw "TypeError: undefined is not a function"
    registerComponents({
      TextInput: ({ value, setValue, label }: ResolvedTextInputProps) => (
        <input
          aria-label={label}
          value={value ?? ''}
          onChange={(e) => { setValue(e.target.value); }}
        />
      ),
    });
    // No onChange provided — the subscription must silently skip
    render(
      <Form>
        <TextInput bind="name" label="Name" />
      </Form>,
    );
    await expect(
      userEvent.type(screen.getByLabelText('Name'), 'hello'),
    ).resolves.toBeUndefined();
  });
});

describe('partial props (values only, or onChange only)', () => {
  it('accepts only values without onChange', () => {
    render(<Form values={{ name: 'Alice' }}>{null}</Form>);
    expect(screen.getByRole('form')).toBeInTheDocument();
  });

  it('accepts only onChange without values', async () => {
    const onChange = vi.fn();
    registerComponents({
      TextInput: ({ value, setValue, label }: ResolvedTextInputProps) => (
        <input
          aria-label={label}
          value={value ?? ''}
          onChange={(e) => { setValue(e.target.value); }}
        />
      ),
    });
    render(
      <Form onChange={onChange}>
        <TextInput bind="name" label="Name" />
      </Form>,
    );
    await userEvent.type(screen.getByLabelText('Name'), 'A');
    expect(onChange).toHaveBeenLastCalledWith(
      { name: 'A' },
      expect.objectContaining({ isValid: true }),
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
nvm use 20 && pnpm --filter enforma test -- Form.test
```

Expected: several FAIL — TypeScript compile errors about missing required props

- [ ] **Step 3: Update `Form.tsx`**

Make three targeted edits to `packages/enforma/src/components/Form.tsx`. Do not touch any other lines.

**Edit 1 — make `values` and `onChange` optional in `FormProps` (lines 15–16).**

Find:
```typescript
  values: FormValues;
  onChange: (values: FormValues, state: ValidationState) => void;
```
Replace with:
```typescript
  values?: FormValues;
  onChange?: (values: FormValues, state: ValidationState) => void;
```

**Edit 2 — add explicit type to `onChangeRef` and change store init to `values ?? {}` (lines 35–50).**

Find:
```typescript
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  const storeRef = useRef<FormStore | null>(null);
  if (storeRef.current === null) {
    const store = new FormStore(values);
    store.subscribe(() => {
      onChangeRef.current(store.getSnapshot(), {
        isValid: store.isValid(),
        errors: store.getErrors(),
      });
    });
    storeRef.current = store;
  }
```
Replace with:
```typescript
  const onChangeRef = useRef<((values: FormValues, state: ValidationState) => void) | undefined>(onChange);
  onChangeRef.current = onChange;

  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  const storeRef = useRef<FormStore | null>(null);
  if (storeRef.current === null) {
    const store = new FormStore(values ?? {});
    store.subscribe(() => {
      onChangeRef.current?.(store.getSnapshot(), {
        isValid: store.isValid(),
        errors: store.getErrors(),
      });
    });
    storeRef.current = store;
  }
```

No other lines in `Form.tsx` change.

- [ ] **Step 4: Run tests to verify they pass**

```bash
nvm use 20 && pnpm --filter enforma test -- Form.test
```

Expected: all tests PASS (new tests + existing tests)

- [ ] **Step 5: Verify lint and typecheck pass**

```bash
nvm use 20 && pnpm --filter enforma lint && pnpm --filter enforma typecheck
```

Expected: no errors or warnings

- [ ] **Step 6: Run full test suite**

```bash
nvm use 20 && pnpm test
```

Expected: all tests PASS

- [ ] **Step 7: Commit**

```bash
git add packages/enforma/src/components/Form.tsx \
        packages/enforma/src/components/Form.test.tsx
git commit -m "feat(enforma): make values and onChange optional (uncontrolled mode)"
```

---

## Chunk 3: README updates

### Task 3: Update `packages/enforma/README.md`

**Files:**
- Modify: `packages/enforma/README.md`

**Context:** Read the file before editing. Current state:
- "Why Enforma" section has "Enforma is a facade over your component library. Swap MUI for shadcn, or build your own components — your form code is untouched." — remove this adapter-framing sentence
- Usage example has `values={{}}` — drop it (now optional)
- "Custom components" section — rename to "Advanced" and add note it's for power users

- [ ] **Step 1: Edit `packages/enforma/README.md`**

**"Why Enforma" section** — remove the adapter sentence. Replace:
```
**Your form logic doesn't change when your UI does.** Enforma is a facade over your component library. Swap MUI for shadcn, or build your own components — your form code is untouched.
```
With:
```
**Your form logic doesn't change when your UI does.** Switch to a different component library later — your form code is untouched.
```

**Usage example** — remove `values={{}}` line:
```tsx
export function CheckoutForm() {
  return (
    <Enforma.Form
      onSubmit={(values) => fetch('/api/order', { method: 'POST', body: JSON.stringify(values) })}
    >
```

**"Custom components" section** — rename heading and add note:
```markdown
## Advanced

> For power users building custom components or integrations.

Use `useFieldProps` to build components that integrate with the form store:
```

**Add `submitDisabled` example** — add a new section after the Usage example, before Features:
```markdown
## Submit button

Use `submitDisabled` to control when the submit button is enabled based on form state:

```tsx
import Enforma, { submitDisabled } from 'enforma';

<Enforma.Submit disabled={submitDisabled((_, __, { formValid }) => !formValid)}>
  Place order
</Enforma.Submit>
```
```

- [ ] **Step 2: Verify no lint/typecheck regressions**

```bash
nvm use 20 && pnpm lint && pnpm typecheck
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add packages/enforma/README.md
git commit -m "docs(enforma): de-emphasize adapter architecture, add submitDisabled example, drop values={{}} from example"
```

---

### Task 4: Update root `README.md`

**Files:**
- Modify: `README.md`

**Context:** Read the file before editing. Current state:
- "Why Enforma" has adapter sentence — remove it
- Example is missing `registerComponents` — add a callout note below the example pointing to Setup
- Example has `values={{}}` — drop it (now optional)
- "Extending Enforma" section has "Publishing an adapter" — move to an "Advanced" subsection

- [ ] **Step 1: Edit root `README.md`**

**"Why Enforma" section** — same change as packages/enforma/README.md:

Replace:
```
**Your form logic doesn't change when your UI does.** Enforma is a facade over your component library. Swap MUI for shadcn, or build your own components — your form code is untouched.
```
With:
```
**Your form logic doesn't change when your UI does.** Switch to a different component library later — your form code is untouched.
```

**Example block** — drop `values={{}}` and add a Setup note below the code block:

```tsx
export function CheckoutForm() {
  return (
    <Enforma.Form
      onSubmit={(values) => fetch('/api/order', { method: 'POST', body: JSON.stringify(values) })}
    >
```

Add after the closing ` ``` ` of the example:
```
> **Note:** This example requires a component adapter. See [Installation](#installation) and [Setup](#setup) in the [enforma package README](packages/enforma/README.md).
```

**"Extending Enforma" section** — split into two subsections:

Replace the current section:
```markdown
## Extending Enforma

**Adding custom fields** — Use `useFieldProps` and `useListState` to build your own components that integrate with the form store. [Custom components guide →](docs/custom-components.md)

**Publishing an adapter** — For component library authors: wrap your library once and let your users plug it into enforma with a single call. [Adapter authoring guide →](docs/adapting.md)
```

With:
```markdown
## Extending Enforma

**Adding custom fields** — Use `useFieldProps` and `useListState` to build your own components that integrate with the form store. [Custom components guide →](docs/custom-components.md)

### Advanced

**Publishing an adapter** — For component library authors: wrap your library once and let your users plug it into enforma with a single call. [Adapter authoring guide →](docs/adapting.md)
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: de-emphasize adapter architecture, add setup note to root example"
```

---

## Final verification

- [ ] **Run full test suite and checks**

```bash
nvm use 20 && pnpm test && pnpm lint && pnpm typecheck
```

Expected: all pass with no errors or warnings
