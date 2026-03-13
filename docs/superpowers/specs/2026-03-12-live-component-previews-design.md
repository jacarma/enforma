# Live Component Previews in Docs — Design Spec

**Date:** 2026-03-12
**Status:** Approved

## Goal

Add static interactive component previews to each component doc page in the Enforma docs site. Users see a rendered, working form demo alongside the code blocks. No npm release is required — the docs app already depends on `enforma` and `enforma-mui` via `workspace:*`.

## Architecture

Three new pieces; no existing files change structurally.

### 1. `apps/docs/src/components/Preview.tsx`

A shared React wrapper component. Responsibilities:

- Calls `registerComponents(muiComponents as Partial<EnformaComponentRegistry>, { variant: 'outlined' })` at module load (outside the component function). ES module caching ensures this runs exactly once per page load regardless of how many demo files import it. `HeroDemo.tsx` also calls `registerComponents` at module level with the same arguments — this is safe because `registerComponents` merges via object spread (`registry = { ...registry, ...components }`), so multiple calls with **identical arguments** are idempotent.
- Manages `FormValues` state internally via `useState`, initialised from an optional `initialValues` prop. Use `initialValues` when a demo benefits from pre-filled data (e.g., a mask demo showing a formatted phone number on load).
- Accepts field JSX as `children` and renders them inside `<Enforma.Form>`.
- Wraps the entire form in a `div.preview-card` for consistent styling.
- **`onSubmit` is intentionally absent.** `Preview` is for field demos only. Demos that require submit handling, data sources, or `onChange` access to `meta.valid` must manage their own state and use `<div className="preview-card">` directly (see `FormDemos.tsx` below).

Full component:

```tsx
// apps/docs/src/components/Preview.tsx
import { useState } from 'react';
import Enforma, {
  registerComponents,
  type FormValues,
  type EnformaComponentRegistry,
} from 'enforma';
import muiComponents from 'enforma-mui';

registerComponents(muiComponents as Partial<EnformaComponentRegistry>, { variant: 'outlined' });

interface PreviewProps {
  children: React.ReactNode;
  initialValues?: FormValues;
}

export function Preview({ children, initialValues = {} }: PreviewProps) {
  const [values, setValues] = useState<FormValues>(initialValues);
  return (
    <div className="preview-card">
      <Enforma.Form values={values} onChange={setValues}>
        {children}
      </Enforma.Form>
    </div>
  );
}
```

### 2. `apps/docs/src/demos/<ComponentName>Demos.tsx`

One file per component doc page (15 files total). `src/demos/` is a plain TypeScript source directory with no special Astro meaning — Astro only reserves `src/pages/` and `src/content/`.

Each file:

- Imports `Enforma` from `'enforma'` and `{ Preview }` from `'../components/Preview'`.
- Exports one named React component per `{/* StackBlitz: TODO */}` placeholder in the corresponding `.mdx` file. **Implementers must audit each `.mdx` file to count placeholders and name exports accordingly.**
- Contains only the JSX for the fields — no registration, no state management (unless bypassing `Preview` for advanced cases as in `FormDemos.tsx`).
- Multiple fields that belong to the same example are wrapped in a single `<Preview>` so they share form state.

Complete example for `TextInputDemos.tsx` (5 placeholders → 5 exports):

```tsx
// apps/docs/src/demos/TextInputDemos.tsx
import Enforma from 'enforma';
import { Preview } from '../components/Preview';

export function BasicDemo() {
  return (
    <Preview>
      <Enforma.TextInput bind="name" label="Name" placeholder="Your name" />
    </Preview>
  );
}

export function ValidationDemo() {
  return (
    <Preview>
      <Enforma.TextInput
        bind="email"
        label="Email"
        validate={(v) => (!v ? 'Required' : !String(v).includes('@') ? 'Invalid email' : null)}
      />
    </Preview>
  );
}

export function ReactiveLabelDemo() {
  return (
    <Preview>
      <Enforma.TextInput bind="name" label="Name" placeholder="Enter your name first" />
      <Enforma.TextInput
        bind="email"
        label={({ name }) => `Email for ${String(name) || 'you'}`}
        disabled={({ name }) => !name}
      />
    </Preview>
  );
}

export function MaskDemo() {
  return (
    <Preview initialValues={{ phone: '5550000000', dob: '01011990' }}>
      <Enforma.TextInput bind="phone" label="Phone" mask="(000) 000-0000" placeholder="(555) 000-0000" />
      <Enforma.TextInput bind="dob" label="Date of birth" mask="00/00/0000" placeholder="MM/DD/YYYY" />
    </Preview>
  );
}

export function LengthDemo() {
  return (
    <Preview>
      <Enforma.TextInput bind="username" label="Username" required minLength={3} maxLength={20} />
    </Preview>
  );
}
```

`FormDemos.tsx` is the special case (4 placeholders → 4 exports). Three of the four demos require capabilities `Preview` does not expose, so they manage state directly and use `<div className="preview-card">` for the card shell. `BasicDemo` uses `Preview` and includes a submit button inside it — the button is intentionally non-functional in this context (no `onSubmit` is wired up on `Preview`'s form), which is fine for a Usage illustration. Use `Enforma.Select.Option` (not `Enforma.SelectOption`) to match the code block in `form.mdx`:

```tsx
// apps/docs/src/demos/FormDemos.tsx
import { useState } from 'react';
import Enforma, { type FormValues } from 'enforma';
import { Preview } from '../components/Preview';

export function BasicDemo() {
  return (
    <Preview>
      <Enforma.TextInput bind="name" label="Name" />
      <button type="submit">Submit</button>
    </Preview>
  );
}

export function SubmitDemo() {
  const [values, setValues] = useState<FormValues>({});
  const [submitted, setSubmitted] = useState(false);
  return (
    <div className="preview-card">
      <Enforma.Form values={values} onChange={setValues} onSubmit={() => setSubmitted(true)}>
        <Enforma.TextInput bind="name" label="Name" required />
        <button type="submit">Submit</button>
      </Enforma.Form>
      {submitted && <p style={{ marginTop: '0.5rem' }}>Submitted!</p>}
    </div>
  );
}

export function DataSourcesDemo() {
  const [values, setValues] = useState<FormValues>({});
  return (
    <div className="preview-card">
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
    </div>
  );
}

export function ValidityDemo() {
  const [values, setValues] = useState<FormValues>({});
  const [isValid, setIsValid] = useState(false);
  return (
    <div className="preview-card">
      <Enforma.Form
        values={values}
        onChange={(newValues, { valid }) => {
          setValues(newValues);
          setIsValid(valid);
        }}
      >
        <Enforma.TextInput bind="name" label="Name" required />
      </Enforma.Form>
      <p style={{ marginTop: '0.5rem' }}>Form valid: {isValid ? 'yes' : 'no'}</p>
    </div>
  );
}
```

### 3. MDX pages — replace `{/* StackBlitz: TODO */}` comments

**Existing ordering:** Every MDX file currently has the pattern: code block first, then `{/* StackBlitz: TODO */}`. The demo component replaces the placeholder in that same position — i.e., the demo goes **below** the code block. Do not reorder existing code blocks.

**Astro hydration:** Use `client:load` on every demo. This hydrates all interactive components immediately on page load, ensuring no flash of empty space for above-the-fold demos. With typically 2–5 demos per page this overhead is negligible for a docs site.

**Import path:** All 15 component MDX files are confirmed at `src/content/docs/components/`, so their import is always `'../../../demos/<Name>Demos'`.

**Confirmed:** All 15 component MDX files contain at least one `{/* StackBlitz: TODO */}` comment.

Example for one section of `text-input.mdx`:

Before:
```
## Usage

\`\`\`tsx
<Enforma.TextInput bind="name" label="Name" placeholder="Your name" />
\`\`\`

{/* StackBlitz: TODO */}
```

After (import added at top of file, placeholder replaced):
```
import { BasicDemo, ValidationDemo, ReactiveLabelDemo, MaskDemo, LengthDemo } from '../../../demos/TextInputDemos';

## Usage

\`\`\`tsx
<Enforma.TextInput bind="name" label="Name" placeholder="Your name" />
\`\`\`

<BasicDemo client:load />
```

## Styling

Add a `.preview-card` rule to `apps/docs/src/styles/custom.css` (file already exists — append to it):

```css
.preview-card {
  border: 1px solid var(--sl-color-gray-5);
  border-radius: 0.5rem;
  padding: 1.5rem;
  margin-block: 1rem;
  background-color: var(--sl-color-gray-7, transparent);
}
```

`--sl-color-gray-5` and `--sl-color-gray-7` are Starlight's standard surface tokens, so the card automatically adapts to light/dark mode. The `transparent` fallback is safe for both themes.

## Files Created or Modified

| File | Action | Purpose |
|------|---------|---------|
| `src/components/Preview.tsx` | Create | Shared registration + Form wrapper |
| `src/styles/custom.css` | Edit (append) | Add `.preview-card` styles |
| `src/demos/FormDemos.tsx` | Create | Demos for components/form.mdx |
| `src/demos/TextInputDemos.tsx` | Create | Demos for components/text-input.mdx |
| `src/demos/TextareaDemos.tsx` | Create | Demos for components/textarea.mdx |
| `src/demos/SelectDemos.tsx` | Create | Demos for components/select.mdx |
| `src/demos/CheckboxSwitchDemos.tsx` | Create | Demos for components/checkbox-switch.mdx |
| `src/demos/RadioGroupDemos.tsx` | Create | Demos for components/radio-group.mdx |
| `src/demos/AutocompleteDemos.tsx` | Create | Demos for components/autocomplete.mdx |
| `src/demos/ExclusiveToggleDemos.tsx` | Create | Demos for components/exclusive-toggle.mdx |
| `src/demos/NumberInputDemos.tsx` | Create | Demos for components/number-input.mdx |
| `src/demos/DateTimeDemos.tsx` | Create | Demos for components/date-time.mdx |
| `src/demos/FieldsetDemos.tsx` | Create | Demos for components/fieldset.mdx |
| `src/demos/ListDemos.tsx` | Create | Demos for components/list.mdx |
| `src/demos/CalculatedDemos.tsx` | Create | Demos for components/calculated.mdx |
| `src/demos/OutputDemos.tsx` | Create | Demos for components/output.mdx |
| `src/demos/ScopeDemos.tsx` | Create | Demos for components/scope.mdx |
| `src/content/docs/components/*.mdx` | Edit (15 files) | Replace StackBlitz TODO comments with demo imports and `client:load` usage |

## Out of Scope

- Editable playgrounds / live code editors
- StackBlitz / CodeSandbox embeds
- Showing form values alongside demos
- Any changes to `packages/enforma`
