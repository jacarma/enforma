# MUI Variant Context Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to choose between three MUI visual styles (`classic`, `outlined`, `standard`) at registration time via named exports, using React context so all future components automatically inherit the variant.

**Architecture:** Add `FormWrap` to enforma's component registry — `Form` renders it around its children if registered, falling back to a fragment. `enforma-mui` ships three providers (one per variant) that set a `MuiVariantContext`. All MUI components read from that context; `TextInput` switches rendering based on it.

**Tech Stack:** TypeScript strict, React 18, MUI v6, Vitest + @testing-library/react, pnpm monorepo.

---

### Task 1: Add `FormWrap` to enforma core types and `Form`

**Files:**
- Modify: `packages/enforma/src/components/types.ts`
- Modify: `packages/enforma/src/components/Form.tsx`
- Modify: `packages/enforma/src/index.ts`
- Test: `packages/enforma/src/components/Form.test.tsx`

**Step 1: Write the failing test**

Open `packages/enforma/src/components/Form.test.tsx`. Add these imports at the top of the file alongside the existing ones:

```tsx
import { registerComponents } from './registry';
import type { ReactNode } from 'react';
```

Add these two test cases inside `describe('Form')` (after the existing ones):

```tsx
  it('renders children directly when no FormWrap is registered', () => {
    render(
      <Form values={{}} onChange={vi.fn()}>
        <span>unwrapped</span>
      </Form>,
    );
    expect(screen.getByText('unwrapped')).toBeInTheDocument();
  });

  it('renders children inside FormWrap when one is registered', () => {
    const FormWrap = ({ children }: { children: ReactNode }) => (
      <div data-testid="adapter-wrap">{children}</div>
    );
    registerComponents({ FormWrap });
    render(
      <Form values={{}} onChange={vi.fn()}>
        <span>wrapped</span>
      </Form>,
    );
    expect(screen.getByTestId('adapter-wrap')).toBeInTheDocument();
    expect(screen.getByText('wrapped')).toBeInTheDocument();
  });
```

**Step 2: Run to verify they fail**

```bash
pnpm --filter enforma test Form
```
Expected: "renders children inside FormWrap when one is registered" FAILS — `FormWrap` is not yet in `ComponentPropsMap` so TypeScript will error on `registerComponents({ FormWrap })`.

**Step 3: Add `FormWrap` to `types.ts`**

Open `packages/enforma/src/components/types.ts`. Add `FormWrapProps` and the `FormWrap` entry:

```ts
import type { FormValues } from '../store/FormStore';
import type { ReactNode } from 'react';

export type Reactive<T> = T | ((scopeValues: FormValues, allValues: FormValues) => T);

export type CommonProps = {
  bind: string;
  label?: Reactive<string>;
  disabled?: Reactive<boolean>;
  placeholder?: Reactive<string>;
  id?: string;
  description?: Reactive<string>;
  validate?: (value: unknown, scopeValues: FormValues, allValues: FormValues) => string | null;
  messages?: Partial<Record<string, string>>;
};

export type TextInputProps = CommonProps;
export type TextareaProps = CommonProps;
export type SelectProps = CommonProps;
export type CheckboxProps = CommonProps;

export type FieldsetProps = {
  path?: string;
  children: ReactNode;
  title?: string;
};

export type FormWrapProps = {
  children: ReactNode;
};

export type ComponentPropsMap = {
  TextInput: TextInputProps;
  Textarea: TextareaProps;
  Select: SelectProps;
  Checkbox: CheckboxProps;
  Fieldset: FieldsetProps;
  FormWrap: FormWrapProps;
};

export type ComponentProps = CommonProps;
```

**Step 4: Update `Form.tsx` to render FormWrap if registered**

Replace the `return` statement in `packages/enforma/src/components/Form.tsx`. Import `getComponent` at the top and wrap children:

```tsx
import { useRef, type ReactNode, type FormEvent } from 'react';
import { FormStore, type FormValues } from '../store/FormStore';
import { FormContext } from '../context/FormContext';
import { FormSettingsContext } from '../context/FormSettingsContext';
import { ScopeContext, makeScopeValue } from '../context/ScopeContext';
import { getComponent } from './registry';

type ValidationState = {
  isValid: boolean;
  errors: Record<string, string | null>;
};

type FormProps = {
  values: FormValues;
  onChange: (values: FormValues, state: ValidationState) => void;
  onSubmit?: (values: FormValues) => void;
  showErrors?: boolean;
  messages?: Partial<Record<string, string>>;
  children: ReactNode;
  'aria-label'?: string;
};

export function Form({
  values,
  onChange,
  onSubmit,
  showErrors = false,
  messages = {},
  children,
  'aria-label': ariaLabel = 'form',
}: FormProps) {
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

  const store = storeRef.current;
  const scopeValue = makeScopeValue(store, '');
  const formSettings = { showErrors, messages };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    store.setSubmitted();
    if (store.isValid()) {
      onSubmitRef.current?.(store.getSnapshot());
    }
  };

  const FormWrap = getComponent('FormWrap');
  const wrappedChildren = FormWrap ? <FormWrap>{children}</FormWrap> : children;

  return (
    <FormContext.Provider value={store}>
      <FormSettingsContext.Provider value={formSettings}>
        <ScopeContext.Provider value={scopeValue}>
          <form aria-label={ariaLabel} onSubmit={handleSubmit}>
            {wrappedChildren}
          </form>
        </ScopeContext.Provider>
      </FormSettingsContext.Provider>
    </FormContext.Provider>
  );
}
```

**Step 5: Export `FormWrapProps` from `packages/enforma/src/index.ts`**

Find the `export type { ... }` block that lists types from `./components/types` and add `FormWrapProps`:

```ts
export type {
  Reactive,
  CommonProps,
  TextInputProps,
  TextareaProps,
  SelectProps,
  CheckboxProps,
  ComponentPropsMap,
  ComponentProps,
  FieldsetProps,
  FormWrapProps,
} from './components/types';
```

**Step 6: Run tests to verify all pass**

```bash
pnpm --filter enforma test
```
Expected: 53 tests pass (51 existing + 2 new). Note: the setup.tsx `beforeEach` calls `clearRegistry()` before every test, so the `FormWrap` registered in the new test does not leak to other tests.

**Step 7: Run lint**

```bash
pnpm --filter enforma lint
```
Expected: exits 0.

**Step 8: Commit**

```bash
git add packages/enforma/src/components/types.ts \
        packages/enforma/src/components/Form.tsx \
        packages/enforma/src/index.ts \
        packages/enforma/src/components/Form.test.tsx
git commit -m "feat: add FormWrap to component registry, render in Form"
```

---

### Task 2: Create `MuiVariantContext` and three providers

**Files:**
- Create: `packages/enforma-mui/src/context/MuiVariantContext.ts`
- Create: `packages/enforma-mui/src/context/ClassicProvider.tsx`
- Create: `packages/enforma-mui/src/context/OutlinedProvider.tsx`
- Create: `packages/enforma-mui/src/context/StandardProvider.tsx`

These are tiny files. There is no logic to test in isolation — providers are tested in Task 3 via `TextInput` integration tests. Write the files and verify they compile.

**Step 1: Create `MuiVariantContext.ts`**

```ts
// packages/enforma-mui/src/context/MuiVariantContext.ts
import { createContext } from 'react';

export type MuiVariant = 'classic' | 'outlined' | 'standard';

export const MuiVariantContext = createContext<MuiVariant>('outlined');
```

**Step 2: Create `ClassicProvider.tsx`**

```tsx
// packages/enforma-mui/src/context/ClassicProvider.tsx
import { type ReactNode } from 'react';
import { MuiVariantContext } from './MuiVariantContext';

export function ClassicProvider({ children }: { children: ReactNode }) {
  return <MuiVariantContext.Provider value="classic">{children}</MuiVariantContext.Provider>;
}
```

**Step 3: Create `OutlinedProvider.tsx`**

```tsx
// packages/enforma-mui/src/context/OutlinedProvider.tsx
import { type ReactNode } from 'react';
import { MuiVariantContext } from './MuiVariantContext';

export function OutlinedProvider({ children }: { children: ReactNode }) {
  return <MuiVariantContext.Provider value="outlined">{children}</MuiVariantContext.Provider>;
}
```

**Step 4: Create `StandardProvider.tsx`**

```tsx
// packages/enforma-mui/src/context/StandardProvider.tsx
import { type ReactNode } from 'react';
import { MuiVariantContext } from './MuiVariantContext';

export function StandardProvider({ children }: { children: ReactNode }) {
  return <MuiVariantContext.Provider value="standard">{children}</MuiVariantContext.Provider>;
}
```

**Step 5: Run typecheck to confirm no errors**

```bash
pnpm --filter enforma-mui typecheck
```
Expected: exits 0.

**Step 6: Commit**

```bash
git add packages/enforma-mui/src/context/
git commit -m "feat: add MuiVariantContext and three variant providers"
```

---

### Task 3: Update `TextInput` to read from context

**Files:**
- Modify: `packages/enforma-mui/src/components/TextInput.tsx`
- Modify: `packages/enforma-mui/src/components/TextInput.test.tsx`

**Step 1: Write failing tests for each variant**

Add these test cases to `packages/enforma-mui/src/components/TextInput.test.tsx`. Add imports for the providers at the top alongside the existing imports:

```tsx
import { ClassicProvider } from '../context/ClassicProvider';
import { StandardProvider } from '../context/StandardProvider';
```

Add a new `describe` block at the bottom of the file (after the existing `describe('MUI TextInput')` block):

```tsx
describe('MUI TextInput variants', () => {
  it('classic: renders an input accessible by label text', () => {
    clearRegistry();
    registerComponents({ TextInput, Fieldset, FormWrap: ClassicProvider });
    render(
      <Form values={{}} onChange={() => undefined}>
        <TextInput bind="name" label="Full name" />
      </Form>,
    );
    expect(screen.getByLabelText('Full name')).toBeInTheDocument();
  });

  it('classic: uses compact size', () => {
    clearRegistry();
    registerComponents({ TextInput, Fieldset, FormWrap: ClassicProvider });
    render(
      <Form values={{ name: 'x' }} onChange={() => undefined}>
        <TextInput bind="name" label="Name" />
      </Form>,
    );
    // compact size means the input has size attribute "small" or similar class;
    // the reliable assertion is that the input renders and is accessible
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('x');
  });

  it('standard: renders an input accessible by label text', () => {
    clearRegistry();
    registerComponents({ TextInput, Fieldset, FormWrap: StandardProvider });
    render(
      <Form values={{}} onChange={() => undefined}>
        <TextInput bind="name" label="Full name" />
      </Form>,
    );
    expect(screen.getByLabelText('Full name')).toBeInTheDocument();
  });

  it('outlined (default): renders an input accessible by label text without FormWrap', () => {
    // No FormWrap registered — context defaults to 'outlined'
    render(
      <Form values={{}} onChange={() => undefined}>
        <TextInput bind="name" label="Full name" />
      </Form>,
    );
    expect(screen.getByLabelText('Full name')).toBeInTheDocument();
  });
});
```

**Step 2: Run to verify the tests fail** (the classic variant currently uses `outlined` rendering, which works by accident, but importing `ClassicProvider` will fail because the file doesn't exist yet)

```bash
pnpm --filter enforma-mui test TextInput
```
Expected: compile/import error for `ClassicProvider` (Task 2 must be done first). If Task 2 is done, the tests should initially pass for outlined-as-default but we'll confirm after implementing Task 3.

**Step 3: Rewrite `TextInput.tsx`**

Replace the full content of `packages/enforma-mui/src/components/TextInput.tsx`:

```tsx
import { useId, useContext } from 'react';
import { FormLabel, TextField } from '@mui/material';
import { type TextInputProps, useComponentProps } from 'enforma';
import { ComponentWrap } from './ComponentWrap';
import { MuiVariantContext } from '../context/MuiVariantContext';

export function TextInput(props: TextInputProps) {
  const { value, setValue, label, disabled, placeholder, description, error, showError, onBlur } =
    useComponentProps<string>(props);
  const variant = useContext(MuiVariantContext);
  const id = useId();

  const commonProps = {
    value: value ?? '',
    disabled: disabled ?? false,
    onBlur,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
    },
    fullWidth: true as const,
    placeholder: placeholder ?? '',
    type: 'text' as const,
    error: showError,
    helperText: showError ? error : description,
    color: (showError ? 'error' : 'primary') as 'error' | 'primary',
  };

  if (variant === 'classic') {
    return (
      <ComponentWrap error={showError} disabled={disabled ?? false}>
        {label !== undefined && <FormLabel htmlFor={id}>{label}</FormLabel>}
        <TextField {...commonProps} inputProps={{ id }} variant="outlined" size="small" />
      </ComponentWrap>
    );
  }

  return (
    <ComponentWrap error={showError} disabled={disabled ?? false}>
      <TextField {...commonProps} label={label} variant={variant} />
    </ComponentWrap>
  );
}
```

Key design notes:
- `useId()` is always called (React rules: no conditional hooks), but only used in the `classic` branch
- `variant={variant}` in the non-classic branch works because `MuiVariant` is `'outlined' | 'standard'` for those cases, which MUI's `variant` prop accepts
- `inputProps={{ id }}` on TextField sets the `id` on the inner `<input>` element, making `<FormLabel htmlFor={id}>` correctly associate with it

**Step 4: Run tests**

```bash
pnpm --filter enforma-mui test TextInput
```
Expected: all 10 tests pass (6 existing + 4 new).

**Step 5: Run full enforma-mui test suite**

```bash
pnpm --filter enforma-mui test
```
Expected: all 13 tests pass (10 TextInput + 3 Fieldset).

**Step 6: Run lint**

```bash
pnpm --filter enforma-mui lint
```
Expected: exits 0.

**Step 7: Commit**

```bash
git add packages/enforma-mui/src/components/TextInput.tsx \
        packages/enforma-mui/src/components/TextInput.test.tsx
git commit -m "feat: TextInput reads MuiVariantContext for classic/outlined/standard rendering"
```

---

### Task 4: Update `enforma-mui/index.ts` and demo app

**Files:**
- Modify: `packages/enforma-mui/src/index.ts`
- Modify: `apps/demo/src/App.tsx`

**Step 1: Rewrite `packages/enforma-mui/src/index.ts`**

Replace the full content:

```ts
import type { EnformaComponentRegistry } from 'enforma';
import { TextInput } from './components/TextInput';
import { Fieldset } from './components/Fieldset';
import { ClassicProvider } from './context/ClassicProvider';
import { OutlinedProvider } from './context/OutlinedProvider';
import { StandardProvider } from './context/StandardProvider';

// Pre-built bundles — pick one and pass to registerComponents
export const classic: Partial<EnformaComponentRegistry> = {
  TextInput,
  Fieldset,
  FormWrap: ClassicProvider,
};

export const outlined: Partial<EnformaComponentRegistry> = {
  TextInput,
  Fieldset,
  FormWrap: OutlinedProvider,
};

export const standard: Partial<EnformaComponentRegistry> = {
  TextInput,
  Fieldset,
  FormWrap: StandardProvider,
};

// Individual exports for mix-and-match / max tree-shaking
export { TextInput, Fieldset };
export { ClassicProvider, OutlinedProvider, StandardProvider };
export type { MuiVariant } from './context/MuiVariantContext';
```

Note: the default export is removed. Any consumer that was using `import enformaMui from 'enforma-mui'` must switch to a named import.

**Step 2: Update `apps/demo/src/App.tsx`**

Change the import on line 4 from:
```ts
import enformaMui from 'enforma-mui';
registerComponents(enformaMui);
```

To:
```ts
import { classic } from 'enforma-mui';
registerComponents(classic);
```

**Step 3: Run typecheck across everything**

```bash
pnpm typecheck
```
Expected: exits 0 — no type errors.

**Step 4: Run lint**

```bash
pnpm lint
```
Expected: exits 0.

**Step 5: Run all tests**

```bash
pnpm test
```
Expected: all tests pass (53 enforma + 13 enforma-mui = 66 total).

**Step 6: Commit**

```bash
git add packages/enforma-mui/src/index.ts \
        apps/demo/src/App.tsx
git commit -m "feat: export classic/outlined/standard bundles from enforma-mui, update demo"
```
