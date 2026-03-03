# Date/Time Pickers Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `DatePicker`, `TimePicker`, and `DateTimePicker` fields, and refactor the enforma-mui bundle API from three named bundle exports to a single `registerComponents(muiComponents, options)` call.

**Architecture:** The core registry gains a `RegisterOptions` type (`variant`, `dateAdapter`) stored alongside components. A new `MuiFormWrap` replaces the three existing provider files — it reads `variant` and `dateAdapter` from registry options and lazy-loads `LocalizationProvider` when a date adapter is configured. Three new field types store `Date | string | undefined` (DatePicker, DateTimePicker) or `string | undefined` (TimePicker), with type-level validators. MUI adapters lazy-load `@mui/x-date-pickers` and capture partial text via a `useRef` (not `useState` — the ref update must be synchronous so the picker's `onChange` sees the latest raw value).

**Tech Stack:** TypeScript strict, React 18, @mui/x-date-pickers v7 (optional peer dep, lazy-loaded), MUI v6, Vitest + @testing-library/react.

---

## Task 1 — Extend registry with `RegisterOptions`

**Files:**
- Modify: `packages/enforma/src/components/registry.ts`
- Modify (tests): `packages/enforma/src/components/registry.test.ts`
- Modify: `packages/enforma/src/index.ts`

### Step 1 — Write the failing tests

Add at the bottom of `registry.test.ts`:

```typescript
import { registerComponents, getComponent, clearRegistry, getRegistryOptions } from './registry';

describe('RegisterOptions', () => {
  beforeEach(() => {
    clearRegistry();
  });

  it('returns empty options when nothing is registered', () => {
    expect(getRegistryOptions()).toEqual({});
  });

  it('stores options passed to registerComponents', () => {
    registerComponents({}, { variant: 'classic' });
    expect(getRegistryOptions()).toEqual({ variant: 'classic' });
  });

  it('stores dateAdapter option', () => {
    registerComponents({}, { dateAdapter: 'dayjs' });
    expect(getRegistryOptions().dateAdapter).toBe('dayjs');
  });

  it('merges options across multiple registerComponents calls', () => {
    registerComponents({}, { variant: 'outlined' });
    registerComponents({}, { dateAdapter: 'dayjs' });
    expect(getRegistryOptions()).toEqual({ variant: 'outlined', dateAdapter: 'dayjs' });
  });

  it('clearRegistry resets options to empty', () => {
    registerComponents({}, { variant: 'classic' });
    clearRegistry();
    expect(getRegistryOptions()).toEqual({});
  });
});
```

### Step 2 — Run to verify they fail

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm --filter enforma test 2>&1 | tail -15
```

Expected: 5 failing tests mentioning `getRegistryOptions`.

### Step 3 — Implement in `registry.ts`

Replace the full file content:

```typescript
import type React from 'react';
import { ComponentPropsMap } from './types';

export type EnformaComponentRegistry = {
  [K in keyof ComponentPropsMap]?: React.ComponentType<ComponentPropsMap[K]>;
};

export type RegisterOptions = {
  variant?: 'classic' | 'outlined' | 'standard';
  dateAdapter?: 'dayjs' | 'date-fns' | 'luxon' | 'moment';
};

let registry: Partial<EnformaComponentRegistry> = {};
let options: RegisterOptions = {};

export function registerComponents(
  components: Partial<EnformaComponentRegistry>,
  opts?: RegisterOptions,
) {
  registry = { ...registry, ...components };
  if (opts !== undefined) {
    options = { ...options, ...opts };
  }
}

export function getComponent<K extends keyof ComponentPropsMap>(
  type: K,
): React.ComponentType<ComponentPropsMap[K]> | undefined {
  return registry[type];
}

export function getRegistryOptions(): RegisterOptions {
  return options;
}

export function clearRegistry() {
  registry = {};
  options = {};
}
```

### Step 4 — Export from `packages/enforma/src/index.ts`

Add `getRegistryOptions` and `RegisterOptions` to the exports:

```typescript
export { registerComponents, clearRegistry, getRegistryOptions } from './components/registry';
export type { RegisterOptions } from './components/registry';
```

(The existing `export { registerComponents, clearRegistry }` line becomes the above — replace it.)

### Step 5 — Run tests

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm --filter enforma test 2>&1 | tail -10
```

Expected: all passing.

### Step 6 — Typecheck and lint

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm typecheck && pnpm lint 2>&1 | tail -10
```

Expected: no errors.

### Step 7 — Commit

```bash
git add packages/enforma/src/components/registry.ts \
        packages/enforma/src/components/registry.test.ts \
        packages/enforma/src/index.ts
git commit -m "$(cat <<'EOF'
feat(enforma): add RegisterOptions to registry

registerComponents() now accepts an optional second argument for
variant and dateAdapter. getRegistryOptions() returns stored options.
clearRegistry() resets both components and options.
EOF
)"
```

---

## Task 2 — Create `MuiFormWrap`, remove old providers

**Files:**
- Create: `packages/enforma-mui/src/components/MuiFormWrap.tsx`
- Create (tests): `packages/enforma-mui/src/components/MuiFormWrap.test.tsx`
- Delete: `packages/enforma-mui/src/context/ClassicProvider.tsx`
- Delete: `packages/enforma-mui/src/context/OutlinedProvider.tsx`
- Delete: `packages/enforma-mui/src/context/StandardProvider.tsx`
- Modify: `packages/enforma-mui/src/context/MuiVariantContext.ts` (change default to `'outlined'`)

### Step 1 — Write the failing tests

Create `packages/enforma-mui/src/components/MuiFormWrap.test.tsx`:

```tsx
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { registerComponents, clearRegistry } from 'enforma';
import { MuiFormWrap } from './MuiFormWrap';
import { MuiVariantContext } from '../context/MuiVariantContext';

vi.mock('@mui/x-date-pickers', () => ({
  LocalizationProvider: ({
    children,
    dateAdapter,
  }: {
    children: React.ReactNode;
    dateAdapter: { name?: string };
  }) => (
    <div
      data-testid="localization-provider"
      data-adapter={dateAdapter?.name ?? 'unknown'}
    >
      {children}
    </div>
  ),
}));

vi.mock('@mui/x-date-pickers/AdapterDayjs', () => ({
  default: class AdapterDayjs {
    static name = 'AdapterDayjs';
  },
}));

beforeEach(() => {
  clearRegistry();
});

describe('MuiFormWrap', () => {
  it('provides "outlined" variant context by default', () => {
    let captured: string | undefined;
    function Consumer() {
      captured = React.useContext(MuiVariantContext);
      return null;
    }
    registerComponents({});
    render(
      <MuiFormWrap>
        <Consumer />
      </MuiFormWrap>,
    );
    expect(captured).toBe('outlined');
  });

  it('provides the variant from registerComponents options', () => {
    let captured: string | undefined;
    function Consumer() {
      captured = React.useContext(MuiVariantContext);
      return null;
    }
    registerComponents({}, { variant: 'classic' });
    render(
      <MuiFormWrap>
        <Consumer />
      </MuiFormWrap>,
    );
    expect(captured).toBe('classic');
  });

  it('does not render LocalizationProvider when no dateAdapter is set', () => {
    registerComponents({}, { variant: 'outlined' });
    render(
      <MuiFormWrap>
        <span>child</span>
      </MuiFormWrap>,
    );
    expect(screen.queryByTestId('localization-provider')).not.toBeInTheDocument();
  });

  it('renders LocalizationProvider with correct adapter when dateAdapter is set', async () => {
    registerComponents({}, { variant: 'outlined', dateAdapter: 'dayjs' });
    render(
      <MuiFormWrap>
        <span>child</span>
      </MuiFormWrap>,
    );
    expect(await screen.findByTestId('localization-provider')).toBeInTheDocument();
    expect(screen.getByTestId('localization-provider')).toHaveAttribute(
      'data-adapter',
      'AdapterDayjs',
    );
  });
});
```

### Step 2 — Run to verify they fail

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm --filter enforma-mui test 2>&1 | tail -15
```

Expected: 4 failing tests (module not found for `MuiFormWrap`).

### Step 3 — Create `MuiFormWrap.tsx`

Create `packages/enforma-mui/src/components/MuiFormWrap.tsx`:

```tsx
import { lazy, Suspense, type ReactNode } from 'react';
import { getRegistryOptions } from 'enforma';
import { MuiVariantContext } from '../context/MuiVariantContext';

const adapterLoaders = {
  dayjs: () =>
    Promise.all([import('@mui/x-date-pickers'), import('@mui/x-date-pickers/AdapterDayjs')]),
  'date-fns': () =>
    Promise.all([import('@mui/x-date-pickers'), import('@mui/x-date-pickers/AdapterDateFns')]),
  luxon: () =>
    Promise.all([import('@mui/x-date-pickers'), import('@mui/x-date-pickers/AdapterLuxon')]),
  moment: () =>
    Promise.all([import('@mui/x-date-pickers'), import('@mui/x-date-pickers/AdapterMoment')]),
} as const;

type AdapterKey = keyof typeof adapterLoaders;

type WrapperComponent = (props: { children: ReactNode }) => React.ReactElement;
const wrapperCache = new Map<AdapterKey, React.LazyExoticComponent<WrapperComponent>>();

function getLocalizationWrapper(key: AdapterKey): React.LazyExoticComponent<WrapperComponent> {
  const cached = wrapperCache.get(key);
  if (cached !== undefined) return cached;

  const wrapper = lazy(async () => {
    const [{ LocalizationProvider }, { default: Adapter }] = await adapterLoaders[key]();
    const Wrapper: WrapperComponent = ({ children }) => (
      <LocalizationProvider dateAdapter={Adapter}>{children}</LocalizationProvider>
    );
    return { default: Wrapper };
  });

  wrapperCache.set(key, wrapper);
  return wrapper;
}

export function MuiFormWrap({ children }: { children: ReactNode }) {
  const { variant = 'outlined', dateAdapter } = getRegistryOptions();

  const inner = (
    <MuiVariantContext.Provider value={variant}>{children}</MuiVariantContext.Provider>
  );

  if (dateAdapter === undefined) return inner;

  const validKeys: AdapterKey[] = ['dayjs', 'date-fns', 'luxon', 'moment'];
  if (!(validKeys as string[]).includes(dateAdapter)) return inner;

  const LazyWrapper = getLocalizationWrapper(dateAdapter as AdapterKey);

  return (
    <Suspense fallback={inner}>
      <LazyWrapper>{inner}</LazyWrapper>
    </Suspense>
  );
}
```

### Step 4 — Change `MuiVariantContext` default to `'outlined'`

In `packages/enforma-mui/src/context/MuiVariantContext.ts`, change:

```typescript
export const MuiVariantContext = createContext<MuiVariant>('classic');
```

to:

```typescript
export const MuiVariantContext = createContext<MuiVariant>('outlined');
```

### Step 5 — Run tests

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm --filter enforma-mui test 2>&1 | tail -15
```

Expected: all passing (4 new MuiFormWrap tests + all prior tests).

### Step 6 — Typecheck and lint

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm typecheck && pnpm lint 2>&1 | tail -10
```

Fix any errors before continuing. Common issues: `@mui/x-date-pickers` types not installed — add to devDependencies in `packages/enforma-mui/package.json`:

```json
"@mui/x-date-pickers": "^7.25.0",
"dayjs": "^1"
```

Then also add as peerDependencies (optional):

```json
"@mui/x-date-pickers": "^7",
"dayjs": "^1",
"date-fns": "^3",
"luxon": "^3",
"moment": "^2"
```

And mark all new peerDeps as optional in `peerDependenciesMeta`:

```json
"@mui/x-date-pickers": { "optional": true },
"dayjs": { "optional": true },
"date-fns": { "optional": true },
"luxon": { "optional": true },
"moment": { "optional": true }
```

Re-run `pnpm install` after editing package.json:

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm install 2>&1 | tail -5
```

### Step 7 — Delete old provider files

```bash
rm packages/enforma-mui/src/context/ClassicProvider.tsx \
   packages/enforma-mui/src/context/OutlinedProvider.tsx \
   packages/enforma-mui/src/context/StandardProvider.tsx
```

Then run typecheck/lint again to confirm no remaining references:

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm typecheck && pnpm lint 2>&1 | tail -10
```

Fix any import errors that arise (will be in `index.ts` which is updated in Task 3).

### Step 8 — Commit

```bash
git add packages/enforma-mui/src/components/MuiFormWrap.tsx \
        packages/enforma-mui/src/components/MuiFormWrap.test.tsx \
        packages/enforma-mui/src/context/MuiVariantContext.ts \
        packages/enforma-mui/package.json
git commit -m "$(cat <<'EOF'
feat(enforma-mui): add MuiFormWrap replacing three provider files

Reads variant and dateAdapter from registry options. Lazy-loads
LocalizationProvider when dateAdapter is set. Default variant
changed to 'outlined' to match MUI defaults.
EOF
)"
```

---

## Task 3 — Refactor `enforma-mui/src/index.ts` + update demo

**Files:**
- Modify: `packages/enforma-mui/src/index.ts`
- Modify: `apps/demo/src/App.tsx`

### Step 1 — Read current index.ts

Read `packages/enforma-mui/src/index.ts` to see its current content before editing.

### Step 2 — Rewrite `index.ts`

Replace with:

```typescript
import type { EnformaComponentRegistry } from 'enforma';
import { TextInput } from './components/TextInput';
import { Checkbox } from './components/Checkbox';
import { Switch } from './components/Switch';
import { NumberInput } from './components/NumberInput';
import { Fieldset } from './components/Fieldset';
import { Select } from './components/Select';
import { SelectOption } from './components/SelectOption';
import { List } from './components/List';
import { ListItem } from './components/ListItem';
import { AddButton } from './components/AddButton';
import { FormModal } from './components/FormModal';
import { MuiFormWrap } from './components/MuiFormWrap';

const muiComponents = {
  TextInput,
  Checkbox,
  Switch,
  NumberInput,
  Fieldset,
  Select,
  SelectOption,
  List,
  ListItem,
  AddButton,
  FormModal,
  FormWrap: MuiFormWrap,
} satisfies Partial<EnformaComponentRegistry>;

export default muiComponents;

export {
  TextInput,
  Checkbox,
  Switch,
  NumberInput,
  Fieldset,
  Select,
  SelectOption,
  List,
  ListItem,
  AddButton,
  FormModal,
  MuiFormWrap,
};
export type { MuiVariant } from './context/MuiVariantContext';
```

### Step 3 — Update `apps/demo/src/App.tsx`

Read `apps/demo/src/App.tsx` first to see current imports.

Replace the bundle import and `registerComponents` call:

```typescript
// Before
import { classic, outlined, standard } from 'enforma-mui';
// ...
const bundleMap = { classic, outlined, standard };
type VariantKey = keyof typeof bundleMap;
registerComponents(classic);
// ...
const handleVariantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
  const v = e.target.value as VariantKey;
  registerComponents(bundleMap[v]);
  setVariant(v);
};

// After
import muiComponents from 'enforma-mui';
// ...
type VariantKey = 'classic' | 'outlined' | 'standard';
registerComponents(muiComponents, { variant: 'classic' });
// ...
const handleVariantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
  const v = e.target.value as VariantKey;
  registerComponents(muiComponents, { variant: v });
  setVariant(v);
};
```

Also remove the `bundleMap` constant and update the `variant` state initial value to `'classic'`.

### Step 4 — Full test + typecheck + lint

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm typecheck && pnpm lint && pnpm test 2>&1 | tail -20
```

Expected: all passing. Fix any errors.

### Step 5 — Commit

```bash
git add packages/enforma-mui/src/index.ts apps/demo/src/App.tsx
git commit -m "$(cat <<'EOF'
refactor(enforma-mui): single default export, options-based configuration

Replaces classic/outlined/standard bundle exports with a single
muiComponents default export. Variant and dateAdapter configured
via registerComponents(muiComponents, { variant, dateAdapter }).
EOF
)"
```

---

## Task 4 — DatePicker core types + dispatch

**Files:**
- Modify (tests): `packages/enforma/src/components/Form.test.tsx`
- Modify: `packages/enforma/src/components/types.ts`
- Modify: `packages/enforma/src/components/fields.tsx`
- Modify: `packages/enforma/src/index.ts`

### Step 1 — Write failing tests

Append to `Form.test.tsx`:

```tsx
describe('DatePicker typeValidator', () => {
  it('shows no error when value is undefined', () => {
    function Field({ bind }: { bind: string }) {
      const { showError } = useFieldProps<FieldResolved<Date | string>>(
        { bind },
        { typeValidator: (v) => (v === undefined || v instanceof Date ? null : 'invalidDate') },
      );
      return <div>{showError && <span>error</span>}</div>;
    }

    render(
      <Form values={{ d: undefined }} onChange={vi.fn()} showErrors>
        <Field bind="d" />
      </Form>,
    );
    expect(screen.queryByText('error')).not.toBeInTheDocument();
  });

  it('shows no error when value is a Date', () => {
    function Field({ bind }: { bind: string }) {
      const { showError } = useFieldProps<FieldResolved<Date | string>>(
        { bind },
        { typeValidator: (v) => (v === undefined || v instanceof Date ? null : 'invalidDate') },
      );
      return <div>{showError && <span>error</span>}</div>;
    }

    render(
      <Form values={{ d: new Date() }} onChange={vi.fn()} showErrors>
        <Field bind="d" />
      </Form>,
    );
    expect(screen.queryByText('error')).not.toBeInTheDocument();
  });

  it('shows invalidDate error when value is a string', async () => {
    function Field({ bind }: { bind: string }) {
      const { error, showError, onBlur } = useFieldProps<FieldResolved<Date | string>>(
        { bind },
        { typeValidator: (v) => (v === undefined || v instanceof Date ? null : 'invalidDate') },
      );
      return (
        <div>
          <button aria-label={bind} onBlur={onBlur} />
          {showError && <span>{error}</span>}
        </div>
      );
    }

    render(
      <Form values={{ d: '03/03/' }} onChange={vi.fn()}>
        <Field bind="d" />
      </Form>,
    );

    screen.getByRole('button', { name: 'd' }).focus();
    await userEvent.tab();
    expect(await screen.findByText('invalidDate')).toBeInTheDocument();
  });

  it('reports isValid=false in onChange when value is a string', () => {
    const onChange = vi.fn();

    function Field({ bind }: { bind: string }) {
      useFieldProps<FieldResolved<Date | string>>(
        { bind },
        { typeValidator: (v) => (v === undefined || v instanceof Date ? null : 'invalidDate') },
      );
      return null;
    }

    render(
      <Form values={{ d: '03/03/' }} onChange={onChange}>
        <Field bind="d" />
      </Form>,
    );

    expect(onChange).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ isValid: false }),
    );
  });
});
```

### Step 2 — Run to verify they fail

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm --filter enforma test 2>&1 | tail -10
```

Expected: 4 failing tests (the typeValidator itself already works — these use the same mechanism as before; they should pass immediately). If they do pass, proceed. If they fail for other reasons, investigate.

### Step 3 — Add types to `types.ts`

**a) Add `DatePickerProps`** after `NumberInputProps`:

```typescript
export type DatePickerProps = CommonProps & {
  minDate?: Reactive<Date>;
  maxDate?: Reactive<Date>;
  disableFuture?: Reactive<boolean>;
  disablePast?: Reactive<boolean>;
};
```

**b) Add `ResolvedDatePickerProps`** after `ResolvedNumberInputProps`:

```typescript
export type ResolvedDatePickerProps = Omit<ResolvedCommonProps, 'value' | 'setValue'> & {
  value: Date | string | undefined;
  setValue: (value: Date | string | undefined) => void;
  minDate?: Date;
  maxDate?: Date;
  disableFuture?: boolean;
  disablePast?: boolean;
};
```

**c) Add to `ComponentPropsMap`**:

```typescript
DatePicker: ResolvedDatePickerProps;
```

### Step 4 — Add dispatch to `fields.tsx`

**a)** Add to the type imports:

```typescript
import type {
  // ... existing ...
  DatePickerProps,
  ResolvedDatePickerProps,
} from './types';
```

**b)** Add dispatch function after `NumberInputDispatch`:

```typescript
function DatePickerDispatch(props: DatePickerProps) {
  return dispatchComponent(
    'DatePicker',
    useFieldProps<ResolvedDatePickerProps>(props, {
      typeValidator: (v): string | null => {
        if (v === undefined) return null;
        if (v instanceof Date) return null;
        return 'invalidDate';
      },
    }),
  );
}
```

**c)** Add export:

```typescript
export const DatePicker = memo(DatePickerDispatch, stablePropsEqual);
```

### Step 5 — Export from `index.ts`

Add to the props type exports:

```typescript
DatePickerProps,
```

Add to the resolved type exports:

```typescript
ResolvedDatePickerProps,
```

### Step 6 — Run tests + typecheck + lint

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm --filter enforma test 2>&1 | tail -10
pnpm typecheck && pnpm lint 2>&1 | tail -10
```

Expected: all passing.

### Step 7 — Commit

```bash
git add packages/enforma/src/components/types.ts \
        packages/enforma/src/components/fields.tsx \
        packages/enforma/src/components/Form.test.tsx \
        packages/enforma/src/index.ts
git commit -m "$(cat <<'EOF'
feat(enforma): add DatePicker field type and dispatch

Stores Date | string | undefined. TypeValidator returns 'invalidDate'
for any string value (partial/invalid entry), null for Date or undefined.
EOF
)"
```

---

## Task 5 — TimePicker core types + dispatch

**Files:**
- Modify (tests): `packages/enforma/src/components/Form.test.tsx`
- Modify: `packages/enforma/src/components/types.ts`
- Modify: `packages/enforma/src/components/fields.tsx`
- Modify: `packages/enforma/src/index.ts`

### Step 1 — Write failing tests

Append to `Form.test.tsx`:

```tsx
describe('TimePicker typeValidator', () => {
  const timeValidator = (v: unknown): string | null => {
    if (v === undefined) return null;
    if (typeof v === 'string' && /^\d{2}:\d{2}$/.test(v)) return null;
    return 'invalidTime';
  };

  it('shows no error when value is undefined', () => {
    function Field({ bind }: { bind: string }) {
      const { showError } = useFieldProps<FieldResolved<string>>(
        { bind },
        { typeValidator: timeValidator },
      );
      return <div>{showError && <span>error</span>}</div>;
    }
    render(
      <Form values={{ t: undefined }} onChange={vi.fn()} showErrors>
        <Field bind="t" />
      </Form>,
    );
    expect(screen.queryByText('error')).not.toBeInTheDocument();
  });

  it('shows no error when value is a valid HH:mm string', () => {
    function Field({ bind }: { bind: string }) {
      const { showError } = useFieldProps<FieldResolved<string>>(
        { bind },
        { typeValidator: timeValidator },
      );
      return <div>{showError && <span>error</span>}</div>;
    }
    render(
      <Form values={{ t: '14:30' }} onChange={vi.fn()} showErrors>
        <Field bind="t" />
      </Form>,
    );
    expect(screen.queryByText('error')).not.toBeInTheDocument();
  });

  it('shows invalidTime error when value is a partial time string', async () => {
    function Field({ bind }: { bind: string }) {
      const { error, showError, onBlur } = useFieldProps<FieldResolved<string>>(
        { bind },
        { typeValidator: timeValidator },
      );
      return (
        <div>
          <button aria-label={bind} onBlur={onBlur} />
          {showError && <span>{error}</span>}
        </div>
      );
    }
    render(
      <Form values={{ t: '14:' }} onChange={vi.fn()}>
        <Field bind="t" />
      </Form>,
    );
    screen.getByRole('button', { name: 't' }).focus();
    await userEvent.tab();
    expect(await screen.findByText('invalidTime')).toBeInTheDocument();
  });
});
```

### Step 2 — Run to verify

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm --filter enforma test 2>&1 | tail -10
```

Expected: new tests pass immediately (typeValidator mechanism already works).

### Step 3 — Add types to `types.ts`

**a)** Add `TimePickerProps` after `DatePickerProps`:

```typescript
export type TimePickerProps = CommonProps & {
  minTime?: Reactive<Date>;
  maxTime?: Reactive<Date>;
  ampm?: Reactive<boolean>;
};
```

**b)** Add `ResolvedTimePickerProps` after `ResolvedDatePickerProps`:

```typescript
export type ResolvedTimePickerProps = Omit<ResolvedCommonProps, 'value' | 'setValue'> & {
  value: string | undefined; // "HH:mm" when valid, partial string during entry
  setValue: (value: string | undefined) => void;
  minTime?: Date;
  maxTime?: Date;
  ampm?: boolean;
};
```

**c)** Add to `ComponentPropsMap`:

```typescript
TimePicker: ResolvedTimePickerProps;
```

### Step 4 — Add dispatch to `fields.tsx`

```typescript
function TimePickerDispatch(props: TimePickerProps) {
  return dispatchComponent(
    'TimePicker',
    useFieldProps<ResolvedTimePickerProps>(props, {
      typeValidator: (v): string | null => {
        if (v === undefined) return null;
        if (typeof v === 'string' && /^\d{2}:\d{2}$/.test(v)) return null;
        return 'invalidTime';
      },
    }),
  );
}
```

Export: `export const TimePicker = memo(TimePickerDispatch, stablePropsEqual);`

### Step 5 — Export from `index.ts`

Add `TimePickerProps` and `ResolvedTimePickerProps` to the respective export blocks.

### Step 6 — Typecheck + lint + commit

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm typecheck && pnpm lint && pnpm --filter enforma test 2>&1 | tail -10
```

```bash
git add packages/enforma/src/components/types.ts \
        packages/enforma/src/components/fields.tsx \
        packages/enforma/src/components/Form.test.tsx \
        packages/enforma/src/index.ts
git commit -m "$(cat <<'EOF'
feat(enforma): add TimePicker field type and dispatch

Stores string | undefined. Valid value is "HH:mm" format.
TypeValidator returns 'invalidTime' for any other non-undefined value.
EOF
)"
```

---

## Task 6 — DateTimePicker core types + dispatch

**Files:**
- Modify: `packages/enforma/src/components/types.ts`
- Modify: `packages/enforma/src/components/fields.tsx`
- Modify: `packages/enforma/src/index.ts`

No new Form.test.tsx tests needed — the typeValidator pattern is fully covered by Tasks 4 and 5.

### Step 1 — Add types to `types.ts`

**a)** Add `DateTimePickerProps` after `TimePickerProps`:

```typescript
export type DateTimePickerProps = DatePickerProps & Pick<TimePickerProps, 'ampm'>;
```

**b)** Add `ResolvedDateTimePickerProps` after `ResolvedTimePickerProps`:

```typescript
export type ResolvedDateTimePickerProps = Omit<ResolvedCommonProps, 'value' | 'setValue'> & {
  value: Date | string | undefined;
  setValue: (value: Date | string | undefined) => void;
  minDate?: Date;
  maxDate?: Date;
  disableFuture?: boolean;
  disablePast?: boolean;
  ampm?: boolean;
};
```

**c)** Add to `ComponentPropsMap`:

```typescript
DateTimePicker: ResolvedDateTimePickerProps;
```

### Step 2 — Add dispatch to `fields.tsx`

```typescript
function DateTimePickerDispatch(props: DateTimePickerProps) {
  return dispatchComponent(
    'DateTimePicker',
    useFieldProps<ResolvedDateTimePickerProps>(props, {
      typeValidator: (v): string | null => {
        if (v === undefined) return null;
        if (v instanceof Date) return null;
        return 'invalidDateTime';
      },
    }),
  );
}
```

Export: `export const DateTimePicker = memo(DateTimePickerDispatch, stablePropsEqual);`

### Step 3 — Export from `index.ts`

Add `DateTimePickerProps` and `ResolvedDateTimePickerProps` to the respective export blocks.

### Step 4 — Typecheck + lint + test + commit

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm typecheck && pnpm lint && pnpm --filter enforma test 2>&1 | tail -10
```

```bash
git add packages/enforma/src/components/types.ts \
        packages/enforma/src/components/fields.tsx \
        packages/enforma/src/index.ts
git commit -m "$(cat <<'EOF'
feat(enforma): add DateTimePicker field type and dispatch

Stores Date | string | undefined — same type as DatePicker.
TypeValidator returns 'invalidDateTime' for string values.
EOF
)"
```

---

## Task 7 — MUI DatePicker adapter + tests

**Files:**
- Create: `packages/enforma-mui/src/components/DatePicker.tsx`
- Create: `packages/enforma-mui/src/components/DatePicker.test.tsx`

### Step 1 — Create the test file first

Create `packages/enforma-mui/src/components/DatePicker.test.tsx`:

```tsx
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Enforma, { Form, registerComponents, clearRegistry } from 'enforma';
import { DatePicker } from './DatePicker';

vi.mock('@mui/x-date-pickers', () => ({
  DatePicker: ({
    onChange,
    value,
    disabled,
    slotProps,
  }: {
    onChange: (date: Date | null) => void;
    value: Date | null;
    disabled?: boolean;
    slotProps?: {
      textField?: {
        onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
        onBlur?: () => void;
        helperText?: React.ReactNode;
        error?: boolean;
      };
    };
  }) => (
    <input
      data-testid="date-picker-input"
      disabled={disabled}
      value={value instanceof Date ? value.toISOString().slice(0, 10) : ''}
      onChange={(e) => {
        const raw = e.target.value;
        slotProps?.textField?.onChange?.(e);
        if (raw === '') {
          onChange(null);
        } else {
          const d = new Date(raw);
          onChange(isNaN(d.getTime()) ? null : d);
        }
      }}
      onBlur={slotProps?.textField?.onBlur}
    />
  ),
}));

beforeEach(() => {
  clearRegistry();
  registerComponents({ DatePicker });
});

describe('MUI DatePicker', () => {
  it('renders an input', async () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.DatePicker bind="date" label="Date" />
      </Form>,
    );
    expect(await screen.findByTestId('date-picker-input')).toBeInTheDocument();
  });

  it('displays empty string when form value is undefined', async () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.DatePicker bind="date" label="Date" />
      </Form>,
    );
    expect(await screen.findByTestId('date-picker-input')).toHaveValue('');
  });

  it('displays the date when form value is a Date', async () => {
    const d = new Date('2026-03-03');
    render(
      <Form values={{ date: d }} onChange={() => undefined}>
        <Enforma.DatePicker bind="date" label="Date" />
      </Form>,
    );
    expect(await screen.findByTestId('date-picker-input')).toHaveValue('2026-03-03');
  });

  it('calls onChange with a Date when user enters a valid date', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ date: undefined }} onChange={onChange}>
        <Enforma.DatePicker bind="date" label="Date" />
      </Form>,
    );
    const input = await screen.findByTestId('date-picker-input');
    await userEvent.type(input, '2026-03-03');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ date: expect.any(Date) }),
      expect.anything(),
    );
  });

  it('calls onChange with undefined when user clears the field', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ date: new Date('2026-03-03') }} onChange={onChange}>
        <Enforma.DatePicker bind="date" label="Date" />
      </Form>,
    );
    const input = await screen.findByTestId('date-picker-input');
    await userEvent.clear(input);
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ date: undefined }),
      expect.anything(),
    );
  });

  it('calls onChange with a string when user enters invalid text', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ date: undefined }} onChange={onChange}>
        <Enforma.DatePicker bind="date" label="Date" />
      </Form>,
    );
    const input = await screen.findByTestId('date-picker-input');
    await userEvent.type(input, 'bad');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ date: 'bad' }),
      expect.anything(),
    );
  });

  it('is disabled when disabled prop is true', async () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.DatePicker bind="date" label="Date" disabled />
      </Form>,
    );
    expect(await screen.findByTestId('date-picker-input')).toBeDisabled();
  });

  it('shows validate() error after blur', async () => {
    render(
      <Form values={{ date: undefined }} onChange={() => undefined}>
        <Enforma.DatePicker
          bind="date"
          label="Date"
          validate={(v) => (v === undefined ? 'Date is required' : null)}
        />
      </Form>,
    );
    const input = await screen.findByTestId('date-picker-input');
    input.focus();
    await userEvent.tab();
    expect(await screen.findByText('Date is required')).toBeInTheDocument();
  });

  it('does not show error before blur', async () => {
    render(
      <Form values={{ date: undefined }} onChange={() => undefined}>
        <Enforma.DatePicker
          bind="date"
          label="Date"
          validate={(v) => (v === undefined ? 'Date is required' : null)}
        />
      </Form>,
    );
    await screen.findByTestId('date-picker-input');
    expect(screen.queryByText('Date is required')).not.toBeInTheDocument();
  });

  it('reveals errors on submit', async () => {
    render(
      <Form values={{ date: undefined }} onChange={() => undefined}>
        <Enforma.DatePicker
          bind="date"
          label="Date"
          validate={(v) => (v === undefined ? 'Date is required' : null)}
        />
        <button type="submit">Submit</button>
      </Form>,
    );
    await screen.findByTestId('date-picker-input');
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByText('Date is required')).toBeInTheDocument();
  });

  it('reports isValid=false when value is a string', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ date: '03/03/' }} onChange={onChange}>
        <Enforma.DatePicker bind="date" label="Date" />
      </Form>,
    );
    await screen.findByTestId('date-picker-input');
    expect(onChange).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ isValid: false }),
    );
  });

  it('throws a clear error when @mui/x-date-pickers is not installed', async () => {
    vi.resetModules();
    vi.doMock('@mui/x-date-pickers', () => {
      throw new Error("Cannot find module '@mui/x-date-pickers'");
    });

    const { DatePicker: FreshDatePicker } = await import('./DatePicker');

    const errors: Error[] = [];
    class ErrorBoundary extends React.Component<
      { children: React.ReactNode },
      { error: Error | null }
    > {
      state = { error: null as Error | null };
      static getDerivedStateFromError(error: Error) {
        return { error };
      }
      componentDidCatch(error: Error) {
        errors.push(error);
      }
      render() {
        if (this.state.error !== null) return null;
        return this.props.children;
      }
    }

    render(
      <ErrorBoundary>
        <FreshDatePicker
          value={undefined}
          setValue={() => undefined}
          label="Date"
          disabled={false}
          placeholder={undefined}
          description={undefined}
          error={null}
          showError={false}
          onBlur={() => undefined}
        />
      </ErrorBoundary>,
    );

    await waitFor(() => {
      expect(errors[0]?.message).toMatch('@mui/x-date-pickers');
    });
  });
});
```

### Step 2 — Run to verify tests fail

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm --filter enforma-mui test 2>&1 | tail -15
```

Expected: tests fail because `DatePicker.tsx` doesn't exist.

### Step 3 — Create `DatePicker.tsx`

Create `packages/enforma-mui/src/components/DatePicker.tsx`:

```tsx
import { lazy, Suspense, useContext, useId, useRef } from 'react';
import { FormLabel, TextField } from '@mui/material';
import type { ResolvedDatePickerProps } from 'enforma';
import { ComponentWrap } from './ComponentWrap';
import { MuiVariantContext } from '../context/MuiVariantContext';

function DatePickerSkeleton({
  label,
  disabled = false,
  description,
  error,
  showError,
  onBlur,
  value,
}: ResolvedDatePickerProps) {
  const variant = useContext(MuiVariantContext);
  const id = useId();
  const displayValue =
    value instanceof Date
      ? value.toLocaleDateString()
      : typeof value === 'string'
        ? value
        : '';

  const commonProps = {
    value: displayValue,
    onChange: () => undefined,
    onBlur,
    disabled: true,
    fullWidth: true,
    error: showError,
    helperText: showError ? error : description,
  } as const;

  if (variant === 'classic') {
    return (
      <ComponentWrap error={showError} disabled={disabled}>
        {label !== undefined && <FormLabel htmlFor={id}>{label}</FormLabel>}
        <TextField
          {...commonProps}
          variant="outlined"
          size="small"
          slotProps={{ htmlInput: { id } }}
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

const LazyDatePicker = lazy(() =>
  import('@mui/x-date-pickers')
    .then(({ DatePicker: MuiDatePicker }) => {
      function DatePickerImpl({
        value,
        setValue,
        label,
        disabled = false,
        description,
        error,
        showError,
        onBlur,
        minDate,
        maxDate,
        disableFuture,
        disablePast,
      }: ResolvedDatePickerProps) {
        const rawInputRef = useRef('');
        const dateValue = value instanceof Date ? value : null;

        return (
          <ComponentWrap error={showError} disabled={disabled}>
            <MuiDatePicker
              value={dateValue}
              label={label}
              disabled={disabled}
              minDate={minDate}
              maxDate={maxDate}
              disableFuture={disableFuture}
              disablePast={disablePast}
              onChange={(date) => {
                if (date instanceof Date && !isNaN(date.getTime())) {
                  setValue(date);
                } else if (rawInputRef.current === '') {
                  setValue(undefined);
                } else {
                  setValue(rawInputRef.current);
                }
              }}
              slotProps={{
                textField: {
                  error: showError,
                  helperText: showError ? error : description,
                  fullWidth: true,
                  onBlur,
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                    rawInputRef.current = e.target.value;
                  },
                },
              }}
            />
          </ComponentWrap>
        );
      }
      DatePickerImpl.displayName = 'DatePicker';
      return { default: DatePickerImpl };
    })
    .catch(() => {
      throw new Error(
        'enforma-mui: DatePicker requires `@mui/x-date-pickers`. Run: pnpm add @mui/x-date-pickers dayjs',
      );
    }),
);

export function DatePicker(props: ResolvedDatePickerProps) {
  return (
    <Suspense fallback={<DatePickerSkeleton {...props} />}>
      <LazyDatePicker {...props} />
    </Suspense>
  );
}
```

### Step 4 — Run tests

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm --filter enforma-mui test 2>&1 | tail -20
```

Expected: all DatePicker tests pass. Fix any type errors.

### Step 5 — Typecheck + lint + commit

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm typecheck && pnpm lint 2>&1 | tail -10
```

```bash
git add packages/enforma-mui/src/components/DatePicker.tsx \
        packages/enforma-mui/src/components/DatePicker.test.tsx
git commit -m "$(cat <<'EOF'
feat(enforma-mui): add DatePicker adapter with @mui/x-date-pickers

Lazy-loads DatePicker. Captures raw text via ref (synchronous) to
store partial strings as form state. Stores Date when valid,
string when partial, undefined when empty.
EOF
)"
```

---

## Task 8 — MUI TimePicker adapter + tests

**Files:**
- Create: `packages/enforma-mui/src/components/TimePicker.tsx`
- Create: `packages/enforma-mui/src/components/TimePicker.test.tsx`

### Step 1 — Create test file

Create `packages/enforma-mui/src/components/TimePicker.test.tsx`:

```tsx
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Enforma, { Form, registerComponents, clearRegistry } from 'enforma';
import { TimePicker } from './TimePicker';

vi.mock('@mui/x-date-pickers', () => ({
  TimePicker: ({
    onChange,
    value,
    disabled,
    slotProps,
  }: {
    onChange: (date: Date | null) => void;
    value: Date | null;
    disabled?: boolean;
    slotProps?: {
      textField?: {
        onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
        onBlur?: () => void;
      };
    };
  }) => {
    const displayValue =
      value instanceof Date
        ? `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`
        : '';
    return (
      <input
        data-testid="time-picker-input"
        disabled={disabled}
        value={displayValue}
        onChange={(e) => {
          const raw = e.target.value;
          slotProps?.textField?.onChange?.(e);
          if (raw === '') {
            onChange(null);
          } else {
            const [h, m] = raw.split(':');
            if (h !== undefined && m !== undefined) {
              const d = new Date();
              d.setHours(Number(h), Number(m), 0, 0);
              onChange(isNaN(d.getTime()) ? null : d);
            } else {
              onChange(null);
            }
          }
        }}
        onBlur={slotProps?.textField?.onBlur}
      />
    );
  },
}));

beforeEach(() => {
  clearRegistry();
  registerComponents({ TimePicker });
});

describe('MUI TimePicker', () => {
  it('renders an input', async () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.TimePicker bind="time" label="Time" />
      </Form>,
    );
    expect(await screen.findByTestId('time-picker-input')).toBeInTheDocument();
  });

  it('displays empty string when value is undefined', async () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.TimePicker bind="time" label="Time" />
      </Form>,
    );
    expect(await screen.findByTestId('time-picker-input')).toHaveValue('');
  });

  it('displays HH:mm when value is a valid time string', async () => {
    render(
      <Form values={{ time: '14:30' }} onChange={() => undefined}>
        <Enforma.TimePicker bind="time" label="Time" />
      </Form>,
    );
    expect(await screen.findByTestId('time-picker-input')).toHaveValue('14:30');
  });

  it('calls onChange with HH:mm string when user enters valid time', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ time: undefined }} onChange={onChange}>
        <Enforma.TimePicker bind="time" label="Time" />
      </Form>,
    );
    const input = await screen.findByTestId('time-picker-input');
    await userEvent.type(input, '09:00');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ time: '09:00' }),
      expect.anything(),
    );
  });

  it('calls onChange with undefined when user clears the field', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ time: '14:30' }} onChange={onChange}>
        <Enforma.TimePicker bind="time" label="Time" />
      </Form>,
    );
    const input = await screen.findByTestId('time-picker-input');
    await userEvent.clear(input);
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ time: undefined }),
      expect.anything(),
    );
  });

  it('calls onChange with a partial string when user enters incomplete time', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ time: undefined }} onChange={onChange}>
        <Enforma.TimePicker bind="time" label="Time" />
      </Form>,
    );
    const input = await screen.findByTestId('time-picker-input');
    await userEvent.type(input, '14:');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ time: '14:' }),
      expect.anything(),
    );
  });

  it('is disabled when disabled prop is true', async () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.TimePicker bind="time" label="Time" disabled />
      </Form>,
    );
    expect(await screen.findByTestId('time-picker-input')).toBeDisabled();
  });

  it('shows validate() error after blur', async () => {
    render(
      <Form values={{ time: undefined }} onChange={() => undefined}>
        <Enforma.TimePicker
          bind="time"
          label="Time"
          validate={(v) => (v === undefined ? 'Time is required' : null)}
        />
      </Form>,
    );
    const input = await screen.findByTestId('time-picker-input');
    input.focus();
    await userEvent.tab();
    expect(await screen.findByText('Time is required')).toBeInTheDocument();
  });
});
```

### Step 2 — Run to verify tests fail

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm --filter enforma-mui test 2>&1 | tail -10
```

### Step 3 — Create `TimePicker.tsx`

Create `packages/enforma-mui/src/components/TimePicker.tsx`:

```tsx
import { lazy, Suspense, useContext, useId, useRef } from 'react';
import { FormLabel, TextField } from '@mui/material';
import type { ResolvedTimePickerProps } from 'enforma';
import { ComponentWrap } from './ComponentWrap';
import { MuiVariantContext } from '../context/MuiVariantContext';

function timeToDate(hhmm: string): Date | null {
  const parts = hhmm.split(':');
  if (parts.length !== 2) return null;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (isNaN(h) || isNaN(m)) return null;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function dateToHHMM(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function TimePickerSkeleton({
  label,
  disabled = false,
  description,
  error,
  showError,
  onBlur,
  value,
}: ResolvedTimePickerProps) {
  const variant = useContext(MuiVariantContext);
  const id = useId();
  const displayValue = value ?? '';

  const commonProps = {
    value: displayValue,
    onChange: () => undefined,
    onBlur,
    disabled: true,
    fullWidth: true,
    error: showError,
    helperText: showError ? error : description,
  } as const;

  if (variant === 'classic') {
    return (
      <ComponentWrap error={showError} disabled={disabled}>
        {label !== undefined && <FormLabel htmlFor={id}>{label}</FormLabel>}
        <TextField
          {...commonProps}
          variant="outlined"
          size="small"
          slotProps={{ htmlInput: { id } }}
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

const LazyTimePicker = lazy(() =>
  import('@mui/x-date-pickers')
    .then(({ TimePicker: MuiTimePicker }) => {
      function TimePickerImpl({
        value,
        setValue,
        label,
        disabled = false,
        description,
        error,
        showError,
        onBlur,
        minTime,
        maxTime,
        ampm,
      }: ResolvedTimePickerProps) {
        const rawInputRef = useRef('');
        const timeValue =
          typeof value === 'string' && /^\d{2}:\d{2}$/.test(value) ? timeToDate(value) : null;

        return (
          <ComponentWrap error={showError} disabled={disabled}>
            <MuiTimePicker
              value={timeValue}
              label={label}
              disabled={disabled}
              minTime={minTime}
              maxTime={maxTime}
              ampm={ampm}
              onChange={(date) => {
                if (date instanceof Date && !isNaN(date.getTime())) {
                  setValue(dateToHHMM(date));
                } else if (rawInputRef.current === '') {
                  setValue(undefined);
                } else {
                  setValue(rawInputRef.current);
                }
              }}
              slotProps={{
                textField: {
                  error: showError,
                  helperText: showError ? error : description,
                  fullWidth: true,
                  onBlur,
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                    rawInputRef.current = e.target.value;
                  },
                },
              }}
            />
          </ComponentWrap>
        );
      }
      TimePickerImpl.displayName = 'TimePicker';
      return { default: TimePickerImpl };
    })
    .catch(() => {
      throw new Error(
        'enforma-mui: TimePicker requires `@mui/x-date-pickers`. Run: pnpm add @mui/x-date-pickers dayjs',
      );
    }),
);

export function TimePicker(props: ResolvedTimePickerProps) {
  return (
    <Suspense fallback={<TimePickerSkeleton {...props} />}>
      <LazyTimePicker {...props} />
    </Suspense>
  );
}
```

### Step 4 — Run tests + typecheck + lint + commit

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm --filter enforma-mui test 2>&1 | tail -15
pnpm typecheck && pnpm lint 2>&1 | tail -10
```

```bash
git add packages/enforma-mui/src/components/TimePicker.tsx \
        packages/enforma-mui/src/components/TimePicker.test.tsx
git commit -m "$(cat <<'EOF'
feat(enforma-mui): add TimePicker adapter

Converts MUI Date output to HH:mm string. Stores string | undefined.
Captures partial text via ref for intermediate state.
EOF
)"
```

---

## Task 9 — MUI DateTimePicker adapter + tests

**Files:**
- Create: `packages/enforma-mui/src/components/DateTimePicker.tsx`
- Create: `packages/enforma-mui/src/components/DateTimePicker.test.tsx`

### Step 1 — Create test file

Create `packages/enforma-mui/src/components/DateTimePicker.test.tsx`:

```tsx
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Enforma, { Form, registerComponents, clearRegistry } from 'enforma';
import { DateTimePicker } from './DateTimePicker';

vi.mock('@mui/x-date-pickers', () => ({
  DateTimePicker: ({
    onChange,
    value,
    disabled,
    slotProps,
  }: {
    onChange: (date: Date | null) => void;
    value: Date | null;
    disabled?: boolean;
    slotProps?: {
      textField?: {
        onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
        onBlur?: () => void;
      };
    };
  }) => (
    <input
      data-testid="datetime-picker-input"
      disabled={disabled}
      value={value instanceof Date ? value.toISOString().slice(0, 16) : ''}
      onChange={(e) => {
        const raw = e.target.value;
        slotProps?.textField?.onChange?.(e);
        if (raw === '') {
          onChange(null);
        } else {
          const d = new Date(raw);
          onChange(isNaN(d.getTime()) ? null : d);
        }
      }}
      onBlur={slotProps?.textField?.onBlur}
    />
  ),
}));

beforeEach(() => {
  clearRegistry();
  registerComponents({ DateTimePicker });
});

describe('MUI DateTimePicker', () => {
  it('renders an input', async () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.DateTimePicker bind="dt" label="Date & Time" />
      </Form>,
    );
    expect(await screen.findByTestId('datetime-picker-input')).toBeInTheDocument();
  });

  it('displays empty string when value is undefined', async () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.DateTimePicker bind="dt" label="Date & Time" />
      </Form>,
    );
    expect(await screen.findByTestId('datetime-picker-input')).toHaveValue('');
  });

  it('calls onChange with a Date when user enters valid datetime', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ dt: undefined }} onChange={onChange}>
        <Enforma.DateTimePicker bind="dt" label="Date & Time" />
      </Form>,
    );
    const input = await screen.findByTestId('datetime-picker-input');
    await userEvent.type(input, '2026-03-03T14:30');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ dt: expect.any(Date) }),
      expect.anything(),
    );
  });

  it('calls onChange with undefined when cleared', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ dt: new Date('2026-03-03T14:30') }} onChange={onChange}>
        <Enforma.DateTimePicker bind="dt" label="Date & Time" />
      </Form>,
    );
    const input = await screen.findByTestId('datetime-picker-input');
    await userEvent.clear(input);
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ dt: undefined }),
      expect.anything(),
    );
  });

  it('calls onChange with string when user enters partial text', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ dt: undefined }} onChange={onChange}>
        <Enforma.DateTimePicker bind="dt" label="Date & Time" />
      </Form>,
    );
    const input = await screen.findByTestId('datetime-picker-input');
    await userEvent.type(input, 'bad');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ dt: 'bad' }),
      expect.anything(),
    );
  });

  it('shows validate() error after blur', async () => {
    render(
      <Form values={{ dt: undefined }} onChange={() => undefined}>
        <Enforma.DateTimePicker
          bind="dt"
          label="Date & Time"
          validate={(v) => (v === undefined ? 'Required' : null)}
        />
      </Form>,
    );
    const input = await screen.findByTestId('datetime-picker-input');
    input.focus();
    await userEvent.tab();
    expect(await screen.findByText('Required')).toBeInTheDocument();
  });
});
```

### Step 2 — Run to verify tests fail

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm --filter enforma-mui test 2>&1 | tail -10
```

### Step 3 — Create `DateTimePicker.tsx`

Create `packages/enforma-mui/src/components/DateTimePicker.tsx` — follow the exact same structure as `DatePicker.tsx` but:
- Import `ResolvedDateTimePickerProps` instead of `ResolvedDatePickerProps`
- Use `DateTimePicker` from `@mui/x-date-pickers` instead of `DatePicker`
- Add `ampm` prop to the MUI component
- Skeleton `data-testid` is `"datetime-picker-skeleton"` (or just use `TextField` — same as DatePicker skeleton)
- Error message: `'enforma-mui: DateTimePicker requires \`@mui/x-date-pickers\`...'`

The `onChange` logic is identical to `DatePicker` (stores `Date | string | undefined`).

### Step 4 — Run tests + typecheck + lint + commit

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm --filter enforma-mui test 2>&1 | tail -15
pnpm typecheck && pnpm lint 2>&1 | tail -10
```

```bash
git add packages/enforma-mui/src/components/DateTimePicker.tsx \
        packages/enforma-mui/src/components/DateTimePicker.test.tsx
git commit -m "$(cat <<'EOF'
feat(enforma-mui): add DateTimePicker adapter

Same value semantics as DatePicker (Date | string | undefined).
Adds ampm prop. Lazy-loads @mui/x-date-pickers DateTimePicker.
EOF
)"
```

---

## Task 10 — Register pickers in bundle + add demo section

**Files:**
- Modify: `packages/enforma-mui/src/index.ts`
- Modify: `apps/demo/src/App.tsx`
- Modify: `docs/TODO.md`

### Step 1 — Update `packages/enforma-mui/src/index.ts`

Add imports after `NumberInput`:

```typescript
import { DatePicker } from './components/DatePicker';
import { TimePicker } from './components/TimePicker';
import { DateTimePicker } from './components/DateTimePicker';
```

Add to `muiComponents`:

```typescript
DatePicker,
TimePicker,
DateTimePicker,
```

Add to named exports:

```typescript
export { ..., DatePicker, TimePicker, DateTimePicker };
```

### Step 2 — Add demo section to `apps/demo/src/App.tsx`

Add state variable near the others:

```typescript
const [dateValues, setDateValues] = useState<FormValues>({});
```

Add section after Numeric Fields (before Masked Input):

```tsx
<hr style={{ margin: '2rem 0' }} />

<h2>Date & Time Fields</h2>
<p style={{ color: '#555', marginBottom: '1rem' }}>
  <code>DatePicker</code> stores a <code>Date</code> when valid, a <code>string</code> during
  partial entry. <code>TimePicker</code> stores <code>"HH:mm"</code>. Requires{' '}
  <code>@mui/x-date-pickers</code> and a date adapter (e.g.{' '}
  <code>registerComponents(muiComponents, {'{ dateAdapter: \'dayjs\' }'})</code>).
</p>

<Enforma.Form
  values={dateValues}
  onChange={setDateValues}
  aria-label="date time demo form"
>
  <Enforma.DatePicker bind="birthday" label="Birthday" />
  <Enforma.TimePicker bind="meetingTime" label="Meeting time" ampm={false} />
  <Enforma.DateTimePicker bind="deadline" label="Deadline" />
</Enforma.Form>

<pre style={{ marginTop: '2rem', background: '#f4f4f4', padding: '1rem' }}>
  {JSON.stringify(dateValues, null, 2)}
</pre>
```

### Step 3 — Update `docs/TODO.md`

Mark the three items as done:

```markdown
- [x] DatePicker — calendar-based date selection
- [x] TimePicker — clock/scroll-based time selection
- [x] DateTimePicker — combined date + time
```

### Step 4 — Full test + typecheck + lint

```bash
cd /Users/krisish/dev/enforma && nvm use 20 && pnpm typecheck && pnpm lint && pnpm test 2>&1 | tail -20
```

Expected: all passing.

### Step 5 — Commit

```bash
git add packages/enforma-mui/src/index.ts \
        apps/demo/src/App.tsx \
        docs/TODO.md
git commit -m "$(cat <<'EOF'
feat(enforma-mui): register DatePicker, TimePicker, DateTimePicker in bundle

Also adds Date & Time Fields section to demo and marks items
as done in TODO.
EOF
)"
```
