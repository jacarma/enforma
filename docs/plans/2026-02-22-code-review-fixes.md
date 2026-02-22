# Code Review Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all non-joy issues identified in the code review: broken lint/typecheck gates, bad React list keys, mutable registry test isolation, MUI TextInput accessibility bug, duplicate file comment, and README noise.

**Architecture:** Seven independent fixes applied smallest-first. Each fix is verified before moving to the next. No refactoring beyond what is required to fix the identified issue.

**Tech Stack:** TypeScript strict, Vite (library + bundler mode), Vitest + @testing-library/react, MUI v6, ESLint 9 flat config with typescript-eslint strict-type-checked, pnpm workspaces.

---

### Task 1: Fix `pnpm lint` and `pnpm typecheck` for the demo app

The demo app imports `enforma-mui` but TypeScript cannot resolve it: `enforma-mui` has no built `dist/` folder, so `"types": "./dist/index.d.ts"` in its `package.json` points to a file that does not exist. The Vite alias resolves the module for bundling but TypeScript's type-checker ignores Vite aliases. The fix is a `paths` entry in `apps/demo/tsconfig.json` that mirrors the Vite alias.

**Files:**
- Modify: `apps/demo/tsconfig.json`

**Step 1: Add paths to tsconfig**

Open `apps/demo/tsconfig.json`. It currently has no `paths` entry. Add one:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "skipLibCheck": true,
    "paths": {
      "enforma-mui": ["../../packages/enforma-mui/src/index.ts"]
    }
  },
  "include": ["src"]
}
```

**Step 2: Run typecheck**

```bash
cd /path/to/enforma && pnpm --filter demo typecheck
```
Expected: exits 0, no errors.

**Step 3: Run lint**

```bash
pnpm --filter demo lint
```
Expected: exits 0, no errors or warnings.

**Step 4: Run full lint + typecheck suite**

```bash
pnpm lint && pnpm typecheck
```
Expected: both pass with no errors.

**Step 5: Commit**

```bash
git add apps/demo/tsconfig.json
git commit -m "fix: add paths alias for enforma-mui in demo tsconfig"
```

---

### Task 2: Remove duplicate file-header comment from `List.tsx`

`List.tsx` has the same comment on lines 1 and 2. Remove one.

**Files:**
- Modify: `packages/enforma/src/components/List.tsx`

**Step 1: Delete the duplicate line**

File currently starts with:
```
// packages/enforma/src/components/List.tsx
// packages/enforma/src/components/List.tsx
import { type ReactNode } from 'react';
```

Change to:
```
// packages/enforma/src/components/List.tsx
import { type ReactNode } from 'react';
```

**Step 2: Run tests to confirm nothing broken**

```bash
pnpm --filter enforma test
```
Expected: all tests pass.

**Step 3: Commit**

```bash
git add packages/enforma/src/components/List.tsx
git commit -m "chore: remove duplicate comment in List.tsx"
```

---

### Task 3: Delete `README-PRETTIER.md`

This file documents Prettier integration but duplicates what `.prettierrc` and `.prettierignore` already communicate. It will go stale and adds noise to the project root.

**Files:**
- Delete: `README-PRETTIER.md`

**Step 1: Delete the file**

```bash
rm README-PRETTIER.md
```

**Step 2: Verify lint still passes**

```bash
pnpm lint
```
Expected: exits 0.

**Step 3: Commit**

```bash
git add -A README-PRETTIER.md
git commit -m "chore: remove README-PRETTIER.md"
```

---

### Task 4: Add `clearRegistry` to the component registry and fix test isolation

`registry.ts` holds module-level mutable state. A `registerComponents` call in one test persists into subsequent tests in the same process. The fix: export a `clearRegistry` function and call it in every test setup's `afterEach`.

**Files:**
- Modify: `packages/enforma/src/components/registry.ts`
- Modify: `packages/enforma/src/test/setup.tsx`
- New test: add a test case to an existing or new `registry.test.ts`

**Step 1: Write the failing test**

Create `packages/enforma/src/components/registry.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { registerComponents, getComponent, clearRegistry } from './registry';
import type { TextInputProps } from './types';
import React from 'react';

const FakeA = (_props: TextInputProps) => React.createElement('div', null, 'A');
const FakeB = (_props: TextInputProps) => React.createElement('div', null, 'B');

describe('registry', () => {
  beforeEach(() => {
    clearRegistry();
  });

  it('returns undefined when nothing is registered', () => {
    expect(getComponent('TextInput')).toBeUndefined();
  });

  it('returns the registered component', () => {
    registerComponents({ TextInput: FakeA });
    expect(getComponent('TextInput')).toBe(FakeA);
  });

  it('clearRegistry removes all registered components', () => {
    registerComponents({ TextInput: FakeA });
    clearRegistry();
    expect(getComponent('TextInput')).toBeUndefined();
  });

  it('registerComponents last registration wins for the same key', () => {
    registerComponents({ TextInput: FakeA });
    registerComponents({ TextInput: FakeB });
    expect(getComponent('TextInput')).toBe(FakeB);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm --filter enforma test registry
```
Expected: FAIL — `clearRegistry is not a function` (not exported yet).

**Step 3: Add `clearRegistry` to `registry.ts`**

Add this function at the end of `packages/enforma/src/components/registry.ts`:

```ts
export function clearRegistry() {
  registry = {};
}
```

**Step 4: Export `clearRegistry` from the package public API**

Open `packages/enforma/src/index.ts` and add `clearRegistry` to the exports from `./components/registry`:

```ts
export { registerComponents, getComponent, clearRegistry } from './components/registry';
```

(Find the existing line that exports `registerComponents` and add `clearRegistry` to it.)

**Step 5: Run the registry tests to verify they pass**

```bash
pnpm --filter enforma test registry
```
Expected: all 4 tests pass.

**Step 6: Update `packages/enforma/src/test/setup.tsx` to reset the registry after each test**

The setup currently calls `registerComponents` once at module load time. After adding `clearRegistry`, the registry is wiped between tests but not re-populated. Fix: move registration into a `beforeEach` so it runs before every test.

Replace the current setup content:
```tsx
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { useId } from 'react';
import { registerComponents } from '../components/registry';
import { useComponentProps } from '../context/ScopeContext';
import type { TextInputProps } from '../components/types';

function DefaultTextInput(props: TextInputProps) {
  const { value, setValue, label, disabled, placeholder, error, showError, onBlur } =
    useComponentProps<string>(props);
  const generatedId = useId();
  const inputId = props.id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div>
      {label !== undefined && <label htmlFor={inputId}>{label}</label>}
      <input
        id={inputId}
        type="text"
        value={value ?? ''}
        placeholder={placeholder}
        disabled={disabled}
        aria-describedby={showError ? errorId : undefined}
        aria-invalid={showError || undefined}
        onBlur={onBlur}
        onChange={(e) => {
          setValue(e.target.value);
        }}
      />
      {showError && error && (
        <span id={errorId} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

registerComponents({ TextInput: DefaultTextInput });

afterEach(cleanup);
```

With:
```tsx
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { useId } from 'react';
import { registerComponents, clearRegistry } from '../components/registry';
import { useComponentProps } from '../context/ScopeContext';
import type { TextInputProps } from '../components/types';

function DefaultTextInput(props: TextInputProps) {
  const { value, setValue, label, disabled, placeholder, error, showError, onBlur } =
    useComponentProps<string>(props);
  const generatedId = useId();
  const inputId = props.id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div>
      {label !== undefined && <label htmlFor={inputId}>{label}</label>}
      <input
        id={inputId}
        type="text"
        value={value ?? ''}
        placeholder={placeholder}
        disabled={disabled}
        aria-describedby={showError ? errorId : undefined}
        aria-invalid={showError || undefined}
        onBlur={onBlur}
        onChange={(e) => {
          setValue(e.target.value);
        }}
      />
      {showError && error && (
        <span id={errorId} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

beforeEach(() => {
  clearRegistry();
  registerComponents({ TextInput: DefaultTextInput });
});

afterEach(cleanup);
```

**Step 7: Run all enforma tests to confirm nothing broke**

```bash
pnpm --filter enforma test
```
Expected: all tests pass.

**Step 8: Commit**

```bash
git add packages/enforma/src/components/registry.ts \
        packages/enforma/src/components/registry.test.ts \
        packages/enforma/src/test/setup.tsx \
        packages/enforma/src/index.ts
git commit -m "feat: add clearRegistry for test isolation"
```

---

### Task 5: Fix `List.tsx` — use stable keys instead of array indexes

React uses keys to match rendered elements between renders. When index is used as key, removing item at position `i` causes React to reuse the DOM node for item `i` as the new item `i` (which is the old item `i+1`). The DOM node that WAS item `i+1` gets unmounted, losing focus. Stable keys prevent this: each item's DOM node survives a removal above it.

The fix: maintain a parallel `keysRef` array of string IDs. Keys grow when items are added externally or via Add. Keys shrink explicitly on Remove (splice the key out before splicing the array).

**Files:**
- Modify: `packages/enforma/src/components/List.tsx`
- Modify: `packages/enforma/src/components/List.test.tsx`

**Step 1: Write the failing test**

Add this test to `packages/enforma/src/components/List.test.tsx` inside the `describe('List')` block:

```tsx
it('preserves focus when removing an item above the focused one', async () => {
  render(
    <Form values={{ items: [{ name: 'Alice' }, { name: 'Bob' }] }} onChange={vi.fn()}>
      <List bind="items" defaultItem={{ name: '' }}>
        <TextInput bind="name" label="Name" />
      </List>
    </Form>,
  );

  const inputs = screen.getAllByLabelText('Name');
  // Focus the second input (Bob)
  if (inputs[1] === undefined) throw new Error('Expected second input');
  inputs[1].focus();
  expect(document.activeElement).toBe(inputs[1]);

  // Remove the first item (Alice)
  const removeButtons = screen.getAllByRole('button', { name: 'Remove' });
  if (removeButtons[0] === undefined) throw new Error('Expected a Remove button');
  await userEvent.click(removeButtons[0]);

  // Only one input remains; it should still be focused
  const remaining = screen.getAllByLabelText('Name');
  expect(remaining).toHaveLength(1);
  expect(document.activeElement).toBe(remaining[0]);
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm --filter enforma test List
```
Expected: the new test FAILS (focus is lost with index-based keys). All existing tests still pass.

**Step 3: Implement stable keys in `List.tsx`**

Replace the full content of `packages/enforma/src/components/List.tsx` with:

```tsx
// packages/enforma/src/components/List.tsx
import { useRef } from 'react';
import { type ReactNode } from 'react';
import { useFormValue } from '../context/ScopeContext';
import { Scope } from './Scope';

type ListProps = {
  bind: string;
  defaultItem: Record<string, unknown>;
  children: ReactNode;
};

export function List({ bind, defaultItem, children }: ListProps) {
  const [rawArr, setArr] = useFormValue<unknown[]>(bind);
  const arr = rawArr ?? [];

  const keyCountRef = useRef(0);
  const keysRef = useRef<string[]>([]);

  // Ensure we have a key for every item (handles externally grown arrays)
  while (keysRef.current.length < arr.length) {
    keysRef.current.push(String(keyCountRef.current++));
  }

  return (
    <Scope path={bind}>
      {arr.map((_, index) => (
        <Scope key={keysRef.current[index]} path={String(index)}>
          {children}
          <button
            type="button"
            onClick={() => {
              keysRef.current = keysRef.current.filter((_, i) => i !== index);
              setArr(arr.filter((__, i) => i !== index));
            }}
          >
            Remove
          </button>
        </Scope>
      ))}
      <button
        type="button"
        onClick={() => {
          keysRef.current.push(String(keyCountRef.current++));
          setArr([...arr, defaultItem]);
        }}
      >
        Add
      </button>
    </Scope>
  );
}
```

Note: `keysRef.current[index]` is typed as `string | undefined` by TypeScript because arrays are not guaranteed to have every index. The `while` loop above guarantees the key exists for every valid index, but TypeScript cannot infer this. If TypeScript reports an error here, add a non-null assertion: `keysRef.current[index]!`.

**Step 4: Run tests to verify the new test passes and existing tests still pass**

```bash
pnpm --filter enforma test List
```
Expected: all 6 tests pass.

**Step 5: Run full enforma test suite**

```bash
pnpm --filter enforma test
```
Expected: all tests pass.

**Step 6: Commit**

```bash
git add packages/enforma/src/components/List.tsx \
        packages/enforma/src/components/List.test.tsx
git commit -m "fix: use stable keys in List to preserve focus on item removal"
```

---

### Task 6: Fix MUI `TextInput` — remove external `FormLabel`, use `TextField`'s built-in label

The current `TextInput` renders:
```tsx
<FormLabel htmlFor={id}>{label}</FormLabel>
<TextField id={id} ... />
```

The `id` prop on `TextField` targets the **outer `FormControl` div**, not the inner `<input>`. So `htmlFor={id}` points at the wrong element and the label is not properly associated with the input for screen readers. MUI's `TextField` has a built-in `label` prop that handles accessible association, floating animation, and proper `htmlFor` wiring internally. Using it is the correct MUI pattern.

**Files:**
- Modify: `packages/enforma-mui/src/components/TextInput.tsx`

**Step 1: Write the failing test**

Create `packages/enforma-mui/src/components/TextInput.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Form, registerComponents, clearRegistry } from 'enforma';
import { TextInput } from './TextInput';
import { Fieldset } from './Fieldset';

beforeEach(() => {
  clearRegistry();
  registerComponents({ TextInput, Fieldset });
});

describe('MUI TextInput', () => {
  it('renders an input accessible by label text', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <TextInput bind="name" label="Full name" />
      </Form>,
    );
    expect(screen.getByLabelText('Full name')).toBeInTheDocument();
  });

  it('input has correct value from form state', () => {
    render(
      <Form values={{ name: 'Alice' }} onChange={() => undefined}>
        <TextInput bind="name" label="Name" />
      </Form>,
    );
    expect(screen.getByLabelText('Name')).toHaveValue('Alice');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm --filter enforma-mui test
```
Expected: FAIL — `getByLabelText('Full name')` cannot find the input because `htmlFor` points to the wrong element.

**Step 3: Fix `TextInput.tsx`**

Replace the full content of `packages/enforma-mui/src/components/TextInput.tsx`:

```tsx
import { TextField } from '@mui/material';
import { TextInputProps, useComponentProps } from 'enforma';
import { ComponentWrap } from './ComponentWrap';

export function TextInput(props: TextInputProps) {
  const { value, setValue, label, disabled, placeholder, description, error, showError, onBlur } =
    useComponentProps<string>(props);

  return (
    <ComponentWrap error={showError} disabled={disabled ?? false}>
      <TextField
        label={label}
        value={value ?? ''}
        disabled={disabled ?? false}
        onBlur={onBlur}
        onChange={(e) => {
          setValue(e.target.value);
        }}
        fullWidth
        placeholder={placeholder ?? ''}
        type="text"
        variant="outlined"
        error={showError}
        helperText={showError ? error : description}
        color={showError ? 'error' : 'primary'}
        size="small"
      />
    </ComponentWrap>
  );
}
```

Changes: removed `FormLabel` import, removed `useId` import, removed the `<FormLabel>` JSX, added `label={label}` to `<TextField>`, removed `id={id}` (handled internally by TextField).

**Step 4: Run tests to verify they pass**

```bash
pnpm --filter enforma-mui test
```
Expected: all tests pass.

**Step 5: Run lint**

```bash
pnpm --filter enforma-mui lint
```
Expected: exits 0, no errors.

**Step 6: Commit**

```bash
git add packages/enforma-mui/src/components/TextInput.tsx \
        packages/enforma-mui/src/components/TextInput.test.tsx
git commit -m "fix: use TextField label prop instead of external FormLabel in MUI TextInput"
```

---

### Task 7: Add tests for `enforma-mui` — `TextInput` behavior and `Fieldset`

The MUI adapter packages are publishable (`"private": false`) but have zero tests. This task adds baseline tests for the remaining behaviors of `TextInput` and for `Fieldset`.

**Files:**
- Modify: `packages/enforma-mui/src/components/TextInput.test.tsx` (add more cases to the file from Task 6)
- New: `packages/enforma-mui/src/components/Fieldset.test.tsx`

**Step 1: Add TextInput behavior tests**

Append these test cases to the `describe('MUI TextInput')` block in `packages/enforma-mui/src/components/TextInput.test.tsx`:

```tsx
  it('calls onChange with updated value when user types', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ name: '' }} onChange={onChange}>
        <TextInput bind="name" label="Name" />
      </Form>,
    );
    await userEvent.type(screen.getByLabelText('Name'), 'Bob');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: 'Bob' }),
      expect.anything(),
    );
  });

  it('shows error message after blur when validate fails', async () => {
    render(
      <Form values={{ name: '' }} onChange={() => undefined}>
        <TextInput
          bind="name"
          label="Name"
          validate={(v) => (!v ? 'Name is required' : null)}
        />
      </Form>,
    );
    await userEvent.click(screen.getByLabelText('Name'));
    await userEvent.tab(); // trigger blur
    expect(await screen.findByText('Name is required')).toBeInTheDocument();
  });

  it('does not show error before blur', () => {
    render(
      <Form values={{ name: '' }} onChange={() => undefined}>
        <TextInput
          bind="name"
          label="Name"
          validate={(v) => (!v ? 'Name is required' : null)}
        />
      </Form>,
    );
    expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <TextInput bind="name" label="Name" disabled />
      </Form>,
    );
    expect(screen.getByLabelText('Name')).toBeDisabled();
  });
```

Also add these imports to the top of the file (alongside the existing imports):

```tsx
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
```

**Step 2: Run tests to confirm they pass**

```bash
pnpm --filter enforma-mui test TextInput
```
Expected: all tests pass.

**Step 3: Write the Fieldset test file**

Create `packages/enforma-mui/src/components/Fieldset.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Form, registerComponents, clearRegistry } from 'enforma';
import { TextInput } from './TextInput';
import { Fieldset } from './Fieldset';

beforeEach(() => {
  clearRegistry();
  registerComponents({ TextInput, Fieldset });
});

describe('MUI Fieldset', () => {
  it('renders children without a path', () => {
    render(
      <Form values={{ name: 'Alice' }} onChange={() => undefined}>
        <Fieldset>
          <TextInput bind="name" label="Name" />
        </Fieldset>
      </Form>,
    );
    expect(screen.getByLabelText('Name')).toHaveValue('Alice');
  });

  it('scopes children to the given path', () => {
    render(
      <Form values={{ address: { city: 'Paris' } }} onChange={() => undefined}>
        <Fieldset path="address" title="Address">
          <TextInput bind="city" label="City" />
        </Fieldset>
      </Form>,
    );
    expect(screen.getByLabelText('City')).toHaveValue('Paris');
  });

  it('renders the title', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Fieldset title="Personal Info">
          <TextInput bind="name" label="Name" />
        </Fieldset>
      </Form>,
    );
    expect(screen.getByText('Personal Info')).toBeInTheDocument();
  });
});
```

**Step 4: Run tests to confirm they pass**

```bash
pnpm --filter enforma-mui test Fieldset
```
Expected: all tests pass.

**Step 5: Run full enforma-mui test suite**

```bash
pnpm --filter enforma-mui test
```
Expected: all tests pass, no empty test file warning.

**Step 6: Run full repo lint + test**

```bash
pnpm lint && pnpm test
```
Expected: both pass with no errors.

**Step 7: Commit**

```bash
git add packages/enforma-mui/src/components/TextInput.test.tsx \
        packages/enforma-mui/src/components/Fieldset.test.tsx
git commit -m "test: add enforma-mui component tests"
```

---

## Summary of changes

| Task | Files touched | Gate it unblocks |
|------|--------------|-----------------|
| 1 — tsconfig paths | `apps/demo/tsconfig.json` | `pnpm lint`, `pnpm typecheck` |
| 2 — duplicate comment | `packages/enforma/src/components/List.tsx` | cleanliness |
| 3 — delete README | `README-PRETTIER.md` | cleanliness |
| 4 — clearRegistry | `registry.ts`, `registry.test.ts`, `setup.tsx`, `index.ts` | test isolation |
| 5 — stable List keys | `List.tsx`, `List.test.tsx` | correct focus behavior |
| 6 — MUI label fix | `enforma-mui/TextInput.tsx`, `TextInput.test.tsx` | accessibility, tests |
| 7 — MUI tests | `TextInput.test.tsx`, `Fieldset.test.tsx` | coverage gate |
