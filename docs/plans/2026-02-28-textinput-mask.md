# TextInput Mask Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add optional `mask` prop to `TextInput` backed by IMask, with zero cost for users who don't use it.

**Architecture:** `mask` is declared in core types as `Reactive<string | RegExp>`, resolved in `TextInputDispatch` alongside other reactive props, and passed to the adapter. `enforma-mui` lazy-loads `react-imask` via `React.lazy` only when a mask is provided; a clear error is thrown if the package isn't installed.

**Tech Stack:** IMask / react-imask v7, React.lazy + Suspense, MUI TextField slot API (v6)

---

### Task 1: Core — add `mask` to types and thread it through dispatch

**Files:**
- Modify: `packages/enforma/src/components/types.ts`
- Modify: `packages/enforma/src/components/fields.tsx`
- Test: `packages/enforma/src/components/Form.test.tsx`

**Step 1: Write the failing test**

Add to the bottom of `packages/enforma/src/components/Form.test.tsx`:

```tsx
describe('TextInput mask prop', () => {
  it('passes resolved mask to the adapter', () => {
    const received: Array<string | RegExp | undefined> = [];

    registerComponents({
      TextInput: (props: ResolvedTextInputProps) => {
        received.push(props.mask);
        return <input aria-label={props.label ?? ''} />;
      },
    });

    render(
      <Form values={{}} onChange={vi.fn()}>
        <TextInput bind="x" label="X" mask="000-000" />
      </Form>,
    );

    expect(received[0]).toBe('000-000');
  });

  it('resolves a reactive mask function', () => {
    const received: Array<string | RegExp | undefined> = [];

    registerComponents({
      TextInput: (props: ResolvedTextInputProps) => {
        received.push(props.mask);
        return <input aria-label={props.label ?? ''} />;
      },
    });

    render(
      <Form values={{ type: 'phone' }} onChange={vi.fn()}>
        <TextInput
          bind="x"
          label="X"
          mask={({ type }) => (type === 'phone' ? '000-000-0000' : /\d+/)}
        />
      </Form>,
    );

    expect(received[0]).toBe('000-000-0000');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
nvm use 20 && pnpm --filter enforma test -- --reporter=verbose 2>&1 | tail -20
```

Expected: FAIL — `props.mask` is `undefined` (not yet wired up).

**Step 3: Add `mask` to `TextInputProps` and `ResolvedTextInputProps`**

In `packages/enforma/src/components/types.ts`:

```ts
// Change:
export type TextInputProps = CommonProps;

// To:
export type TextInputProps = CommonProps & {
  mask?: Reactive<string | RegExp>;
};
```

And add `mask` to `ResolvedTextInputProps`:

```ts
export type ResolvedTextInputProps = Omit<ResolvedCommonProps, 'value' | 'setValue'> & {
  value: string | undefined;
  setValue: (value: string) => void;
  mask?: string | RegExp;
};
```

**Step 4: Thread `mask` through `TextInputDispatch`**

In `packages/enforma/src/components/fields.tsx`, change `TextInputDispatch`:

```tsx
function TextInputDispatch({ mask, ...props }: TextInputProps) {
  const resolved = useFieldProps<string>(props);
  const resolvedMask = useReactiveProp(mask);
  return dispatchComponent('TextInput', { ...resolved, mask: resolvedMask });
}
```

`useReactiveProp` is already imported via `useFieldProps` — add it as a named import:

```tsx
import { useFieldProps, useReactiveProp } from '../hooks/useField';
```

**Step 5: Run the tests**

```bash
nvm use 20 && pnpm --filter enforma test 2>&1 | tail -15
```

Expected: All tests pass including the two new ones.

**Step 6: Run lint and typecheck**

```bash
nvm use 20 && pnpm --filter enforma lint && pnpm --filter enforma typecheck
```

Expected: no errors.

**Step 7: Commit**

```bash
git add packages/enforma/src/components/types.ts packages/enforma/src/components/fields.tsx packages/enforma/src/components/Form.test.tsx
git commit -m "feat(core): add reactive mask prop to TextInput types and dispatch"
```

---

### Task 2: enforma-mui — create `MaskedTextInput` internal component

**Files:**
- Create: `packages/enforma-mui/src/components/MaskedTextInput.tsx`
- Modify: `packages/enforma-mui/src/components/TextInput.test.tsx`

**Background — how `IMaskInput` integrates with MUI TextField (v6):**

MUI v6 TextField lets you replace the inner `<input>` element by passing an `inputComponent` prop to the OutlinedInput/StandardInput via `slotProps.input`. The component must:
1. Accept `inputRef` (the forwarded ref)
2. Accept `onChange` and call it with a synthetic `{ target: { value } }` object
3. Accept any extra props via `slotProps.htmlInput` — including `mask`

`IMaskInput` from `react-imask` exposes `onAccept` for when the user types a valid value and `inputRef` for the forwarded ref. The `MaskAdapter` bridges these to MUI's expected interface.

**Step 1: Write the failing test**

In `packages/enforma-mui/src/components/TextInput.test.tsx`, add at the top:

```tsx
import { vi } from 'vitest';
```

(already imported — keep as-is)

Add this new `describe` block at the bottom of the file:

```tsx
describe('MUI TextInput with mask', () => {
  beforeEach(() => {
    vi.mock('react-imask', () => ({
      IMaskInput: forwardRef(
        (
          {
            onAccept,
            inputRef,
            ...rest
          }: {
            onAccept: (v: string) => void;
            inputRef: React.Ref<HTMLInputElement>;
            mask: string | RegExp;
          },
          _ref,
        ) => (
          <input
            {...rest}
            ref={inputRef}
            data-testid="imask-input"
            onChange={(e) => onAccept(e.target.value)}
          />
        ),
      ),
    }));
  });

  it('renders an IMaskInput when mask prop is provided', async () => {
    render(
      <Form values={{ phone: '' }} onChange={() => undefined}>
        <Enforma.TextInput bind="phone" label="Phone" mask="000-000-0000" />
      </Form>,
    );
    expect(await screen.findByTestId('imask-input')).toBeInTheDocument();
  });

  it('calls setValue with the masked value when user types', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ phone: '' }} onChange={onChange}>
        <Enforma.TextInput bind="phone" label="Phone" mask="000-000-0000" />
      </Form>,
    );
    const input = await screen.findByTestId('imask-input');
    await userEvent.type(input, '5');
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '5' }),
      expect.anything(),
    );
  });
});
```

Add `forwardRef` to the React import at the top of the test file:

```tsx
import React, { forwardRef } from 'react';
```

**Step 2: Run test to verify it fails**

```bash
nvm use 20 && pnpm --filter enforma-mui test -- --reporter=verbose 2>&1 | tail -20
```

Expected: FAIL — `MaskedTextInput` module doesn't exist yet.

**Step 3: Create `MaskedTextInput.tsx`**

Create `packages/enforma-mui/src/components/MaskedTextInput.tsx`:

```tsx
import { forwardRef, useContext, useId } from 'react';
import { FormLabel, TextField } from '@mui/material';
import { IMaskInput } from 'react-imask';
import type { ResolvedTextInputProps } from 'enforma';
import { ComponentWrap } from './ComponentWrap';
import { MuiVariantContext } from '../context/MuiVariantContext';

interface MaskAdapterProps extends React.InputHTMLAttributes<HTMLInputElement> {
  inputRef: React.Ref<HTMLInputElement>;
  mask: string | RegExp;
}

const MaskAdapter = forwardRef<HTMLInputElement, MaskAdapterProps>(
  ({ onChange, inputRef, mask, ...other }, _ref) => (
    <IMaskInput
      {...other}
      mask={mask}
      inputRef={inputRef}
      onAccept={(value) => {
        onChange?.({
          target: { value: value as string },
        } as React.ChangeEvent<HTMLInputElement>);
      }}
    />
  ),
);

MaskAdapter.displayName = 'MaskAdapter';

type Props = ResolvedTextInputProps & { mask: string | RegExp };

export function MaskedTextInput({
  value,
  setValue,
  label,
  disabled = false,
  placeholder,
  description,
  error,
  showError,
  onBlur,
  mask,
}: Props) {
  const variant = useContext(MuiVariantContext);
  const id = useId();

  const commonProps = {
    value: value ?? '',
    disabled,
    onBlur,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
    },
    fullWidth: true,
    placeholder: placeholder ?? '',
    error: showError,
    helperText: showError ? error : description,
    color: showError ? ('error' as const) : ('primary' as const),
    slotProps: {
      input: {
        inputComponent: MaskAdapter as React.ElementType,
      },
      htmlInput: { mask } as unknown as React.InputHTMLAttributes<HTMLInputElement>,
    },
  };

  if (variant === 'classic') {
    return (
      <ComponentWrap error={showError} disabled={disabled}>
        {label !== undefined && <FormLabel htmlFor={id}>{label}</FormLabel>}
        <TextField
          {...commonProps}
          slotProps={{
            ...commonProps.slotProps,
            htmlInput: {
              ...(commonProps.slotProps.htmlInput as object),
              id,
            } as unknown as React.InputHTMLAttributes<HTMLInputElement>,
          }}
          variant="outlined"
          size="small"
        />
      </ComponentWrap>
    );
  }

  return (
    <ComponentWrap error={showError} disabled={disabled}>
      <TextField {...commonProps} label={label} variant={variant} />
    </ComponentWrap>
  );
}
```

**Step 4: Run the tests**

```bash
nvm use 20 && pnpm --filter enforma-mui test 2>&1 | tail -15
```

Expected: All tests pass including the two new mask tests.

**Step 5: Lint and typecheck**

```bash
nvm use 20 && pnpm --filter enforma-mui lint && pnpm --filter enforma-mui typecheck
```

Expected: no errors. If the `as unknown as` casts cause type issues, adjust — the goal is to pass `mask` through MUI's slot system without fighting the types.

**Step 6: Commit**

```bash
git add packages/enforma-mui/src/components/MaskedTextInput.tsx packages/enforma-mui/src/components/TextInput.test.tsx
git commit -m "feat(enforma-mui): add MaskedTextInput component using react-imask"
```

---

### Task 3: enforma-mui — lazy-load `MaskedTextInput` from `TextInput`

**Files:**
- Modify: `packages/enforma-mui/src/components/TextInput.tsx`
- Modify: `packages/enforma-mui/src/components/TextInput.test.tsx`

**Step 1: Write the failing test for the error case**

Add to the mask `describe` block in `TextInput.test.tsx`:

```tsx
it('throws a clear error when mask is set but react-imask is not installed', async () => {
  vi.doMock('./MaskedTextInput', () => {
    throw new Error("Cannot find module 'react-imask'");
  });

  const errors: Error[] = [];
  class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { error: Error | null }
  > {
    state = { error: null };
    static getDerivedStateFromError(error: Error) {
      return { error };
    }
    componentDidCatch(error: Error) {
      errors.push(error);
    }
    render() {
      if (this.state.error) return null;
      return this.props.children;
    }
  }

  render(
    <ErrorBoundary>
      <Form values={{ phone: '' }} onChange={() => undefined}>
        <Enforma.TextInput bind="phone" label="Phone" mask="000-000-0000" />
      </Form>
    </ErrorBoundary>,
  );

  await waitFor(() => {
    expect(errors[0]?.message).toMatch('pnpm add react-imask imask');
  });
});
```

Add `waitFor` to the `@testing-library/react` import at the top of the test file.

**Step 2: Run test to verify it fails**

```bash
nvm use 20 && pnpm --filter enforma-mui test -- --reporter=verbose 2>&1 | tail -20
```

Expected: FAIL — `TextInput` doesn't yet use `React.lazy`.

**Step 3: Update `TextInput.tsx` to lazy-load `MaskedTextInput`**

Replace the contents of `packages/enforma-mui/src/components/TextInput.tsx` with:

```tsx
import { useId, useContext, lazy, Suspense } from 'react';
import { FormLabel, TextField } from '@mui/material';
import { type ResolvedTextInputProps } from 'enforma';
import { ComponentWrap } from './ComponentWrap';
import { MuiVariantContext } from '../context/MuiVariantContext';

const LazyMaskedTextInput = lazy(() =>
  import('./MaskedTextInput').catch(() => {
    throw new Error(
      "enforma-mui: the `mask` prop requires `react-imask`. Run: pnpm add react-imask imask",
    );
  }),
);

function UnmaskedTextInput({
  value,
  setValue,
  label,
  disabled = false,
  placeholder,
  description,
  error,
  showError,
  onBlur,
}: ResolvedTextInputProps) {
  const variant = useContext(MuiVariantContext);
  const id = useId();

  const commonProps = {
    value: value ?? '',
    disabled,
    onBlur,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
    },
    fullWidth: true,
    placeholder: placeholder ?? '',
    type: 'text',
    error: showError,
    helperText: showError ? error : description,
    color: showError ? ('error' as const) : ('primary' as const),
  };

  if (variant === 'classic') {
    return (
      <ComponentWrap error={showError} disabled={disabled}>
        {label !== undefined && <FormLabel htmlFor={id}>{label}</FormLabel>}
        <TextField
          {...commonProps}
          slotProps={{ htmlInput: { id } }}
          variant="outlined"
          size="small"
        />
      </ComponentWrap>
    );
  }

  return (
    <ComponentWrap error={showError} disabled={disabled}>
      <TextField {...commonProps} label={label} variant={variant} />
    </ComponentWrap>
  );
}

export function TextInput(props: ResolvedTextInputProps) {
  if (props.mask !== undefined) {
    return (
      <Suspense fallback={<UnmaskedTextInput {...props} />}>
        <LazyMaskedTextInput {...props} mask={props.mask} />
      </Suspense>
    );
  }

  return <UnmaskedTextInput {...props} />;
}
```

Note: `import React` is needed for `React.ChangeEvent`. Add it if your tsconfig does not enable `jsx: react-jsx` implicit React import for type references — check by running typecheck.

**Step 4: Run the tests**

```bash
nvm use 20 && pnpm --filter enforma-mui test 2>&1 | tail -15
```

Expected: All tests pass.

**Step 5: Lint and typecheck**

```bash
nvm use 20 && pnpm --filter enforma-mui lint && pnpm --filter enforma-mui typecheck
```

Expected: no errors.

**Step 6: Commit**

```bash
git add packages/enforma-mui/src/components/TextInput.tsx packages/enforma-mui/src/components/TextInput.test.tsx
git commit -m "feat(enforma-mui): lazy-load MaskedTextInput, throw on missing react-imask"
```

---

### Task 4: Package config — optional peer deps and externals

**Files:**
- Modify: `packages/enforma-mui/package.json`
- Modify: `packages/enforma-mui/vite.config.ts`

**Step 1: Add optional peer deps to `package.json`**

In `packages/enforma-mui/package.json`, add to `peerDependencies` and add new `peerDependenciesMeta`:

```json
"peerDependencies": {
  "@emotion/react": "^11.14.0",
  "@emotion/styled": "^11.14.1",
  "@mui/material": "^6.4.6",
  "imask": "^7",
  "react": ">=18",
  "react-dom": ">=18",
  "react-imask": "^7"
},
"peerDependenciesMeta": {
  "imask": { "optional": true },
  "react-imask": { "optional": true }
},
```

**Step 2: Add to `rollupOptions.external` in `vite.config.ts`**

In `packages/enforma-mui/vite.config.ts`, add `'react-imask'` and `'imask'` to the `external` array and their globals:

```ts
external: [
  'react',
  'react-dom',
  'react/jsx-runtime',
  '@mui/material',
  '@emotion/react',
  '@emotion/styled',
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
```

**Step 3: Install react-imask in the demo app to verify the build works**

```bash
nvm use 20 && pnpm --filter demo add react-imask imask
```

**Step 4: Build enforma-mui and verify the bundle**

```bash
nvm use 20 && pnpm --filter enforma-mui build 2>&1
```

Expected: build succeeds. Bundle size stays small (~5-6 KB). Verify:

```bash
grep "IMask\|react-imask" packages/enforma-mui/dist/enforma-mui.js | head -5
```

Expected: only `import` references, no inlined IMask code.

**Step 5: Run full test suite**

```bash
nvm use 20 && pnpm test 2>&1 | tail -20
```

Expected: all tests pass across all packages.

**Step 6: Lint and typecheck everything**

```bash
nvm use 20 && pnpm lint && pnpm typecheck
```

Expected: no errors.

**Step 7: Commit**

```bash
git add packages/enforma-mui/package.json packages/enforma-mui/vite.config.ts apps/demo/package.json pnpm-lock.yaml
git commit -m "feat(enforma-mui): add react-imask as optional peer dependency"
```

---

### Task 5: Demo — add a masked input example

**Files:**
- Modify: `apps/demo/src/App.tsx`

**Step 1: Add a masked phone field to the demo**

In `apps/demo/src/App.tsx`, add a new section before the closing `</div>`:

```tsx
<hr style={{ margin: '2rem 0' }} />

<h2>Masked Input</h2>
<p style={{ color: '#555', marginBottom: '1rem' }}>
  Phone field with <code>mask="000-000-0000"</code> via IMask.
</p>

<Enforma.Form values={{}} onChange={() => {}} aria-label="mask demo form">
  <Enforma.TextInput bind="phone" label="Phone" mask="000-000-0000" placeholder="000-000-0000" />
</Enforma.Form>
```

**Step 2: Run lint and typecheck**

```bash
nvm use 20 && pnpm --filter demo lint && pnpm --filter demo typecheck
```

Expected: no errors.

**Step 3: Commit**

```bash
git add apps/demo/src/App.tsx
git commit -m "chore(demo): add masked phone input example"
```
