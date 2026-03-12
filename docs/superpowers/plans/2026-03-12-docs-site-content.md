# Docs Site — Content Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all 25 stub MDX pages with complete documentation: props tables, usage examples, and guides. The scaffold (`apps/docs`) must already be deployed (see `2026-03-11-docs-site-scaffold.md`).

**Architecture:** Each MDX file in `apps/docs/src/content/docs/` follows the component page template defined in the spec. Props are hand-written from TypeScript source types in `packages/enforma/src/components/types.ts` and `packages/enforma/src/components/List.tsx`. Usage examples are adapted from `apps/demo/src/App.tsx`. StackBlitz links use a placeholder comment (`<!-- StackBlitz: TODO -->`) to be filled in once a base template project is created.

**Tech Stack:** MDX, Starlight, source types from `packages/enforma/src/components/types.ts`

---

## MDX page template

Every component page uses this structure. Scale each section to complexity — a simple component (Textarea) gets 2 examples; a complex one (List, Autocomplete) gets 4.

```mdx
---
title: ComponentName
description: One sentence.
---

## Overview

One paragraph. What it does, when to use it vs alternatives.

## Usage

import { Code } from '@astrojs/starlight/components';

Minimal working example — the simplest valid usage.

```tsx
// minimal snippet
```

<!-- StackBlitz: TODO — link to base template once created -->

## Props

See [CommonProps](/enforma/docs/reference/common-props) for shared props
(`bind`, `label`, `placeholder`, `disabled`, `hidden`, `removed`, `validate`, `required`, `description`).

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `specificProp` | `type` | `—` | Description |

## Examples

### Example title

Description sentence.

```tsx
// example snippet
```

<!-- StackBlitz: TODO -->

## Notes

Edge cases or gotchas (omit section if none).
```

---

## CommonProps reference values

These are the props inherited by all field components — documented once, linked from every component page.

| Prop | Type | Default | Required |
|------|------|---------|----------|
| `bind` | `string` | — | Yes |
| `label` | `Reactive<string>` | `undefined` | No |
| `placeholder` | `Reactive<string>` | `undefined` | No |
| `disabled` | `Reactive<boolean>` | `undefined` | No |
| `hidden` | `Reactive<boolean>` | `undefined` | No |
| `removed` | `Reactive<boolean>` | `undefined` | No |
| `required` | `Reactive<boolean>` | `undefined` | No |
| `description` | `Reactive<string>` | `undefined` | No |
| `validate` | `(value, scopeValues, allValues) => string \| null` | `undefined` | No |
| `id` | `string` | auto-generated | No |
| `messages` | `Partial<Record<string, string>>` | `undefined` | No |

`Reactive<T>` means the prop accepts either a static value `T` or a function `(scopeValues: FormValues, allValues: FormValues) => T`.

---

## Chunk 1: Reference section

### Task 1: Write `reference/common-props.mdx`

**File:** `apps/docs/src/content/docs/reference/common-props.mdx`

- [ ] **Step 1: Write the page**

```mdx
---
title: CommonProps
description: Props shared by all field components in Enforma.
---

All field components (`TextInput`, `Select`, `Checkbox`, etc.) accept these props in addition to their own component-specific props.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `bind` | `string` | — | **Required.** The key in the form state this field reads from and writes to. Supports dot notation for nested keys (e.g. `"address.city"`) when inside a `Fieldset`. |
| `label` | `Reactive<string>` | `undefined` | Label text displayed above the field. Accepts a static string or a reactive function. |
| `placeholder` | `Reactive<string>` | `undefined` | Hint text shown when the field is empty. |
| `disabled` | `Reactive<boolean>` | `undefined` | When `true`, the field is non-interactive. Validators are still run. |
| `hidden` | `Reactive<boolean>` | `undefined` | When `true`, the field is visually hidden but its value is preserved in the store. Validators are skipped. Equivalent to CSS `display: none`. |
| `removed` | `Reactive<boolean>` | `undefined` | When `true`, the field is hidden **and** its value is deleted from the store. Validators are skipped. Equivalent to a conditional `v-if`. |
| `required` | `Reactive<boolean>` | `undefined` | Adds a built-in validator that fails if the value is `null`, `undefined`, or empty string. |
| `description` | `Reactive<string>` | `undefined` | Helper text displayed below the field. |
| `validate` | `(value: unknown, scopeValues: FormValues, allValues: FormValues) => string \| null` | `undefined` | Custom validator. Return a non-empty string to show as an error, or `null` to pass. |
| `id` | `string` | auto-generated | HTML `id` attribute for the field's input element. |
| `messages` | `Partial<Record<string, string>>` | `undefined` | Overrides built-in UI strings (e.g. the "Other" label added by `openChoice`). Currently reserved for future use. |

## Reactive props

Any prop typed as `Reactive<T>` accepts either a plain value or a function:

```tsx
// Static
<Enforma.TextInput bind="email" label="Email" disabled={false} />

// Reactive — re-evaluates whenever form values change
<Enforma.TextInput
  bind="email"
  label={({ name }) => `Email for ${String(name)}`}
  disabled={({ name }) => !name}
/>
```

The function receives `(scopeValues, allValues)`. `scopeValues` is the values of the nearest enclosing scope (e.g. inside a `Fieldset` or `List.Form`). `allValues` is the complete root form state.

## Validation

Errors are shown after the field is blurred. Submitting the form while invalid reveals all errors and prevents `onSubmit` from firing.

```tsx
<Enforma.TextInput
  bind="email"
  label="Email"
  validate={(value) => {
    if (!value) return 'Email is required';
    if (!String(value).includes('@')) return 'Enter a valid email';
    return null;
  }}
/>
```

Cross-field validation — access other field values via `scopeValues`:

```tsx
<Enforma.TextInput
  bind="confirmPassword"
  label="Confirm password"
  validate={(value, { password }) =>
    value !== password ? 'Passwords do not match' : null
  }
/>
```

## hidden vs removed

| | Value in store | Validator runs |
|--|--|--|
| `hidden={true}` | Preserved | No |
| `removed={true}` | Deleted | No |
| neither | Preserved | Yes |

Use `hidden` when you need the value to survive a conditional toggle (e.g. accordion). Use `removed` when the field and its value should not exist when invisible (e.g. a billing address that is only relevant when "different from shipping" is checked).
```

- [ ] **Step 2: Verify build**

```bash
nvm use 20 && pnpm --filter './packages/*' build && pnpm --filter docs build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/src/content/docs/reference/common-props.mdx
git commit -m "docs: write CommonProps reference page"
```

---

### Task 2: Write `reference/api.mdx`

**File:** `apps/docs/src/content/docs/reference/api.mdx`

Source: `packages/enforma/src/hooks/useField.ts`, `packages/enforma/src/hooks/useListState.ts`, `packages/enforma/src/hooks/useDataSource.ts`

- [ ] **Step 1: Write the page**

```mdx
---
title: API
description: Public hooks exported from the enforma package.
---

All hooks are exported from `enforma`:

```tsx
import { useFieldProps, useFormValue, useReactiveProp, useVisibility, useFieldValidation, useListState, useDataSource } from 'enforma';
```

## useFieldProps

The primary hook for building custom field components. Resolves all reactive props and connects the component to the form store.

```tsx
import { useFieldProps, type TextInputProps, type FieldResolved } from 'enforma';

function MyInput(props: TextInputProps) {
  const { value, setValue, label, error, showError, disabled } =
    useFieldProps<FieldResolved<string>>(props);
  return (
    <div>
      {label && <label>{label}</label>}
      <input
        value={value ?? ''}
        onChange={(e) => { setValue(e.target.value); }}
        disabled={disabled ?? false}
      />
      {showError && error && <span>{error}</span>}
    </div>
  );
}
```

**Returns:** `ResolvedCommonProps` plus the component-specific resolved fields. See [Custom components](/enforma/docs/guides/custom-components) for full usage.

## useFormValue

Reads a single field's current value from the nearest form store. Re-renders only when that value changes. Returns a `[value, setValue]` tuple.

```tsx
const [name, setName] = useFormValue<string>('name');
```

## useReactiveProp

Resolves a `Reactive<T>` prop against current scope values.

```tsx
const isDisabled = useReactiveProp(props.disabled);
```

## useVisibility

Resolves `hidden` and `removed` props and handles removing the field's value from the store when `removed` is true.

```tsx
const { isHidden, isRemoved } = useVisibility(props.bind, props.hidden, props.removed);
if (isRemoved) return null;
```

## useFieldValidation

Runs the field's validators and returns the current error state.

```tsx
const { error, showError, onBlur } = useFieldValidation(
  props.bind,
  props.validate,
  props.messages,
);
```

Spread `onBlur` onto the input so errors appear after the field loses focus. Pass optional `implicitValidator` for built-in constraints (e.g. `required`) and `typeValidator` for type-specific checks.

## useListState

Manages the state for a repeating list of items. Used internally by `List` and available for custom list implementations.

```tsx
const { items, addItem, updateItem, deleteItem } = useListState(bind, defaultItem);
```

## useDataSource

Fetches options from a `DataSourceDefinition` (static or async) and returns loading/error state.

```tsx
const { options, isLoading, error } = useDataSource(props.dataSource, scopeValues);
```
```

- [ ] **Step 2: Verify build**

```bash
nvm use 20 && pnpm --filter docs build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/src/content/docs/reference/api.mdx
git commit -m "docs: write API reference page"
```

---

## Chunk 2: Getting Started + Concepts

### Task 3: Write `installation.mdx`

**File:** `apps/docs/src/content/docs/installation.mdx`

- [ ] **Step 1: Write the page**

```mdx
---
title: Installation
description: How to install Enforma in your React project.
---

## Requirements

- React 18+
- Node 20+

## Core package

```bash
npm install enforma
# or
pnpm add enforma
```

The core package is UI-agnostic. It exports the form logic, field components (as empty shells), and public hooks, but renders nothing without a registered component set.

## With Material UI

```bash
npm install enforma-mui @mui/material @emotion/react @emotion/styled
```

Then register the MUI components once at app startup:

```tsx
import { registerComponents } from 'enforma';
import muiComponents from 'enforma-mui';

registerComponents(muiComponents, { variant: 'outlined' });
```

`variant` accepts `'classic'`, `'outlined'`, or `'standard'` (matches MUI's TextField variants). For date/time fields, also install a date adapter:

```bash
# dayjs (recommended)
npm install dayjs

# then pass dateAdapter to registerComponents:
registerComponents(muiComponents, { variant: 'outlined', dateAdapter: 'dayjs' });
```

## Custom component library

If you use a different UI library, see [Adapters](/enforma/docs/guides/adapters) for how to build your own component set.
```

- [ ] **Step 2: Verify build**

```bash
nvm use 20 && pnpm --filter docs build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/src/content/docs/installation.mdx
git commit -m "docs: write Installation page"
```

---

### Task 4: Write `quick-start.mdx`

**File:** `apps/docs/src/content/docs/quick-start.mdx`

- [ ] **Step 1: Write the page**

```mdx
---
title: Quick start
description: Build your first Enforma form in minutes.
---

## 1. Register components

Call `registerComponents` once before rendering any forms (e.g. in your app entry point):

```tsx
import { registerComponents } from 'enforma';
import muiComponents from 'enforma-mui';

registerComponents(muiComponents, { variant: 'outlined' });
```

## 2. Build a form

```tsx
import { useState } from 'react';
import Enforma, { type FormValues } from 'enforma';

export function ContactForm() {
  const [values, setValues] = useState<FormValues>({});

  return (
    <Enforma.Form values={values} onChange={setValues}>
      <Enforma.TextInput bind="name" label="Name" required />
      <Enforma.TextInput
        bind="email"
        label="Email"
        validate={(v) => (!v ? 'Required' : null)}
      />
      <Enforma.Select bind="topic" label="Topic">
        <Enforma.Select.Option value="support" label="Support" />
        <Enforma.Select.Option value="sales" label="Sales" />
      </Enforma.Select>
      <button type="submit">Send</button>
    </Enforma.Form>
  );
}
```

## 3. Handle submission

Pass `onSubmit` to `Form`. It fires only when all validators pass:

```tsx
<Enforma.Form
  values={values}
  onChange={setValues}
  onSubmit={(values) => {
    console.log('Submitted:', values);
  }}
>
  ...
</Enforma.Form>
```

## Key concepts

- **`bind`** — connects a field to a key in the form's `values` object
- **Reactive props** — `disabled`, `label`, etc. can be functions `(scopeValues) => value` that re-evaluate live as the form changes. See [Reactive props](/enforma/docs/concepts/reactive-props).
- **Validation** — errors show on blur; all errors show on submit. See [Validation](/enforma/docs/concepts/validation).
```

- [ ] **Step 2: Verify build**

```bash
nvm use 20 && pnpm --filter docs build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/src/content/docs/quick-start.mdx
git commit -m "docs: write Quick start page"
```

---

### Task 5: Write `concepts/reactive-props.mdx`

**File:** `apps/docs/src/content/docs/concepts/reactive-props.mdx`

- [ ] **Step 1: Write the page**

```mdx
---
title: Reactive props
description: How any prop can be a function that responds to live form state.
---

Most props on Enforma field components accept either a static value or a **reactive function**:

```tsx
type Reactive<T> = T | ((scopeValues: FormValues, allValues: FormValues) => T)
```

When you pass a function, Enforma re-evaluates it whenever the form state changes and updates the field accordingly — no `useEffect`, no manual wiring.

## How it works

The function receives two arguments:
- `scopeValues` — the values of the nearest enclosing scope (the current `Fieldset`, `List.Form`, or the root form)
- `allValues` — the complete root form state (useful for cross-scope logic)

For most cases `scopeValues` is sufficient and you can ignore `allValues`.

## Examples

### Reactive disabled

```tsx
<Enforma.TextInput bind="name" label="Name" />
<Enforma.TextInput
  bind="email"
  label="Email"
  disabled={({ name }) => !name}
/>
```

The email field is disabled until `name` has a value.

### Reactive label

```tsx
<Enforma.TextInput bind="contactType" label="Contact type" />
<Enforma.TextInput
  bind="contact"
  label={({ contactType }) =>
    contactType === 'work' ? 'Work email' : 'Personal email'
  }
/>
```

### Reactive placeholder

```tsx
<Enforma.TextInput
  bind="handle"
  placeholder={({ platform }) =>
    platform === 'twitter' ? '@username' : 'username'
  }
/>
```

### Reactive validation

```tsx
<Enforma.TextInput
  bind="address"
  label="Delivery address"
  validate={(value, { deliveryMethod }) =>
    deliveryMethod === 'delivery' && !value
      ? 'Address is required for delivery'
      : null
  }
/>
```

## Which props are reactive?

Any prop typed as `Reactive<T>` in the component's props. This includes `label`, `placeholder`, `disabled`, `hidden`, `removed`, `required`, `description`, and most component-specific props. See [CommonProps](/enforma/docs/reference/common-props) for the full list.

## Performance

Reactive prop functions are evaluated with `useSyncExternalStore` — the field only re-renders when its own value or a value it reads changes. Sibling fields that don't share dependencies are unaffected.
```

- [ ] **Step 2: Verify build**

```bash
nvm use 20 && pnpm --filter docs build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/src/content/docs/concepts/reactive-props.mdx
git commit -m "docs: write Reactive props concept page"
```

---

### Task 6: Write `concepts/validation.mdx`

**File:** `apps/docs/src/content/docs/concepts/validation.mdx`

- [ ] **Step 1: Write the page**

```mdx
---
title: Validation
description: Declaring field validators and built-in constraint props.
---

## validate prop

Pass a `validate` function to any field. Return a string for an error, or `null` to pass:

```tsx
<Enforma.TextInput
  bind="email"
  label="Email"
  validate={(value) => {
    if (!value) return 'Email is required';
    if (!String(value).includes('@')) return 'Enter a valid email';
    return null;
  }}
/>
```

Validators receive `(value, scopeValues, allValues)`. Use `scopeValues` for cross-field logic:

```tsx
<Enforma.TextInput
  bind="confirmPassword"
  label="Confirm password"
  validate={(value, { password }) =>
    value !== password ? 'Passwords do not match' : null
  }
/>
```

## Built-in constraint props

For common constraints, use declarative props instead of a custom `validate`:

| Prop | Applies to | Fails when |
|------|-----------|-----------|
| `required` | All fields | Value is `null`, `undefined`, or `""` |
| `minLength` | `TextInput`, `Textarea` | String length < N |
| `maxLength` | `TextInput`, `Textarea` | String length > N |
| `minItems` | `List` | Array length < N |
| `maxItems` | `List` | Array length > N |

```tsx
<Enforma.TextInput
  bind="username"
  label="Username"
  required
  minLength={3}
  maxLength={20}
/>
```

## When errors appear

- **On blur:** error shows after the user leaves the field
- **On submit:** all remaining errors are revealed; `onSubmit` is not called

## Validators on hidden/removed fields

Validators on `hidden` or `removed` fields are automatically skipped — you do not need to guard them manually.

## Form-level validity

`onChange` receives a second argument `{ valid: boolean }`:

```tsx
<Enforma.Form
  values={values}
  onChange={(values, { valid }) => {
    setValues(values);
    setCanSubmit(valid);
  }}
>
```
```

- [ ] **Step 2: Verify build**

```bash
nvm use 20 && pnpm --filter docs build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/src/content/docs/concepts/validation.mdx
git commit -m "docs: write Validation concept page"
```

---

### Task 7: Write `concepts/datasources.mdx`

**File:** `apps/docs/src/content/docs/concepts/datasources.mdx`

- [ ] **Step 1: Write the page**

```mdx
---
title: Data sources
description: Loading select options from static data or async APIs.
---

Data sources provide options to `Select`, `RadioGroup`, `Autocomplete`, and `ExclusiveToggle`. They are defined once on `Form` and referenced by name on individual fields, keeping fetch logic out of the component tree.

## Defining data sources

Pass a `dataSources` map to `Form`:

```tsx
<Enforma.Form
  values={values}
  onChange={setValues}
  dataSources={{
    countries: [
      { code: 'us', name: 'United States' },
      { code: 'gb', name: 'United Kingdom' },
    ],
  }}
>
```

## Static data source

An array of objects. Reference by name with `dataSource`:

```tsx
<Enforma.Select bind="country" label="Country" dataSource="countries">
  <Enforma.Select.Option label="name" value="code" />
</Enforma.Select>
```

`label="name"` and `value="code"` are template mappings — they tell Enforma which object key to use for the display label and stored value.

## Filtered data source

Pass an object with `source` and `filters`. The filter function is reactive — it re-evaluates as form state changes:

```tsx
<Enforma.Select
  bind="city"
  label="City"
  dataSource={{
    source: 'cities',
    filters: (scope) => ({ country: scope.country as string }),
  }}
>
  <Enforma.Select.Option label="name" value="code" />
</Enforma.Select>
```

When the filter changes, the field value is cleared automatically.

## Async data source

Define a `query` function that returns a promise. Used for server-side search:

```tsx
const dataSources = {
  books: {
    query: async ({ search, filters }) => {
      const res = await fetch(`/api/books?q=${search}`);
      const data = await res.json();
      return data.map((b) => ({ id: b.id, title: b.title }));
    },
    // Optional: resolve a pre-existing value back to its display label
    resolve: async (value) => {
      const res = await fetch(`/api/books/${String(value)}`);
      return res.json();
    },
  },
};
```

## DataSourceDefinition type

```tsx
type DataSourceDefinition<TItem> =
  | TItem[]
  | {
      query: (params: {
        search: string;
        filters: Record<string, string | number | boolean | null | Date | FilterPredicate>;
        sort: { field: string; direction: 'asc' | 'desc' } | null;
        pagination: { page: number; pageSize: number };
      }) => TItem[] | { items: TItem[]; total: number } | Promise<TItem[] | { items: TItem[]; total: number }>;
      resolve?: (value: unknown) => TItem | Promise<TItem>;
    };
```
```

- [ ] **Step 2: Verify build**

```bash
nvm use 20 && pnpm --filter docs build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/src/content/docs/concepts/datasources.mdx
git commit -m "docs: write Data sources concept page"
```

---

## Chunk 3: Component pages — batch 1

### Task 8: Write `components/form.mdx`

**File:** `apps/docs/src/content/docs/components/form.mdx`

Source: `packages/enforma/src/components/Form.tsx`, `packages/enforma/src/context/FormSettingsContext.tsx`

- [ ] **Step 1: Write the page**

```mdx
---
title: Form
description: The root component that owns form state and provides context to all fields.
---

## Overview

`Form` is the root of every Enforma form. It owns the values object, wires up validation, provides the data source registry, and handles submit. Every field component must be a descendant of `Form`.

## Usage

```tsx
import { useState } from 'react';
import Enforma, { type FormValues } from 'enforma';

function MyForm() {
  const [values, setValues] = useState<FormValues>({});

  return (
    <Enforma.Form values={values} onChange={setValues}>
      <Enforma.TextInput bind="name" label="Name" />
      <button type="submit">Submit</button>
    </Enforma.Form>
  );
}
```

<!-- StackBlitz: TODO -->

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `values` | `FormValues` | — | **Required.** The current form state object. |
| `onChange` | `(values: FormValues, meta: { valid: boolean }) => void` | — | **Required.** Called on every value change. |
| `onSubmit` | `(values: FormValues) => void` | `undefined` | Called when the form is submitted and all validators pass. |
| `dataSources` | `Record<string, DataSourceDefinition \| unknown[]>` | `undefined` | Data sources available to fields via their `dataSource` prop. |
| `children` | `ReactNode` | — | **Required.** Field components and other React content. |
| (HTML form attrs) | — | — | All standard HTML `<form>` attributes (e.g. `aria-label`, `noValidate`) are forwarded. |

## Examples

### With submit handler

```tsx
<Enforma.Form
  values={values}
  onChange={setValues}
  onSubmit={(values) => fetch('/api/submit', { method: 'POST', body: JSON.stringify(values) })}
>
  <Enforma.TextInput bind="name" label="Name" required />
  <button type="submit">Submit</button>
</Enforma.Form>
```

<!-- StackBlitz: TODO -->

### With data sources

```tsx
<Enforma.Form
  values={values}
  onChange={setValues}
  dataSources={{
    countries: [
      { code: 'us', name: 'United States' },
      { code: 'gb', name: 'United Kingdom' },
    ],
  }}
>
  <Enforma.Select bind="country" label="Country" dataSource="countries">
    <Enforma.Select.Option label="name" value="code" />
  </Enforma.Select>
</Enforma.Form>
```

<!-- StackBlitz: TODO -->

### Reading validity in onChange

```tsx
<Enforma.Form
  values={values}
  onChange={(newValues, { valid }) => {
    setValues(newValues);
    setIsValid(valid);
  }}
>
```

<!-- StackBlitz: TODO -->
```

- [ ] **Step 2: Verify build**

```bash
nvm use 20 && pnpm --filter docs build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/src/content/docs/components/form.mdx
git commit -m "docs: write Form component page"
```

---

### Task 9: Write `components/text-input.mdx`

**File:** `apps/docs/src/content/docs/components/text-input.mdx`

Props source: `TextInputProps` in `packages/enforma/src/components/types.ts`

- [ ] **Step 1: Write the page**

```mdx
---
title: TextInput
description: Single-line text field with optional mask and length constraints.
---

## Overview

`TextInput` is the most common field. It binds a string value, supports input masking via IMask, and accepts all CommonProps for validation, reactive labels, and conditional visibility.

## Usage

```tsx
<Enforma.TextInput bind="name" label="Name" placeholder="Your name" />
```

<!-- StackBlitz: TODO -->

## Props

See [CommonProps](/enforma/docs/reference/common-props) for `bind`, `label`, `placeholder`, `disabled`, `hidden`, `removed`, `validate`, `required`, `description`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `mask` | `Reactive<string \| RegExp>` | `undefined` | IMask pattern string (e.g. `"(000) 000-0000"`) or RegExp. Loads `react-imask` lazily. |
| `minLength` | `Reactive<number>` | `undefined` | Fails validation if string length is less than N. |
| `maxLength` | `Reactive<number>` | `undefined` | Fails validation if string length is more than N. |

## Examples

### With validation

```tsx
<Enforma.TextInput
  bind="email"
  label="Email"
  placeholder="you@example.com"
  validate={(v) => (!v ? 'Required' : !String(v).includes('@') ? 'Invalid email' : null)}
/>
```

<!-- StackBlitz: TODO -->

### Reactive label and disabled

```tsx
<Enforma.TextInput bind="name" label="Name" placeholder="Enter your name first" />
<Enforma.TextInput
  bind="email"
  label={({ name }) => `Email for ${String(name) || 'you'}`}
  disabled={({ name }) => !name}
/>
```

<!-- StackBlitz: TODO -->

### With mask

```tsx
<Enforma.TextInput bind="phone" label="Phone" mask="(000) 000-0000" placeholder="(555) 000-0000" />
<Enforma.TextInput bind="dob" label="Date of birth" mask="00/00/0000" placeholder="MM/DD/YYYY" />
```

<!-- StackBlitz: TODO -->

### Length constraints

```tsx
<Enforma.TextInput bind="username" label="Username" required minLength={3} maxLength={20} />
```

<!-- StackBlitz: TODO -->
```

- [ ] **Step 2: Verify build**

```bash
nvm use 20 && pnpm --filter docs build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/src/content/docs/components/text-input.mdx
git commit -m "docs: write TextInput component page"
```

---

### Task 10: Write `components/textarea.mdx`

**File:** `apps/docs/src/content/docs/components/textarea.mdx`

Props source: `TextareaProps` in `types.ts` (extends CommonProps, no extra props)

- [ ] **Step 1: Write the page**

```mdx
---
title: Textarea
description: Multi-line text field for longer string values.
---

## Overview

`Textarea` works like `TextInput` but renders a multi-line input. It accepts all CommonProps and has no additional props.

## Usage

```tsx
<Enforma.Textarea bind="bio" label="Bio" placeholder="Tell us about yourself..." />
```

<!-- StackBlitz: TODO -->

## Props

`Textarea` has no component-specific props. See [CommonProps](/enforma/docs/reference/common-props) for all available props (`bind`, `label`, `placeholder`, `disabled`, `validate`, `required`, etc.).

## Examples

### With validation and reactive disabled

```tsx
<Enforma.Checkbox bind="hasComment" label="Add a comment" />
<Enforma.Textarea
  bind="comment"
  label="Comment"
  placeholder="Your comment..."
  disabled={({ hasComment }) => !hasComment}
  validate={(v, { hasComment }) => hasComment && !v ? 'Comment is required' : null}
/>
```

<!-- StackBlitz: TODO -->

### Conditionally visible with hidden

```tsx
<Enforma.Select bind="feedbackType" label="Feedback type">
  <Enforma.Select.Option value="general" label="General" />
  <Enforma.Select.Option value="bug" label="Bug report" />
</Enforma.Select>
<Enforma.Textarea
  bind="bugDetails"
  label="Bug details"
  placeholder="Describe the bug..."
  hidden={({ feedbackType }) => feedbackType !== 'bug'}
  required={({ feedbackType }) => feedbackType === 'bug'}
/>
```

<!-- StackBlitz: TODO -->

## Notes

Textarea renders a multi-line `<textarea>` element. Row count and resize behaviour are controlled by the registered UI component — pass adapter-specific props via `registerComponents` or a custom adapter if you need to configure them.
```

- [ ] **Step 2: Verify build**

```bash
nvm use 20 && pnpm --filter docs build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/src/content/docs/components/textarea.mdx
git commit -m "docs: write Textarea component page"
```

---

### Task 11: Write `components/select.mdx`

**File:** `apps/docs/src/content/docs/components/select.mdx`

Props source: `SelectProps` in `types.ts`

- [ ] **Step 1: Write the page**

```mdx
---
title: Select
description: Dropdown field for single selection with inline options or a data source.
---

## Overview

`Select` renders a dropdown for picking one value from a list. Options can be declared inline as children or loaded from a named data source defined on the parent `Form`.

## Usage

```tsx
<Enforma.Select bind="country" label="Country">
  <Enforma.Select.Option value="us" label="United States" />
  <Enforma.Select.Option value="gb" label="United Kingdom" />
</Enforma.Select>
```

<!-- StackBlitz: TODO -->

## Props

See [CommonProps](/enforma/docs/reference/common-props) for `bind`, `label`, `disabled`, `hidden`, `removed`, `validate`, `required`, `description`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | — | `Select.Option` elements defining the available options. |
| `dataSource` | `string \| TItem[] \| ((scopeValues, allValues) => TItem[]) \| { source: string \| TItem[]; filters: (scopeValues, allValues) => Record<string, string \| number \| boolean \| null \| Date \| FilterPredicate> }` | `undefined` | Options source: a registered data source name, an inline array, a reactive function, or a filtered object. |
| `openChoice` | `boolean` | `false` | Appends an "Other" option that reveals a text input. The typed value is stored directly. |

### Select.Option props

| Prop | Type | Description |
|------|------|-------------|
| `value` | `unknown \| string` | The stored value, or the key name in a datasource object (template mode). |
| `label` | `string` | The display label, or the key name in a datasource object (template mode). |

## Examples

### With data source

```tsx
// On Form:
// dataSources={{ countries: [{ code: 'us', name: 'United States' }, ...] }}

<Enforma.Select bind="country" label="Country" dataSource="countries">
  <Enforma.Select.Option label="name" value="code" />
</Enforma.Select>
```

<!-- StackBlitz: TODO -->

### Filtered (cascading) data source

```tsx
<Enforma.Select bind="country" label="Country" dataSource="countries">
  <Enforma.Select.Option label="name" value="code" />
</Enforma.Select>

<Enforma.Select
  bind="city"
  label="City"
  dataSource={{ source: 'cities', filters: (scope) => ({ country: scope.country as string }) }}
>
  <Enforma.Select.Option label="name" value="code" />
</Enforma.Select>
```

<!-- StackBlitz: TODO -->

### openChoice

```tsx
<Enforma.Select bind="color" label="Favourite colour" openChoice>
  <Enforma.Select.Option value="red" label="Red" />
  <Enforma.Select.Option value="blue" label="Blue" />
</Enforma.Select>
```

<!-- StackBlitz: TODO -->
```

- [ ] **Step 2: Verify build**

```bash
nvm use 20 && pnpm --filter docs build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/src/content/docs/components/select.mdx
git commit -m "docs: write Select component page"
```

---

### Task 12: Write `components/checkbox-switch.mdx`

**File:** `apps/docs/src/content/docs/components/checkbox-switch.mdx`

Props source: `CheckboxProps` / `SwitchProps` in `types.ts`

- [ ] **Step 1: Write the page**

```mdx
---
title: Checkbox & Switch
description: Boolean fields bound to a true/false value.
---

## Overview

`Checkbox` and `Switch` both bind a boolean value. They are visually different but functionally identical — use whichever fits your UI. Both accept a `labelPlacement` prop to control where the label appears relative to the control.

## Usage

```tsx
<Enforma.Checkbox bind="agree" label="I agree to the terms" />
<Enforma.Switch bind="darkMode" label="Dark mode" />
```

<!-- StackBlitz: TODO -->

## Props

See [CommonProps](/enforma/docs/reference/common-props) for `bind`, `label`, `disabled`, `hidden`, `removed`, `validate`, `required`, `description`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `labelPlacement` | `Reactive<'end' \| 'start' \| 'top' \| 'bottom'>` | adapter-dependent | Position of the label relative to the control. MUI default is `'end'`. |

Both `Checkbox` and `Switch` accept the same props.

## Examples

### Reactive disabled based on another checkbox

```tsx
<Enforma.Checkbox bind="agree" label="I agree to the terms" />
<Enforma.Checkbox
  bind="newsletter"
  label="Subscribe to newsletter"
  disabled={({ agree }) => !agree}
/>
```

<!-- StackBlitz: TODO -->

### Switch with label on the left

```tsx
<Enforma.Switch bind="notifications" label="Email notifications" labelPlacement="start" />
```

<!-- StackBlitz: TODO -->

### Required checkbox

```tsx
<Enforma.Checkbox bind="terms" label="I accept the terms and conditions" required />
```

<!-- StackBlitz: TODO -->
```

- [ ] **Step 2: Verify build**

```bash
nvm use 20 && pnpm --filter docs build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/src/content/docs/components/checkbox-switch.mdx
git commit -m "docs: write Checkbox & Switch component page"
```

---

## Chunk 4: Component pages — batch 2

### Task 13: Write `components/radio-group.mdx`

**File:** `apps/docs/src/content/docs/components/radio-group.mdx`

Props source: `RadioGroupProps` in `types.ts`

- [ ] **Step 1: Write the page**

```mdx
---
title: RadioGroup
description: Radio button group for single selection from a list of options.
---

## Overview

`RadioGroup` renders a group of radio buttons for selecting one value. Options can be declared inline or loaded from a data source. Supports horizontal layout and the `openChoice` "Other" option.

## Usage

```tsx
<Enforma.RadioGroup bind="size" label="Size">
  <Enforma.RadioGroup.Option value="s" label="Small" />
  <Enforma.RadioGroup.Option value="m" label="Medium" />
  <Enforma.RadioGroup.Option value="l" label="Large" />
</Enforma.RadioGroup>
```

<!-- StackBlitz: TODO -->

## Props

See [CommonProps](/enforma/docs/reference/common-props) for `bind`, `label`, `disabled`, `hidden`, `removed`, `validate`, `required`, `description`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | — | `RadioGroup.Option` elements. |
| `dataSource` | `string \| TItem[] \| ((scopeValues, allValues) => TItem[]) \| { source: string \| TItem[]; filters: (scopeValues, allValues) => Record<string, string \| number \| boolean \| null \| Date \| FilterPredicate> }` | `undefined` | Options source: a registered data source name, an inline array, a reactive function, or a filtered object. |
| `row` | `Reactive<boolean>` | `false` | When `true`, options are laid out horizontally instead of vertically. |
| `openChoice` | `boolean` | `false` | Appends an "Other" option that reveals a text input. |

### RadioGroup.Option props

| Prop | Type | Description |
|------|------|-------------|
| `value` | `unknown \| string` | The stored value, or a datasource key in template mode. |
| `label` | `string` | The display label, or a datasource key in template mode. |

## Examples

### Horizontal layout with data source

```tsx
<Enforma.RadioGroup bind="country" label="Country" dataSource="countries" row>
  <Enforma.RadioGroup.Option label="name" value="code" />
</Enforma.RadioGroup>
```

<!-- StackBlitz: TODO -->

### openChoice

```tsx
<Enforma.RadioGroup bind="size" label="Size" openChoice>
  <Enforma.RadioGroup.Option value="s" label="Small" />
  <Enforma.RadioGroup.Option value="m" label="Medium" />
  <Enforma.RadioGroup.Option value="l" label="Large" />
</Enforma.RadioGroup>
```

<!-- StackBlitz: TODO -->
```

- [ ] **Step 2: Verify build**

```bash
nvm use 20 && pnpm --filter docs build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/src/content/docs/components/radio-group.mdx
git commit -m "docs: write RadioGroup component page"
```

---

### Task 14: Write `components/autocomplete.mdx`

**File:** `apps/docs/src/content/docs/components/autocomplete.mdx`

Props source: `AutocompleteProps` in `types.ts`

- [ ] **Step 1: Write the page**

```mdx
---
title: Autocomplete
description: Searchable combobox with type-ahead filtering, inline options, or server-side search.
---

## Overview

`Autocomplete` is a combobox that filters options as the user types. Options can be inline (client-side filtered by the UI library) or loaded from an async data source (server-side search). Supports pre-loading a value by key (via the `resolve` function on the data source).

## Usage

```tsx
<Enforma.Autocomplete bind="country" label="Country">
  <Enforma.Autocomplete.Option value="us" label="United States" />
  <Enforma.Autocomplete.Option value="gb" label="United Kingdom" />
</Enforma.Autocomplete>
```

<!-- StackBlitz: TODO -->

## Props

See [CommonProps](/enforma/docs/reference/common-props) for `bind`, `label`, `disabled`, `hidden`, `removed`, `validate`, `required`, `description`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | — | `Autocomplete.Option` elements. |
| `dataSource` | `string \| TItem[] \| ((scopeValues, allValues) => TItem[]) \| { source: string \| TItem[]; filters: (scopeValues, allValues) => Record<string, string \| number \| boolean \| null \| Date \| FilterPredicate> }` | `undefined` | Options source: a registered data source name, an inline array, a reactive function, or a filtered object. |
| `minSearchLength` | `Reactive<number>` | `0` | Minimum number of characters before triggering a search query (useful for async sources). |

### Autocomplete.Option props

| Prop | Type | Description |
|------|------|-------------|
| `value` | `unknown \| string` | The stored value, or a datasource key in template mode. |
| `label` | `string` | The display label, or a datasource key in template mode. |

## Examples

### With async data source and pre-loaded value

```tsx
// dataSources={{ books: { query: async ({ search }) => [...], resolve: async (id) => {...} } }}

<Enforma.Autocomplete
  bind="book"
  label="Book"
  dataSource={{ source: 'books', filters: (scope) => ({ subject: scope.subject as string }) }}
  minSearchLength={3}
>
  <Enforma.Autocomplete.Option label="label" value="key" />
</Enforma.Autocomplete>
```

<!-- StackBlitz: TODO -->

## Notes

When using an async `dataSource`, define a `resolve` function to support pre-selected values — Enforma calls it on mount to retrieve the display label for an already-stored key.
```

- [ ] **Step 2: Verify build**

```bash
nvm use 20 && pnpm --filter docs build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/src/content/docs/components/autocomplete.mdx
git commit -m "docs: write Autocomplete component page"
```

---

### Task 15: Write `components/exclusive-toggle.mdx`

**File:** `apps/docs/src/content/docs/components/exclusive-toggle.mdx`

Props source: `ExclusiveToggleProps` in `types.ts`

- [ ] **Step 1: Write the page**

```mdx
---
title: ExclusiveToggle
description: Segmented button group for single selection from a small fixed set.
---

## Overview

`ExclusiveToggle` renders a row of toggle buttons where only one can be active at a time — similar to a segmented control. Best for 2–5 options. For larger sets, use `Select` or `RadioGroup`.

## Usage

```tsx
<Enforma.ExclusiveToggle bind="size" label="Size">
  <Enforma.ExclusiveToggle.Option value="s" label="S" />
  <Enforma.ExclusiveToggle.Option value="m" label="M" />
  <Enforma.ExclusiveToggle.Option value="l" label="L" />
</Enforma.ExclusiveToggle>
```

<!-- StackBlitz: TODO -->

## Props

See [CommonProps](/enforma/docs/reference/common-props) for `bind`, `label`, `disabled`, `hidden`, `removed`, `validate`, `required`, `description`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | — | `ExclusiveToggle.Option` elements. |
| `dataSource` | `string \| TItem[] \| ((scopeValues, allValues) => TItem[]) \| { source: string \| TItem[]; filters: (scopeValues, allValues) => Record<string, string \| number \| boolean \| null \| Date \| FilterPredicate> }` | `undefined` | Options source: a registered data source name, an inline array, a reactive function, or a filtered object. |
| `openChoice` | `boolean` | `false` | Appends an "Other" option that reveals a text input. |

### ExclusiveToggle.Option props

| Prop | Type | Description |
|------|------|-------------|
| `value` | `unknown \| string` | The stored value, or a datasource key in template mode. |
| `label` | `string` | The display label, or a datasource key in template mode. |

## Examples

### openChoice with pre-loaded custom value

If the form loads with a value not in the option list, "Other" is auto-selected and the text input shows the value:

```tsx
// values = { format: 'epub' }  — not in the options below

<Enforma.ExclusiveToggle bind="format" label="Format" openChoice>
  <Enforma.ExclusiveToggle.Option value="pdf" label="PDF" />
  <Enforma.ExclusiveToggle.Option value="csv" label="CSV" />
</Enforma.ExclusiveToggle>
// Renders with "Other" selected and "epub" in the text input
```

<!-- StackBlitz: TODO -->
```

- [ ] **Step 2: Verify build**

```bash
nvm use 20 && pnpm --filter docs build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/src/content/docs/components/exclusive-toggle.mdx
git commit -m "docs: write ExclusiveToggle component page"
```

---

### Task 16: Write `components/number-input.mdx`

**File:** `apps/docs/src/content/docs/components/number-input.mdx`

Props source: `NumberInputProps` in `types.ts`

- [ ] **Step 1: Write the page**

```mdx
---
title: NumberInput
description: Numeric field with locale-aware formatting, min/max bounds, and decimal scale control.
---

## Overview

`NumberInput` stores a `number | undefined` and formats the display value using IMask's Number mask. Separators default to the browser locale via `Intl.NumberFormat`. It has no spinner arrows — use a plain number input, not a stepper.

## Usage

```tsx
<Enforma.NumberInput bind="price" label="Price" />
```

<!-- StackBlitz: TODO -->

## Props

See [CommonProps](/enforma/docs/reference/common-props) for `bind`, `label`, `disabled`, `hidden`, `removed`, `validate`, `required`, `description`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `decimalScale` | `Reactive<number>` | locale default | Number of decimal places to allow. Pass `0` for integers. |
| `decimalSeparator` | `Reactive<'intl' \| string>` | `'intl'` | Decimal separator character. `'intl'` uses browser locale. |
| `thousandSeparator` | `Reactive<false \| 'intl' \| string>` | `'intl'` | Thousand separator. Pass `false` to disable. |
| `allowNegative` | `Reactive<boolean>` | `true` | When `false`, negative values are rejected. |
| `min` | `Reactive<number>` | `undefined` | Minimum allowed value (validation). |
| `max` | `Reactive<number>` | `undefined` | Maximum allowed value (validation). |

## Examples

### Integer with no separator

```tsx
<Enforma.NumberInput bind="quantity" label="Quantity" decimalScale={0} thousandSeparator={false} allowNegative={false} />
```

<!-- StackBlitz: TODO -->

### Percentage with bounds

```tsx
<Enforma.NumberInput bind="rate" label="Rate (0–100%)" decimalScale={2} min={0} max={100} allowNegative={false} />
```

<!-- StackBlitz: TODO -->
```

- [ ] **Step 2: Verify build**

```bash
nvm use 20 && pnpm --filter docs build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/src/content/docs/components/number-input.mdx
git commit -m "docs: write NumberInput component page"
```

---

### Task 17: Write `components/date-time.mdx`

**File:** `apps/docs/src/content/docs/components/date-time.mdx`

Props source: `DatePickerProps`, `TimePickerProps`, `DateTimePickerProps` in `types.ts`

- [ ] **Step 1: Write the page**

```mdx
---
title: Date & Time
description: Calendar and clock pickers for date, time, and combined date-time values.
---

## Overview

Three components cover date and time input:

- **`DatePicker`** — stores a `Date` when valid, a partial string during entry
- **`TimePicker`** — stores a `"HH:mm"` string
- **`DateTimePicker`** — combined picker, stores a `Date`

All three require `@mui/x-date-pickers` and a date adapter registered at startup:

```tsx
registerComponents(muiComponents, { variant: 'outlined', dateAdapter: 'dayjs' });
```

Supported adapters: `'dayjs'`, `'date-fns'`, `'luxon'`, `'moment'`.

## Usage

```tsx
<Enforma.DatePicker bind="birthday" label="Birthday" />
<Enforma.TimePicker bind="meetingTime" label="Meeting time" ampm={false} />
<Enforma.DateTimePicker bind="deadline" label="Deadline" />
```

<!-- StackBlitz: TODO -->

## DatePicker props

See [CommonProps](/enforma/docs/reference/common-props) for shared props.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `minDate` | `Reactive<Date>` | `undefined` | Earliest selectable date. |
| `maxDate` | `Reactive<Date>` | `undefined` | Latest selectable date. |
| `disableFuture` | `Reactive<boolean>` | `false` | Disables all dates after today. |
| `disablePast` | `Reactive<boolean>` | `false` | Disables all dates before today. |

## TimePicker props

See [CommonProps](/enforma/docs/reference/common-props) for shared props.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `minTime` | `Reactive<Date>` | `undefined` | Earliest selectable time. |
| `maxTime` | `Reactive<Date>` | `undefined` | Latest selectable time. |
| `ampm` | `Reactive<boolean>` | locale default | When `false`, forces 24-hour clock. |

## DateTimePicker props

Combines all `DatePicker` props plus `ampm` from `TimePicker`.

## Examples

### Past-only date picker

```tsx
<Enforma.DatePicker bind="birthday" label="Birthday" disableFuture />
```

<!-- StackBlitz: TODO -->

### 24-hour time picker

```tsx
<Enforma.TimePicker bind="startTime" label="Start time" ampm={false} />
```

<!-- StackBlitz: TODO -->
```

- [ ] **Step 2: Verify build**

```bash
nvm use 20 && pnpm --filter docs build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/src/content/docs/components/date-time.mdx
git commit -m "docs: write Date & Time component page"
```

---

## Chunk 5: Component pages — batch 3

### Task 18: Write `components/fieldset.mdx`

**File:** `apps/docs/src/content/docs/components/fieldset.mdx`

Props source: `FieldsetProps` in `types.ts`

- [ ] **Step 1: Write the page**

```mdx
---
title: Fieldset
description: Groups fields under a nested key in the form state.
---

## Overview

`Fieldset` creates a nested scope in the form's values object. Fields inside a `Fieldset` with `bind="address"` write to `values.address.city` instead of `values.city`. Fieldsets can be nested.

## Usage

```tsx
<Enforma.Fieldset bind="address" title="Address">
  <Enforma.TextInput bind="city" label="City" />
  <Enforma.TextInput bind="zip" label="ZIP code" />
</Enforma.Fieldset>
```

Result: `values = { address: { city: '...', zip: '...' } }`

<!-- StackBlitz: TODO -->

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `bind` | `string` | `undefined` | Key under which the nested values are stored. Optional — omit to create an unnamed grouping without nesting. |
| `children` | `ReactNode` | — | **Required.** Field components. |
| `title` | `string` | `undefined` | Optional heading displayed above the fieldset. |
| `hidden` | `Reactive<boolean>` | `false` | Hides all children; values are preserved. |
| `removed` | `Reactive<boolean>` | `false` | Hides all children and deletes the nested values from the store. |

## Examples

### Nested fieldsets

```tsx
<Enforma.Fieldset bind="address" title="Address">
  <Enforma.TextInput bind="city" label="City" />
  <Enforma.Fieldset bind="street">
    <Enforma.TextInput bind="line1" label="Street line 1" />
    <Enforma.TextInput bind="line2" label="Street line 2" />
  </Enforma.Fieldset>
</Enforma.Fieldset>
```

<!-- StackBlitz: TODO -->

### Conditional fieldset with removed

```tsx
<Enforma.Checkbox bind="hasBilling" label="Use a different billing address" />
<Enforma.Fieldset bind="billing" removed={({ hasBilling }) => !hasBilling}>
  <Enforma.TextInput bind="street" label="Billing street" />
  <Enforma.TextInput bind="city" label="Billing city" />
</Enforma.Fieldset>
```

<!-- StackBlitz: TODO -->
```

- [ ] **Step 2: Verify build**

```bash
nvm use 20 && pnpm --filter docs build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/src/content/docs/components/fieldset.mdx
git commit -m "docs: write Fieldset component page"
```

---

### Task 19: Write `components/list.mdx`

**File:** `apps/docs/src/content/docs/components/list.mdx`

Props source: `ListProps` in `packages/enforma/src/components/List.tsx`, `ListItemSlotProps`, `ListFormSlotProps`

- [ ] **Step 1: Write the page**

```mdx
---
title: List
description: Repeating sections driven by an array value — add, edit, and delete items via a modal.
---

## Overview

`List` renders a repeating set of items backed by an array in the form state. Users add items via an "Add" button, edit them in a modal form, and delete them from the list. The modal form is a nested Enforma form scoped to the item's values.

## Usage

```tsx
<Enforma.List bind="members" defaultItem={{ name: '' }}>
  <Enforma.List.Item title="name" showDeleteButton />
  <Enforma.List.Form showDeleteButton>
    <Enforma.TextInput bind="name" label="Name" />
  </Enforma.List.Form>
</Enforma.List>
```

<!-- StackBlitz: TODO -->

## List props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `bind` | `string` | — | **Required.** Key in the form state whose value is the array. |
| `defaultItem` | `Record<string, unknown>` | — | **Required.** Template for new items added via the "Add" button. |
| `children` | `ReactNode` | — | **Required.** `List.Item` and `List.Form` slots. |
| `disabled` | `boolean` | `false` | Disables adding and deleting items. |
| `required` | `boolean` | `false` | Fails validation if the array is empty. |
| `minItems` | `number` | `undefined` | Fails validation if array length < N. |
| `maxItems` | `number` | `undefined` | Fails validation if array length > N. Hides the "Add" button when the limit is reached. |
| `hidden` | `Reactive<boolean>` | `false` | Hides the list; values are preserved. |
| `removed` | `Reactive<boolean>` | `false` | Hides the list and deletes its value from the store. |

## List.Item props

Defines how each row in the list is displayed.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string \| ((item) => string)` | — | **Required.** Key in the item object to use as the row title, or a function. |
| `subtitle` | `string \| ((item) => string)` | `undefined` | Secondary text. |
| `avatar` | `string \| ((item) => string)` | `undefined` | Key or function returning an image URL to display as an avatar on each row. |
| `showDeleteButton` | `boolean` | `false` | Shows a delete icon on each row. |

## List.Form props

Defines the modal form for creating and editing items.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | — | **Required.** Field components scoped to the item. |
| `showDeleteButton` | `boolean` | `false` | Shows a delete button inside the modal. |
| `mode` | `'CREATE' \| 'UPDATE' \| 'DISPLAY'` | `undefined` | When omitted, this form is used for all modes. Specify to use different forms per mode. |

## Examples

### With min/max constraints

```tsx
<Enforma.List bind="tags" defaultItem={{ tag: '' }} minItems={1} maxItems={3}>
  <Enforma.List.Item title="tag" showDeleteButton />
  <Enforma.List.Form showDeleteButton>
    <Enforma.TextInput bind="tag" label="Tag" required />
  </Enforma.List.Form>
</Enforma.List>
```

<!-- StackBlitz: TODO -->
```

- [ ] **Step 2: Verify build**

```bash
nvm use 20 && pnpm --filter docs build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/src/content/docs/components/list.mdx
git commit -m "docs: write List component page"
```

---

### Task 20: Write `components/calculated.mdx`

**File:** `apps/docs/src/content/docs/components/calculated.mdx`

Props source: `CalculatedProps` in `types.ts`

- [ ] **Step 1: Write the page**

```mdx
---
title: Calculated
description: A read-only field whose value is derived from other form values.
---

## Overview

`Calculated` computes a value from form state via a reactive `value` function. With `bind`, the result is written back into the store (useful for downstream validation or submission). Without `bind`, it is display-only and does not affect the stored values.

## Usage

```tsx
// Display-only
<Enforma.Calculated<number>
  value={(v) => (v.q1 as number) + (v.q2 as number)}
  label="Total"
/>

// Synced to store
<Enforma.Calculated<number>
  bind="total"
  value={(v) => (v.q1 as number) + (v.q2 as number)}
  label="Total (stored)"
/>
```

<!-- StackBlitz: TODO -->

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `Reactive<T>` | — | **Required.** Function that derives the computed value from form state. |
| `bind` | `string` | `undefined` | When provided, writes the computed value back to the store under this key. |
| `label` | `Reactive<string>` | `undefined` | Label displayed above the computed value. |
| `description` | `Reactive<string>` | `undefined` | Helper text, can itself be reactive and show the computed value. |
| `disabled` | `Reactive<boolean>` | `undefined` | Passed through to the UI component. |
| `hidden` | `Reactive<boolean>` | `false` | Hides the field; if `bind` is set, the computed value is still synced. |
| `removed` | `Reactive<boolean>` | `false` | Hides and stops syncing. |

## Examples

### Reactive description showing severity

```tsx
<Enforma.Calculated<number>
  bind="score"
  value={(v) => ['q1','q2','q3'].reduce((sum, k) => sum + ((v[k] as number) ?? 0), 0)}
  label="Total score"
  description={(v) => {
    const score = v.score as number ?? 0;
    if (score <= 4) return 'Minimal';
    if (score <= 9) return 'Mild';
    return 'Severe';
  }}
/>
```

<!-- StackBlitz: TODO -->
```

- [ ] **Step 2: Verify build**

```bash
nvm use 20 && pnpm --filter docs build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/src/content/docs/components/calculated.mdx
git commit -m "docs: write Calculated component page"
```

---

### Task 21: Write `components/output.mdx`

**File:** `apps/docs/src/content/docs/components/output.mdx`

Props source: `OutputProps` in `types.ts`

- [ ] **Step 1: Write the page**

```mdx
---
title: Output
description: Read-only inline element that renders a reactive value or static text.
---

## Overview

`Output` renders a value without connecting to the form store as a field. Use it for inline text that reacts to form state — instructions, computed labels, or interpolated values inside headings.

## Usage

```tsx
<h2>Hello, <Enforma.Output as="span" value={({ name }) => String(name) || 'stranger'} /></h2>
<Enforma.TextInput bind="name" label="Name" />
```

<!-- StackBlitz: TODO -->

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `Reactive<unknown>` | — | **Required.** The value to render. Accepts a static value or a reactive function. |
| `as` | `string` | `'span'` | HTML element to render (e.g. `'span'`, `'p'`, `'strong'`). |
| `hidden` | `Reactive<boolean>` | `false` | When `true`, renders nothing. |
| `removed` | `Reactive<boolean>` | `false` | Same as `hidden` for `Output` (no store value to delete). |

## Examples

### Static instruction note

```tsx
<Enforma.Output value="All fields marked with * are required." />
```

<!-- StackBlitz: TODO -->
```

- [ ] **Step 2: Verify build**

```bash
nvm use 20 && pnpm --filter docs build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/src/content/docs/components/output.mdx
git commit -m "docs: write Output component page"
```

---

### Task 22: Write `components/scope.mdx`

**File:** `apps/docs/src/content/docs/components/scope.mdx`

Props source: `Scope.tsx` — `bind: string, children: ReactNode`

- [ ] **Step 1: Write the page**

```mdx
---
title: Scope
description: Restricts field bindings to a nested path without writing a nested object to the store.
---

## Overview

`Scope` changes the path prefix for `bind` props of its children — similar to `Fieldset` — but it does **not** affect the stored values structure. Fields inside `<Scope bind="address">` still read from and write to `values.address.city`. The difference from `Fieldset` is that `Scope` has no visual output and does not add a title or grouping element.

Use `Scope` when you want the logical scoping of `Fieldset` without any visual wrapper.

## Usage

```tsx
<Enforma.Scope bind="address">
  <Enforma.TextInput bind="city" label="City" />
  <Enforma.TextInput bind="zip" label="ZIP" />
</Enforma.Scope>
```

Result: `values = { address: { city: '...', zip: '...' } }` — same as `Fieldset`.

<!-- StackBlitz: TODO -->

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `bind` | `string` | — | **Required.** The path prefix to apply to all descendant `bind` props. |
| `children` | `ReactNode` | — | **Required.** Field components. |

## Examples

### Nested address without visual grouping

```tsx
<Enforma.Scope bind="address">
  <Enforma.TextInput bind="street" label="Street" />
  <Enforma.TextInput bind="city" label="City" />
  <Enforma.TextInput bind="zip" label="ZIP" />
</Enforma.Scope>
```

Produces `values = { address: { street: '...', city: '...', zip: '...' } }`.

<!-- StackBlitz: TODO -->

## Notes

`Scope` and `Fieldset` produce the same form state structure. Choose `Fieldset` when you want a visual section wrapper; choose `Scope` when you need the scoping behaviour without any rendered element.
```

- [ ] **Step 2: Verify build**

```bash
nvm use 20 && pnpm --filter docs build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/src/content/docs/components/scope.mdx
git commit -m "docs: write Scope component page"
```

---

## Chunk 6: Guides

### Task 23: Migrate `guides/custom-components.mdx`

**File:** `apps/docs/src/content/docs/guides/custom-components.mdx`

Source: `docs/custom-components.md`

- [ ] **Step 1: Read the source file**

```bash
cat docs/custom-components.md
```

- [ ] **Step 2: Write the MDX page**

Convert the content to MDX with proper Starlight frontmatter. Add `useFieldProps` import example from the API reference. Ensure code blocks use `tsx` syntax highlighting. The existing content covers `useFieldProps`, `FieldResolved`, and `registerComponents` — keep all of it and update any outdated examples to match the current API.

```mdx
---
title: Custom components
description: Build your own field components using useFieldProps and register them with Enforma.
---

[Migrate content from docs/custom-components.md here.
 Key sections to include:
 1. Why custom components (useFieldProps vs renderProp)
 2. useFieldProps usage with FieldResolved<T>
 3. Using TextInputProps as the base type
 4. Registering custom components via registerComponents
 5. Full StarRating example from App.tsx]
```

- [ ] **Step 3: Verify build**

```bash
nvm use 20 && pnpm --filter docs build
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/docs/src/content/docs/guides/custom-components.mdx
git commit -m "docs: migrate custom-components guide to Starlight"
```

---

### Task 24: Migrate `guides/adapters.mdx`

**File:** `apps/docs/src/content/docs/guides/adapters.mdx`

Source: `docs/adapting.md`

- [ ] **Step 1: Read the source file**

```bash
cat docs/adapting.md
```

- [ ] **Step 2: Write the MDX page**

Convert to MDX with Starlight frontmatter. Keep all content from the source. Update any outdated examples. Add a brief intro paragraph before the existing content.

```mdx
---
title: Adapters
description: How to connect Enforma to a UI component library by implementing the component registry.
---

[Migrate content from docs/adapting.md here.]
```

- [ ] **Step 3: Verify build**

```bash
nvm use 20 && pnpm --filter docs build
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/docs/src/content/docs/guides/adapters.mdx
git commit -m "docs: migrate adapters guide to Starlight"
```

---

### Task 25: Migrate `guides/plain-react-comparison.mdx`

**File:** `apps/docs/src/content/docs/guides/plain-react-comparison.mdx`

Source: `docs/plain-react-comparison.md`

- [ ] **Step 1: Read the source file**

```bash
cat docs/plain-react-comparison.md
```

- [ ] **Step 2: Write the MDX page**

Convert to MDX with Starlight frontmatter. Keep all content from the source.

```mdx
---
title: Plain React comparison
description: Side-by-side comparison of an Enforma form and an equivalent plain React form.
---

[Migrate content from docs/plain-react-comparison.md here.]
```

- [ ] **Step 3: Verify build**

```bash
nvm use 20 && pnpm --filter docs build
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/docs/src/content/docs/guides/plain-react-comparison.mdx
git commit -m "docs: migrate plain-react-comparison guide to Starlight"
```

---

## Final verification

- [ ] **Run full monorepo checks:**

```bash
nvm use 20 && pnpm lint && pnpm typecheck && pnpm test
```

Expected: All pass with no errors or warnings.

- [ ] **Run docs build one final time:**

```bash
nvm use 20 && pnpm --filter './packages/*' build && pnpm --filter docs build
```

Expected: Build completes with no errors.

- [ ] **Push to deploy:**

```bash
git push
```

Expected: GitHub Actions workflow runs and deploys to `https://jacarma.github.io/enforma/`. All 25 pages show real content (no "Coming soon." remaining).

---

## Remaining work after this plan

- Replace all `<!-- StackBlitz: TODO -->` comments with real static URLs once a base StackBlitz template project is created.
