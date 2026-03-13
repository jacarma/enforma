# Live Component Previews in Docs — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add interactive React form demos to all 15 component doc pages, replacing `{/* StackBlitz: TODO */}` placeholders.

**Architecture:** `Preview.tsx` wrapper handles MUI registration and form state; 15 `*Demos.tsx` files export one component per placeholder; MDX pages import and embed them with `client:load`. No npm release needed — `enforma` and `enforma-mui` are `workspace:*` deps.

**Tech Stack:** Astro 5, Starlight, MDX, React 18, MUI v6, dayjs, enforma (workspace), enforma-mui (workspace), Vitest + Testing Library (jsdom)

---

## Chunk 1: Foundation + FormDemos + TextInputDemos

### Task 1: Preview component + CSS + dayjs

**Files:**
- Create: `apps/docs/src/components/Preview.tsx`
- Create: `apps/docs/src/components/Preview.test.tsx`
- Modify: `apps/docs/src/styles/custom.css`

- [ ] **Step 1: Add dayjs dependency**

```bash
nvm use 20 && pnpm --filter docs add dayjs
```

Expected: `dayjs` added to `apps/docs/package.json`.

- [ ] **Step 2: Write failing tests**

Create `apps/docs/src/components/Preview.test.tsx`:

```tsx
// apps/docs/src/components/Preview.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { test, expect } from 'vitest';
import { Preview } from './Preview';
import Enforma from 'enforma';

test('renders children inside a form', () => {
  render(
    <Preview>
      <Enforma.TextInput bind="name" label="Name" />
    </Preview>
  );
  expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
});

test('wraps content in .preview-card', () => {
  const { container } = render(
    <Preview>
      <Enforma.TextInput bind="name" label="Name" />
    </Preview>
  );
  expect(container.querySelector('.preview-card')).toBeInTheDocument();
});

test('manages form state internally', async () => {
  const user = userEvent.setup();
  render(
    <Preview>
      <Enforma.TextInput bind="name" label="Name" />
    </Preview>
  );
  await user.type(screen.getByLabelText(/name/i), 'Alice');
  expect(screen.getByLabelText(/name/i)).toHaveValue('Alice');
});

test('accepts initialValues', () => {
  render(
    <Preview initialValues={{ name: 'Bob' }}>
      <Enforma.TextInput bind="name" label="Name" />
    </Preview>
  );
  expect(screen.getByLabelText(/name/i)).toHaveValue('Bob');
});
```

- [ ] **Step 3: Run tests — expect fail**

```bash
nvm use 20 && pnpm --filter docs exec vitest run src/components/Preview.test.tsx
```

Expected: FAIL — `Preview` not found.

- [ ] **Step 4: Create Preview.tsx**

Create `apps/docs/src/components/Preview.tsx`:

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

- [ ] **Step 5: Append .preview-card to custom.css**

Append to `apps/docs/src/styles/custom.css`:

```css
.preview-card {
  border: 1px solid var(--sl-color-gray-5);
  border-radius: 0.5rem;
  padding: 1.5rem;
  margin-block: 1rem;
  background-color: var(--sl-color-gray-7, transparent);
}
```

- [ ] **Step 6: Run tests — expect pass**

```bash
nvm use 20 && pnpm --filter docs exec vitest run src/components/Preview.test.tsx
```

Expected: 4 passing.

- [ ] **Step 7: Lint and typecheck**

```bash
nvm use 20 && pnpm lint && pnpm typecheck
```

- [ ] **Step 8: Commit**

```bash
git add apps/docs/src/components/Preview.tsx apps/docs/src/components/Preview.test.tsx apps/docs/src/styles/custom.css apps/docs/package.json pnpm-lock.yaml
git commit -m "feat(docs): add Preview wrapper component and preview-card CSS"
```

---

### Task 2: FormDemos.tsx + form.mdx

**Files:**
- Create: `apps/docs/src/demos/FormDemos.tsx`
- Create: `apps/docs/src/demos/FormDemos.test.tsx`
- Modify: `apps/docs/src/content/docs/components/form.mdx`

`form.mdx` has 4 placeholders: Usage → `BasicDemo`, With submit handler → `SubmitDemo`, With data sources → `DataSourcesDemo`, Reading validity → `ValidityDemo`.

- [ ] **Step 1: Write failing tests**

Create `apps/docs/src/demos/FormDemos.test.tsx`:

```tsx
// apps/docs/src/demos/FormDemos.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { test, expect } from 'vitest';
import { BasicDemo, SubmitDemo, DataSourcesDemo, ValidityDemo } from './FormDemos';

test('BasicDemo renders a name input', () => {
  render(<BasicDemo />);
  expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
});

test('SubmitDemo shows Submitted! after clicking submit with a name', async () => {
  const user = userEvent.setup();
  render(<SubmitDemo />);
  await user.type(screen.getByLabelText(/name/i), 'Alice');
  await user.click(screen.getByRole('button', { name: /submit/i }));
  expect(screen.getByText(/submitted!/i)).toBeInTheDocument();
});

test('DataSourcesDemo renders a country select', () => {
  render(<DataSourcesDemo />);
  expect(screen.getByLabelText(/country/i)).toBeInTheDocument();
});

test('ValidityDemo shows validity state', () => {
  render(<ValidityDemo />);
  expect(screen.getByText(/form valid/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests — expect fail**

```bash
nvm use 20 && pnpm --filter docs exec vitest run src/demos/FormDemos.test.tsx
```

- [ ] **Step 3: Create FormDemos.tsx**

Create `apps/docs/src/demos/FormDemos.tsx`:

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

- [ ] **Step 4: Run tests — expect pass**

```bash
nvm use 20 && pnpm --filter docs exec vitest run src/demos/FormDemos.test.tsx
```

Expected: 4 passing.

- [ ] **Step 5: Update form.mdx**

Add after the closing `---` of the frontmatter:

```mdx
import { BasicDemo, SubmitDemo, DataSourcesDemo, ValidityDemo } from '../../../demos/FormDemos';
```

Replace the 4 `{/* StackBlitz: TODO */}` comments in order:
- After Usage code block → `<BasicDemo client:load />`
- After "With submit handler" code block → `<SubmitDemo client:load />`
- After "With data sources" code block → `<DataSourcesDemo client:load />`
- After "Reading validity" code block → `<ValidityDemo client:load />`

- [ ] **Step 6: Lint, typecheck, commit**

```bash
nvm use 20 && pnpm lint && pnpm typecheck
git add apps/docs/src/demos/FormDemos.tsx apps/docs/src/demos/FormDemos.test.tsx apps/docs/src/content/docs/components/form.mdx
git commit -m "feat(docs): add Form component demos"
```

---

### Task 3: TextInputDemos.tsx + text-input.mdx

**Files:**
- Create: `apps/docs/src/demos/TextInputDemos.tsx`
- Create: `apps/docs/src/demos/TextInputDemos.test.tsx`
- Modify: `apps/docs/src/content/docs/components/text-input.mdx`

5 placeholders: Usage → `BasicDemo`, With validation → `ValidationDemo`, Reactive label → `ReactiveLabelDemo`, With mask → `MaskDemo`, Length → `LengthDemo`.

- [ ] **Step 1: Write failing tests**

Create `apps/docs/src/demos/TextInputDemos.test.tsx`:

```tsx
// apps/docs/src/demos/TextInputDemos.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { test, expect } from 'vitest';
import { BasicDemo, ValidationDemo, ReactiveLabelDemo, MaskDemo, LengthDemo } from './TextInputDemos';

test('BasicDemo renders name input', () => {
  render(<BasicDemo />);
  expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
});

test('ValidationDemo renders email input', () => {
  render(<ValidationDemo />);
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
});

test('ReactiveLabelDemo: email disabled until name entered', async () => {
  const user = userEvent.setup();
  render(<ReactiveLabelDemo />);
  expect(screen.getByLabelText(/email for you/i)).toBeDisabled();
  await user.type(screen.getByLabelText(/^name/i), 'Alice');
  expect(screen.getByLabelText(/email for alice/i)).toBeEnabled();
});

test('MaskDemo renders phone and dob inputs', () => {
  render(<MaskDemo />);
  expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/date of birth/i)).toBeInTheDocument();
});

test('LengthDemo renders username input', () => {
  render(<LengthDemo />);
  expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests — expect fail**

```bash
nvm use 20 && pnpm --filter docs exec vitest run src/demos/TextInputDemos.test.tsx
```

- [ ] **Step 3: Create TextInputDemos.tsx**

Create `apps/docs/src/demos/TextInputDemos.tsx`:

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

- [ ] **Step 4: Run tests — expect pass**

```bash
nvm use 20 && pnpm --filter docs exec vitest run src/demos/TextInputDemos.test.tsx
```

Expected: 5 passing.

- [ ] **Step 5: Update text-input.mdx**

Add after frontmatter:

```mdx
import { BasicDemo, ValidationDemo, ReactiveLabelDemo, MaskDemo, LengthDemo } from '../../../demos/TextInputDemos';
```

Replace 5 placeholders in order with `<BasicDemo client:load />`, `<ValidationDemo client:load />`, `<ReactiveLabelDemo client:load />`, `<MaskDemo client:load />`, `<LengthDemo client:load />`.

- [ ] **Step 6: Lint, typecheck, commit**

```bash
nvm use 20 && pnpm lint && pnpm typecheck
git add apps/docs/src/demos/TextInputDemos.tsx apps/docs/src/demos/TextInputDemos.test.tsx apps/docs/src/content/docs/components/text-input.mdx
git commit -m "feat(docs): add TextInput demos"
```

---

## Chunk 2: Textarea through ExclusiveToggle

### Task 4: TextareaDemos.tsx + textarea.mdx

**Files:**
- Create: `apps/docs/src/demos/TextareaDemos.tsx`
- Create: `apps/docs/src/demos/TextareaDemos.test.tsx`
- Modify: `apps/docs/src/content/docs/components/textarea.mdx`

3 placeholders: Usage → `BasicDemo`, With validation → `ValidationDemo`, Conditionally visible → `ConditionalDemo`.

- [ ] **Step 1: Write failing tests**

Create `apps/docs/src/demos/TextareaDemos.test.tsx`:

```tsx
// apps/docs/src/demos/TextareaDemos.test.tsx
import { render, screen } from '@testing-library/react';
import { test, expect } from 'vitest';
import { BasicDemo, ValidationDemo, ConditionalDemo } from './TextareaDemos';

test('BasicDemo renders bio textarea', () => {
  render(<BasicDemo />);
  expect(screen.getByLabelText(/bio/i)).toBeInTheDocument();
});

test('ValidationDemo renders checkbox and comment textarea', () => {
  render(<ValidationDemo />);
  expect(screen.getByLabelText(/add a comment/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/^comment/i)).toBeInTheDocument();
});

test('ConditionalDemo renders feedback type select', () => {
  render(<ConditionalDemo />);
  expect(screen.getByLabelText(/feedback type/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run — expect fail**

```bash
nvm use 20 && pnpm --filter docs exec vitest run src/demos/TextareaDemos.test.tsx
```

- [ ] **Step 3: Create TextareaDemos.tsx**

```tsx
// apps/docs/src/demos/TextareaDemos.tsx
import Enforma from 'enforma';
import { Preview } from '../components/Preview';

export function BasicDemo() {
  return (
    <Preview>
      <Enforma.Textarea bind="bio" label="Bio" placeholder="Tell us about yourself..." />
    </Preview>
  );
}

export function ValidationDemo() {
  return (
    <Preview>
      <Enforma.Checkbox bind="hasComment" label="Add a comment" />
      <Enforma.Textarea
        bind="comment"
        label="Comment"
        placeholder="Your comment..."
        disabled={({ hasComment }) => !hasComment}
        validate={(v, { hasComment }) => (hasComment && !v ? 'Comment is required' : null)}
      />
    </Preview>
  );
}

export function ConditionalDemo() {
  return (
    <Preview>
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
    </Preview>
  );
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
nvm use 20 && pnpm --filter docs exec vitest run src/demos/TextareaDemos.test.tsx
```

- [ ] **Step 5: Update textarea.mdx**

Add after frontmatter: `import { BasicDemo, ValidationDemo, ConditionalDemo } from '../../../demos/TextareaDemos';`

Replace 3 placeholders.

- [ ] **Step 6: Lint, typecheck, commit**

```bash
nvm use 20 && pnpm lint && pnpm typecheck
git add apps/docs/src/demos/TextareaDemos.tsx apps/docs/src/demos/TextareaDemos.test.tsx apps/docs/src/content/docs/components/textarea.mdx
git commit -m "feat(docs): add Textarea demos"
```

---

### Task 5: SelectDemos.tsx + select.mdx

**Files:**
- Create: `apps/docs/src/demos/SelectDemos.tsx`
- Create: `apps/docs/src/demos/SelectDemos.test.tsx`
- Modify: `apps/docs/src/content/docs/components/select.mdx`

4 placeholders: Usage → `BasicDemo`, With data source → `DataSourceDemo`, Filtered cascading → `CascadingDemo`, openChoice → `OpenChoiceDemo`. `DataSourceDemo` and `CascadingDemo` bypass `Preview` to provide `dataSources`.

- [ ] **Step 1: Write failing tests**

```tsx
// apps/docs/src/demos/SelectDemos.test.tsx
import { render, screen } from '@testing-library/react';
import { test, expect } from 'vitest';
import { BasicDemo, DataSourceDemo, CascadingDemo, OpenChoiceDemo } from './SelectDemos';

test('BasicDemo renders country select', () => {
  render(<BasicDemo />);
  expect(screen.getByLabelText(/country/i)).toBeInTheDocument();
});

test('DataSourceDemo renders country select', () => {
  render(<DataSourceDemo />);
  expect(screen.getByLabelText(/country/i)).toBeInTheDocument();
});

test('CascadingDemo renders country and city selects', () => {
  render(<CascadingDemo />);
  expect(screen.getByLabelText(/country/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
});

test('OpenChoiceDemo renders colour select', () => {
  render(<OpenChoiceDemo />);
  expect(screen.getByLabelText(/favourite colour/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run — expect fail**

```bash
nvm use 20 && pnpm --filter docs exec vitest run src/demos/SelectDemos.test.tsx
```

- [ ] **Step 3: Create SelectDemos.tsx**

```tsx
// apps/docs/src/demos/SelectDemos.tsx
import { useState } from 'react';
import Enforma, { type FormValues } from 'enforma';
import { Preview } from '../components/Preview';

export function BasicDemo() {
  return (
    <Preview>
      <Enforma.Select bind="country" label="Country">
        <Enforma.Select.Option value="us" label="United States" />
        <Enforma.Select.Option value="gb" label="United Kingdom" />
      </Enforma.Select>
    </Preview>
  );
}

export function DataSourceDemo() {
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

export function CascadingDemo() {
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
          cities: [
            { code: 'nyc', name: 'New York', country: 'us' },
            { code: 'la', name: 'Los Angeles', country: 'us' },
            { code: 'lon', name: 'London', country: 'gb' },
          ],
        }}
      >
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
      </Enforma.Form>
    </div>
  );
}

export function OpenChoiceDemo() {
  return (
    <Preview>
      <Enforma.Select bind="color" label="Favourite colour" openChoice>
        <Enforma.Select.Option value="red" label="Red" />
        <Enforma.Select.Option value="blue" label="Blue" />
      </Enforma.Select>
    </Preview>
  );
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
nvm use 20 && pnpm --filter docs exec vitest run src/demos/SelectDemos.test.tsx
```

- [ ] **Step 5: Update select.mdx**

Add after frontmatter: `import { BasicDemo, DataSourceDemo, CascadingDemo, OpenChoiceDemo } from '../../../demos/SelectDemos';`

Replace 4 placeholders.

- [ ] **Step 6: Lint, typecheck, commit**

```bash
nvm use 20 && pnpm lint && pnpm typecheck
git add apps/docs/src/demos/SelectDemos.tsx apps/docs/src/demos/SelectDemos.test.tsx apps/docs/src/content/docs/components/select.mdx
git commit -m "feat(docs): add Select demos"
```

---

### Task 6: CheckboxSwitchDemos.tsx + checkbox-switch.mdx

**Files:**
- Create: `apps/docs/src/demos/CheckboxSwitchDemos.tsx`
- Create: `apps/docs/src/demos/CheckboxSwitchDemos.test.tsx`
- Modify: `apps/docs/src/content/docs/components/checkbox-switch.mdx`

4 placeholders: Usage → `BasicDemo`, Reactive disabled → `ReactiveDisabledDemo`, Switch label left → `SwitchLabelDemo`, Required → `RequiredDemo`.

- [ ] **Step 1: Write failing tests**

```tsx
// apps/docs/src/demos/CheckboxSwitchDemos.test.tsx
import { render, screen } from '@testing-library/react';
import { test, expect } from 'vitest';
import { BasicDemo, ReactiveDisabledDemo, SwitchLabelDemo, RequiredDemo } from './CheckboxSwitchDemos';

test('BasicDemo renders checkbox and switch', () => {
  render(<BasicDemo />);
  expect(screen.getByLabelText(/i agree/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/dark mode/i)).toBeInTheDocument();
});

test('ReactiveDisabledDemo: newsletter disabled until agree checked', () => {
  render(<ReactiveDisabledDemo />);
  expect(screen.getByLabelText(/subscribe/i)).toBeDisabled();
});

test('SwitchLabelDemo renders notifications switch', () => {
  render(<SwitchLabelDemo />);
  expect(screen.getByLabelText(/email notifications/i)).toBeInTheDocument();
});

test('RequiredDemo renders terms checkbox', () => {
  render(<RequiredDemo />);
  expect(screen.getByLabelText(/accept the terms/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run — expect fail**

```bash
nvm use 20 && pnpm --filter docs exec vitest run src/demos/CheckboxSwitchDemos.test.tsx
```

- [ ] **Step 3: Create CheckboxSwitchDemos.tsx**

```tsx
// apps/docs/src/demos/CheckboxSwitchDemos.tsx
import Enforma from 'enforma';
import { Preview } from '../components/Preview';

export function BasicDemo() {
  return (
    <Preview>
      <Enforma.Checkbox bind="agree" label="I agree to the terms" />
      <Enforma.Switch bind="darkMode" label="Dark mode" />
    </Preview>
  );
}

export function ReactiveDisabledDemo() {
  return (
    <Preview>
      <Enforma.Checkbox bind="agree" label="I agree to the terms" />
      <Enforma.Checkbox
        bind="newsletter"
        label="Subscribe to newsletter"
        disabled={({ agree }) => !agree}
      />
    </Preview>
  );
}

export function SwitchLabelDemo() {
  return (
    <Preview>
      <Enforma.Switch bind="notifications" label="Email notifications" labelPlacement="start" />
    </Preview>
  );
}

export function RequiredDemo() {
  return (
    <Preview>
      <Enforma.Checkbox bind="terms" label="I accept the terms and conditions" required />
    </Preview>
  );
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
nvm use 20 && pnpm --filter docs exec vitest run src/demos/CheckboxSwitchDemos.test.tsx
```

- [ ] **Step 5: Update checkbox-switch.mdx**

Add after frontmatter: `import { BasicDemo, ReactiveDisabledDemo, SwitchLabelDemo, RequiredDemo } from '../../../demos/CheckboxSwitchDemos';`

Replace 4 placeholders.

- [ ] **Step 6: Lint, typecheck, commit**

```bash
nvm use 20 && pnpm lint && pnpm typecheck
git add apps/docs/src/demos/CheckboxSwitchDemos.tsx apps/docs/src/demos/CheckboxSwitchDemos.test.tsx apps/docs/src/content/docs/components/checkbox-switch.mdx
git commit -m "feat(docs): add Checkbox & Switch demos"
```

---

### Task 7: RadioGroupDemos.tsx + radio-group.mdx

**Files:**
- Create: `apps/docs/src/demos/RadioGroupDemos.tsx`
- Create: `apps/docs/src/demos/RadioGroupDemos.test.tsx`
- Modify: `apps/docs/src/content/docs/components/radio-group.mdx`

3 placeholders: Usage → `BasicDemo`, Horizontal + data source → `HorizontalDataSourceDemo`, openChoice → `OpenChoiceDemo`. `HorizontalDataSourceDemo` bypasses `Preview`.

- [ ] **Step 1: Write failing tests**

```tsx
// apps/docs/src/demos/RadioGroupDemos.test.tsx
import { render, screen } from '@testing-library/react';
import { test, expect } from 'vitest';
import { BasicDemo, HorizontalDataSourceDemo, OpenChoiceDemo } from './RadioGroupDemos';

test('BasicDemo renders size radio group', () => {
  render(<BasicDemo />);
  expect(screen.getByLabelText(/^size/i)).toBeInTheDocument();
});

test('HorizontalDataSourceDemo renders country radio group', () => {
  render(<HorizontalDataSourceDemo />);
  expect(screen.getByLabelText(/country/i)).toBeInTheDocument();
});

test('OpenChoiceDemo renders size radio group', () => {
  render(<OpenChoiceDemo />);
  expect(screen.getByLabelText(/^size/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run — expect fail**

```bash
nvm use 20 && pnpm --filter docs exec vitest run src/demos/RadioGroupDemos.test.tsx
```

- [ ] **Step 3: Create RadioGroupDemos.tsx**

```tsx
// apps/docs/src/demos/RadioGroupDemos.tsx
import { useState } from 'react';
import Enforma, { type FormValues } from 'enforma';
import { Preview } from '../components/Preview';

export function BasicDemo() {
  return (
    <Preview>
      <Enforma.RadioGroup bind="size" label="Size">
        <Enforma.RadioGroup.Option value="s" label="Small" />
        <Enforma.RadioGroup.Option value="m" label="Medium" />
        <Enforma.RadioGroup.Option value="l" label="Large" />
      </Enforma.RadioGroup>
    </Preview>
  );
}

export function HorizontalDataSourceDemo() {
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
        <Enforma.RadioGroup bind="country" label="Country" dataSource="countries" row>
          <Enforma.RadioGroup.Option label="name" value="code" />
        </Enforma.RadioGroup>
      </Enforma.Form>
    </div>
  );
}

export function OpenChoiceDemo() {
  return (
    <Preview>
      <Enforma.RadioGroup bind="size" label="Size" openChoice>
        <Enforma.RadioGroup.Option value="s" label="Small" />
        <Enforma.RadioGroup.Option value="m" label="Medium" />
        <Enforma.RadioGroup.Option value="l" label="Large" />
      </Enforma.RadioGroup>
    </Preview>
  );
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
nvm use 20 && pnpm --filter docs exec vitest run src/demos/RadioGroupDemos.test.tsx
```

- [ ] **Step 5: Update radio-group.mdx**

Add after frontmatter: `import { BasicDemo, HorizontalDataSourceDemo, OpenChoiceDemo } from '../../../demos/RadioGroupDemos';`

Replace 3 placeholders.

- [ ] **Step 6: Lint, typecheck, commit**

```bash
nvm use 20 && pnpm lint && pnpm typecheck
git add apps/docs/src/demos/RadioGroupDemos.tsx apps/docs/src/demos/RadioGroupDemos.test.tsx apps/docs/src/content/docs/components/radio-group.mdx
git commit -m "feat(docs): add RadioGroup demos"
```

---

### Task 8: AutocompleteDemos.tsx + autocomplete.mdx

**Files:**
- Create: `apps/docs/src/demos/AutocompleteDemos.tsx`
- Create: `apps/docs/src/demos/AutocompleteDemos.test.tsx`
- Modify: `apps/docs/src/content/docs/components/autocomplete.mdx`

2 placeholders: Usage → `BasicDemo`, With async data source → `AsyncSourceDemo`. `AsyncSourceDemo` bypasses `Preview` and uses a synchronous mock data source (the `query` function returns an array synchronously — `DataSourceDefinition.query` allows non-Promise return values).

- [ ] **Step 1: Write failing tests**

```tsx
// apps/docs/src/demos/AutocompleteDemos.test.tsx
import { render, screen } from '@testing-library/react';
import { test, expect } from 'vitest';
import { BasicDemo, AsyncSourceDemo } from './AutocompleteDemos';

test('BasicDemo renders country autocomplete', () => {
  render(<BasicDemo />);
  expect(screen.getByLabelText(/country/i)).toBeInTheDocument();
});

test('AsyncSourceDemo renders book autocomplete', () => {
  render(<AsyncSourceDemo />);
  expect(screen.getByLabelText(/book/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run — expect fail**

```bash
nvm use 20 && pnpm --filter docs exec vitest run src/demos/AutocompleteDemos.test.tsx
```

- [ ] **Step 3: Create AutocompleteDemos.tsx**

```tsx
// apps/docs/src/demos/AutocompleteDemos.tsx
import { useState } from 'react';
import Enforma, { type FormValues, type DataSourceParams } from 'enforma';
import { Preview } from '../components/Preview';

const BOOKS = [
  { key: '1', label: 'The Great Gatsby' },
  { key: '2', label: 'To Kill a Mockingbird' },
  { key: '3', label: 'Pride and Prejudice' },
];

const booksSource = {
  query: ({ search }: DataSourceParams) =>
    BOOKS.filter((b) => !search || b.label.toLowerCase().includes(search.toLowerCase())),
  resolve: (value: unknown) =>
    BOOKS.find((b) => b.key === value) ?? { key: String(value), label: String(value) },
};

export function BasicDemo() {
  return (
    <Preview>
      <Enforma.Autocomplete bind="country" label="Country">
        <Enforma.Autocomplete.Option value="us" label="United States" />
        <Enforma.Autocomplete.Option value="gb" label="United Kingdom" />
      </Enforma.Autocomplete>
    </Preview>
  );
}

export function AsyncSourceDemo() {
  const [values, setValues] = useState<FormValues>({});
  return (
    <div className="preview-card">
      <Enforma.Form values={values} onChange={setValues} dataSources={{ books: booksSource }}>
        <Enforma.Autocomplete bind="book" label="Book" dataSource="books" minSearchLength={0}>
          <Enforma.Autocomplete.Option label="label" value="key" />
        </Enforma.Autocomplete>
      </Enforma.Form>
    </div>
  );
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
nvm use 20 && pnpm --filter docs exec vitest run src/demos/AutocompleteDemos.test.tsx
```

- [ ] **Step 5: Update autocomplete.mdx**

Add after frontmatter: `import { BasicDemo, AsyncSourceDemo } from '../../../demos/AutocompleteDemos';`

Replace 2 placeholders.

- [ ] **Step 6: Lint, typecheck, commit**

```bash
nvm use 20 && pnpm lint && pnpm typecheck
git add apps/docs/src/demos/AutocompleteDemos.tsx apps/docs/src/demos/AutocompleteDemos.test.tsx apps/docs/src/content/docs/components/autocomplete.mdx
git commit -m "feat(docs): add Autocomplete demos"
```

---

### Task 9: ExclusiveToggleDemos.tsx + exclusive-toggle.mdx

**Files:**
- Create: `apps/docs/src/demos/ExclusiveToggleDemos.tsx`
- Create: `apps/docs/src/demos/ExclusiveToggleDemos.test.tsx`
- Modify: `apps/docs/src/content/docs/components/exclusive-toggle.mdx`

2 placeholders: Usage → `BasicDemo`, openChoice with pre-loaded value → `OpenChoiceDemo`. `OpenChoiceDemo` uses `initialValues={{ format: 'epub' }}` — a value not in the option list — so "Other" is pre-selected.

- [ ] **Step 1: Write failing tests**

```tsx
// apps/docs/src/demos/ExclusiveToggleDemos.test.tsx
import { render, screen } from '@testing-library/react';
import { test, expect } from 'vitest';
import { BasicDemo, OpenChoiceDemo } from './ExclusiveToggleDemos';

test('BasicDemo renders size toggle', () => {
  render(<BasicDemo />);
  expect(screen.getByLabelText(/^size/i)).toBeInTheDocument();
});

test('OpenChoiceDemo renders format toggle', () => {
  render(<OpenChoiceDemo />);
  expect(screen.getByLabelText(/format/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run — expect fail**

```bash
nvm use 20 && pnpm --filter docs exec vitest run src/demos/ExclusiveToggleDemos.test.tsx
```

- [ ] **Step 3: Create ExclusiveToggleDemos.tsx**

```tsx
// apps/docs/src/demos/ExclusiveToggleDemos.tsx
import Enforma from 'enforma';
import { Preview } from '../components/Preview';

export function BasicDemo() {
  return (
    <Preview>
      <Enforma.ExclusiveToggle bind="size" label="Size">
        <Enforma.ExclusiveToggle.Option value="s" label="S" />
        <Enforma.ExclusiveToggle.Option value="m" label="M" />
        <Enforma.ExclusiveToggle.Option value="l" label="L" />
      </Enforma.ExclusiveToggle>
    </Preview>
  );
}

export function OpenChoiceDemo() {
  return (
    <Preview initialValues={{ format: 'epub' }}>
      <Enforma.ExclusiveToggle bind="format" label="Format" openChoice>
        <Enforma.ExclusiveToggle.Option value="pdf" label="PDF" />
        <Enforma.ExclusiveToggle.Option value="csv" label="CSV" />
      </Enforma.ExclusiveToggle>
    </Preview>
  );
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
nvm use 20 && pnpm --filter docs exec vitest run src/demos/ExclusiveToggleDemos.test.tsx
```

- [ ] **Step 5: Update exclusive-toggle.mdx**

Add after frontmatter: `import { BasicDemo, OpenChoiceDemo } from '../../../demos/ExclusiveToggleDemos';`

Replace 2 placeholders.

- [ ] **Step 6: Lint, typecheck, commit**

```bash
nvm use 20 && pnpm lint && pnpm typecheck
git add apps/docs/src/demos/ExclusiveToggleDemos.tsx apps/docs/src/demos/ExclusiveToggleDemos.test.tsx apps/docs/src/content/docs/components/exclusive-toggle.mdx
git commit -m "feat(docs): add ExclusiveToggle demos"
```

---

## Chunk 3: NumberInput through Scope

### Task 10: NumberInputDemos.tsx + number-input.mdx

**Files:**
- Create: `apps/docs/src/demos/NumberInputDemos.tsx`
- Create: `apps/docs/src/demos/NumberInputDemos.test.tsx`
- Modify: `apps/docs/src/content/docs/components/number-input.mdx`

3 placeholders: Usage → `BasicDemo`, Integer → `IntegerDemo`, Percentage → `PercentageDemo`.

- [ ] **Step 1: Write failing tests**

```tsx
// apps/docs/src/demos/NumberInputDemos.test.tsx
import { render, screen } from '@testing-library/react';
import { test, expect } from 'vitest';
import { BasicDemo, IntegerDemo, PercentageDemo } from './NumberInputDemos';

test('BasicDemo renders price input', () => {
  render(<BasicDemo />);
  expect(screen.getByLabelText(/price/i)).toBeInTheDocument();
});

test('IntegerDemo renders quantity input', () => {
  render(<IntegerDemo />);
  expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument();
});

test('PercentageDemo renders rate input', () => {
  render(<PercentageDemo />);
  expect(screen.getByLabelText(/rate/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run — expect fail**

```bash
nvm use 20 && pnpm --filter docs exec vitest run src/demos/NumberInputDemos.test.tsx
```

- [ ] **Step 3: Create NumberInputDemos.tsx**

```tsx
// apps/docs/src/demos/NumberInputDemos.tsx
import Enforma from 'enforma';
import { Preview } from '../components/Preview';

export function BasicDemo() {
  return (
    <Preview>
      <Enforma.NumberInput bind="price" label="Price" />
    </Preview>
  );
}

export function IntegerDemo() {
  return (
    <Preview>
      <Enforma.NumberInput
        bind="quantity"
        label="Quantity"
        decimalScale={0}
        thousandSeparator={false}
        allowNegative={false}
      />
    </Preview>
  );
}

export function PercentageDemo() {
  return (
    <Preview>
      <Enforma.NumberInput
        bind="rate"
        label="Rate (0–100%)"
        decimalScale={2}
        min={0}
        max={100}
        allowNegative={false}
      />
    </Preview>
  );
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
nvm use 20 && pnpm --filter docs exec vitest run src/demos/NumberInputDemos.test.tsx
```

- [ ] **Step 5: Update number-input.mdx**

Add after frontmatter: `import { BasicDemo, IntegerDemo, PercentageDemo } from '../../../demos/NumberInputDemos';`

Replace 3 placeholders.

- [ ] **Step 6: Lint, typecheck, commit**

```bash
nvm use 20 && pnpm lint && pnpm typecheck
git add apps/docs/src/demos/NumberInputDemos.tsx apps/docs/src/demos/NumberInputDemos.test.tsx apps/docs/src/content/docs/components/number-input.mdx
git commit -m "feat(docs): add NumberInput demos"
```

---

### Task 11: DateTimeDemos.tsx + date-time.mdx

**Files:**
- Create: `apps/docs/src/demos/DateTimeDemos.tsx`
- Create: `apps/docs/src/demos/DateTimeDemos.test.tsx`
- Modify: `apps/docs/src/content/docs/components/date-time.mdx`

3 placeholders: Usage → `BasicDemo`, Past-only → `PastOnlyDemo`, 24-hour → `TwentyFourHourDemo`.

`dayjs` was added in Task 1 and `Preview.tsx` already registers with `dateAdapter: 'dayjs'`.

- [ ] **Step 0: Add dateAdapter to Preview.tsx**

In `apps/docs/src/components/Preview.tsx`, update the `registerComponents` call to include `dateAdapter: 'dayjs'`:

```tsx
registerComponents(muiComponents as Partial<EnformaComponentRegistry>, {
  variant: 'outlined',
  dateAdapter: 'dayjs',
});
```

Then run the Preview tests to confirm they still pass:

```bash
nvm use 20 && pnpm --filter docs exec vitest run src/components/Preview.test.tsx
```

Expected: 4 passing (no new failures — the tests don't exercise date pickers).

> **Note:** MUI date pickers may throw in jsdom due to missing browser APIs (e.g., `ResizeObserver`). If tests fail with such an error, add this mock to `apps/docs/src/test/setup.ts` before retrying:
> ```ts
> global.ResizeObserver = class { observe() {}; unobserve() {}; disconnect() {}; };
> ```

- [ ] **Step 1: Write failing tests**

```tsx
// apps/docs/src/demos/DateTimeDemos.test.tsx
import { render, screen } from '@testing-library/react';
import { test, expect } from 'vitest';
import { BasicDemo, PastOnlyDemo, TwentyFourHourDemo } from './DateTimeDemos';

test('BasicDemo renders all three pickers', () => {
  render(<BasicDemo />);
  expect(screen.getByLabelText(/birthday/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/meeting time/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/deadline/i)).toBeInTheDocument();
});

test('PastOnlyDemo renders birthday date picker', () => {
  render(<PastOnlyDemo />);
  expect(screen.getByLabelText(/birthday/i)).toBeInTheDocument();
});

test('TwentyFourHourDemo renders start time picker', () => {
  render(<TwentyFourHourDemo />);
  expect(screen.getByLabelText(/start time/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run — expect fail**

```bash
nvm use 20 && pnpm --filter docs exec vitest run src/demos/DateTimeDemos.test.tsx
```

- [ ] **Step 3: Create DateTimeDemos.tsx**

```tsx
// apps/docs/src/demos/DateTimeDemos.tsx
import Enforma from 'enforma';
import { Preview } from '../components/Preview';

export function BasicDemo() {
  return (
    <Preview>
      <Enforma.DatePicker bind="birthday" label="Birthday" />
      <Enforma.TimePicker bind="meetingTime" label="Meeting time" ampm={false} />
      <Enforma.DateTimePicker bind="deadline" label="Deadline" />
    </Preview>
  );
}

export function PastOnlyDemo() {
  return (
    <Preview>
      <Enforma.DatePicker bind="birthday" label="Birthday" disableFuture />
    </Preview>
  );
}

export function TwentyFourHourDemo() {
  return (
    <Preview>
      <Enforma.TimePicker bind="startTime" label="Start time" ampm={false} />
    </Preview>
  );
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
nvm use 20 && pnpm --filter docs exec vitest run src/demos/DateTimeDemos.test.tsx
```

Apply the `ResizeObserver` mock to `setup.ts` if needed, then rerun.

- [ ] **Step 5: Update date-time.mdx**

Add after frontmatter: `import { BasicDemo, PastOnlyDemo, TwentyFourHourDemo } from '../../../demos/DateTimeDemos';`

Replace 3 placeholders.

- [ ] **Step 6: Lint, typecheck, commit**

```bash
nvm use 20 && pnpm lint && pnpm typecheck
git add apps/docs/src/components/Preview.tsx apps/docs/src/demos/DateTimeDemos.tsx apps/docs/src/demos/DateTimeDemos.test.tsx apps/docs/src/content/docs/components/date-time.mdx apps/docs/src/test/setup.ts
git commit -m "feat(docs): add Date & Time demos"
```

---

### Task 12: FieldsetDemos.tsx + fieldset.mdx

**Files:**
- Create: `apps/docs/src/demos/FieldsetDemos.tsx`
- Create: `apps/docs/src/demos/FieldsetDemos.test.tsx`
- Modify: `apps/docs/src/content/docs/components/fieldset.mdx`

3 placeholders: Usage → `BasicDemo`, Nested → `NestedDemo`, Conditional removed → `ConditionalDemo`.

- [ ] **Step 1: Write failing tests**

```tsx
// apps/docs/src/demos/FieldsetDemos.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { test, expect } from 'vitest';
import { BasicDemo, NestedDemo, ConditionalDemo } from './FieldsetDemos';

test('BasicDemo renders city and zip', () => {
  render(<BasicDemo />);
  expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/zip/i)).toBeInTheDocument();
});

test('NestedDemo renders city, line1, and line2', () => {
  render(<NestedDemo />);
  expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/street line 1/i)).toBeInTheDocument();
});

test('ConditionalDemo: billing fields hidden by default', () => {
  render(<ConditionalDemo />);
  expect(screen.queryByLabelText(/billing street/i)).not.toBeInTheDocument();
});

test('ConditionalDemo: billing fields appear when checkbox checked', async () => {
  const user = userEvent.setup();
  render(<ConditionalDemo />);
  await user.click(screen.getByLabelText(/different billing/i));
  expect(screen.getByLabelText(/billing street/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run — expect fail**

```bash
nvm use 20 && pnpm --filter docs exec vitest run src/demos/FieldsetDemos.test.tsx
```

- [ ] **Step 3: Create FieldsetDemos.tsx**

```tsx
// apps/docs/src/demos/FieldsetDemos.tsx
import Enforma from 'enforma';
import { Preview } from '../components/Preview';

export function BasicDemo() {
  return (
    <Preview>
      <Enforma.Fieldset bind="address" title="Address">
        <Enforma.TextInput bind="city" label="City" />
        <Enforma.TextInput bind="zip" label="ZIP code" />
      </Enforma.Fieldset>
    </Preview>
  );
}

export function NestedDemo() {
  return (
    <Preview>
      <Enforma.Fieldset bind="address" title="Address">
        <Enforma.TextInput bind="city" label="City" />
        <Enforma.Fieldset bind="street">
          <Enforma.TextInput bind="line1" label="Street line 1" />
          <Enforma.TextInput bind="line2" label="Street line 2" />
        </Enforma.Fieldset>
      </Enforma.Fieldset>
    </Preview>
  );
}

export function ConditionalDemo() {
  return (
    <Preview>
      <Enforma.Checkbox bind="hasBilling" label="Use a different billing address" />
      <Enforma.Fieldset bind="billing" removed={({ hasBilling }) => !hasBilling}>
        <Enforma.TextInput bind="street" label="Billing street" />
        <Enforma.TextInput bind="city" label="Billing city" />
      </Enforma.Fieldset>
    </Preview>
  );
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
nvm use 20 && pnpm --filter docs exec vitest run src/demos/FieldsetDemos.test.tsx
```

- [ ] **Step 5: Update fieldset.mdx**

Add after frontmatter: `import { BasicDemo, NestedDemo, ConditionalDemo } from '../../../demos/FieldsetDemos';`

Replace 3 placeholders.

- [ ] **Step 6: Lint, typecheck, commit**

```bash
nvm use 20 && pnpm lint && pnpm typecheck
git add apps/docs/src/demos/FieldsetDemos.tsx apps/docs/src/demos/FieldsetDemos.test.tsx apps/docs/src/content/docs/components/fieldset.mdx
git commit -m "feat(docs): add Fieldset demos"
```

---

### Task 13: ListDemos.tsx + list.mdx

**Files:**
- Create: `apps/docs/src/demos/ListDemos.tsx`
- Create: `apps/docs/src/demos/ListDemos.test.tsx`
- Modify: `apps/docs/src/content/docs/components/list.mdx`

2 placeholders: Usage → `BasicDemo`, With min/max → `MinMaxDemo`.

- [ ] **Step 1: Write failing tests**

```tsx
// apps/docs/src/demos/ListDemos.test.tsx
import { render, screen } from '@testing-library/react';
import { test, expect } from 'vitest';
import { BasicDemo, MinMaxDemo } from './ListDemos';

test('BasicDemo renders an Add button', () => {
  render(<BasicDemo />);
  expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
});

test('MinMaxDemo renders an Add button', () => {
  render(<MinMaxDemo />);
  expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run — expect fail**

```bash
nvm use 20 && pnpm --filter docs exec vitest run src/demos/ListDemos.test.tsx
```

- [ ] **Step 3: Create ListDemos.tsx**

```tsx
// apps/docs/src/demos/ListDemos.tsx
import Enforma from 'enforma';
import { Preview } from '../components/Preview';

export function BasicDemo() {
  return (
    <Preview>
      <Enforma.List bind="members" defaultItem={{ name: '' }}>
        <Enforma.List.Item title="name" showDeleteButton />
        <Enforma.List.Form showDeleteButton>
          <Enforma.TextInput bind="name" label="Name" />
        </Enforma.List.Form>
      </Enforma.List>
    </Preview>
  );
}

export function MinMaxDemo() {
  return (
    <Preview>
      <Enforma.List bind="tags" defaultItem={{ tag: '' }} minItems={1} maxItems={3}>
        <Enforma.List.Item title="tag" showDeleteButton />
        <Enforma.List.Form showDeleteButton>
          <Enforma.TextInput bind="tag" label="Tag" required />
        </Enforma.List.Form>
      </Enforma.List>
    </Preview>
  );
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
nvm use 20 && pnpm --filter docs exec vitest run src/demos/ListDemos.test.tsx
```

- [ ] **Step 5: Update list.mdx**

Add after frontmatter: `import { BasicDemo, MinMaxDemo } from '../../../demos/ListDemos';`

Replace 2 placeholders.

- [ ] **Step 6: Lint, typecheck, commit**

```bash
nvm use 20 && pnpm lint && pnpm typecheck
git add apps/docs/src/demos/ListDemos.tsx apps/docs/src/demos/ListDemos.test.tsx apps/docs/src/content/docs/components/list.mdx
git commit -m "feat(docs): add List demos"
```

---

### Task 14: CalculatedDemos.tsx + calculated.mdx

**Files:**
- Create: `apps/docs/src/demos/CalculatedDemos.tsx`
- Create: `apps/docs/src/demos/CalculatedDemos.test.tsx`
- Modify: `apps/docs/src/content/docs/components/calculated.mdx`

2 placeholders: Usage → `BasicDemo`, Reactive description → `ReactiveDescriptionDemo`.

- [ ] **Step 1: Write failing tests**

```tsx
// apps/docs/src/demos/CalculatedDemos.test.tsx
import { render, screen } from '@testing-library/react';
import { test, expect } from 'vitest';
import { BasicDemo, ReactiveDescriptionDemo } from './CalculatedDemos';

test('BasicDemo renders Q1, Q2 and Total', () => {
  render(<BasicDemo />);
  expect(screen.getByLabelText(/^q1/i)).toBeInTheDocument();
  expect(screen.getAllByLabelText(/total/i).length).toBeGreaterThan(0);
});

test('ReactiveDescriptionDemo renders Q1 and Total score', () => {
  render(<ReactiveDescriptionDemo />);
  expect(screen.getByLabelText(/^q1/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/total score/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run — expect fail**

```bash
nvm use 20 && pnpm --filter docs exec vitest run src/demos/CalculatedDemos.test.tsx
```

- [ ] **Step 3: Create CalculatedDemos.tsx**

```tsx
// apps/docs/src/demos/CalculatedDemos.tsx
import Enforma from 'enforma';
import { Preview } from '../components/Preview';

export function BasicDemo() {
  return (
    <Preview>
      <Enforma.NumberInput bind="q1" label="Q1" decimalScale={0} />
      <Enforma.NumberInput bind="q2" label="Q2" decimalScale={0} />
      <Enforma.Calculated<number>
        value={(v) => ((v.q1 as number) ?? 0) + ((v.q2 as number) ?? 0)}
        label="Total"
      />
      <Enforma.Calculated<number>
        bind="total"
        value={(v) => ((v.q1 as number) ?? 0) + ((v.q2 as number) ?? 0)}
        label="Total (stored)"
      />
    </Preview>
  );
}

export function ReactiveDescriptionDemo() {
  return (
    <Preview>
      <Enforma.NumberInput bind="q1" label="Q1" decimalScale={0} min={0} max={3} />
      <Enforma.NumberInput bind="q2" label="Q2" decimalScale={0} min={0} max={3} />
      <Enforma.NumberInput bind="q3" label="Q3" decimalScale={0} min={0} max={3} />
      <Enforma.Calculated<number>
        bind="score"
        value={(v) => ['q1', 'q2', 'q3'].reduce((sum, k) => sum + ((v[k] as number) ?? 0), 0)}
        label="Total score"
        description={(v) => {
          const score = (v.score as number) ?? 0;
          if (score <= 4) return 'Minimal';
          if (score <= 9) return 'Mild';
          return 'Severe';
        }}
      />
    </Preview>
  );
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
nvm use 20 && pnpm --filter docs exec vitest run src/demos/CalculatedDemos.test.tsx
```

- [ ] **Step 5: Update calculated.mdx**

Add after frontmatter: `import { BasicDemo, ReactiveDescriptionDemo } from '../../../demos/CalculatedDemos';`

Replace 2 placeholders.

- [ ] **Step 6: Lint, typecheck, commit**

```bash
nvm use 20 && pnpm lint && pnpm typecheck
git add apps/docs/src/demos/CalculatedDemos.tsx apps/docs/src/demos/CalculatedDemos.test.tsx apps/docs/src/content/docs/components/calculated.mdx
git commit -m "feat(docs): add Calculated demos"
```

---

### Task 15: OutputDemos.tsx + output.mdx

**Files:**
- Create: `apps/docs/src/demos/OutputDemos.tsx`
- Create: `apps/docs/src/demos/OutputDemos.test.tsx`
- Modify: `apps/docs/src/content/docs/components/output.mdx`

2 placeholders: Usage → `BasicDemo`, Static instruction → `StaticDemo`.

- [ ] **Step 1: Write failing tests**

```tsx
// apps/docs/src/demos/OutputDemos.test.tsx
import { render, screen } from '@testing-library/react';
import { test, expect } from 'vitest';
import { BasicDemo, StaticDemo } from './OutputDemos';

test('BasicDemo renders greeting and name input', () => {
  render(<BasicDemo />);
  expect(screen.getByText(/stranger/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
});

test('StaticDemo renders instruction text', () => {
  render(<StaticDemo />);
  expect(screen.getByText(/all fields marked with/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run — expect fail**

```bash
nvm use 20 && pnpm --filter docs exec vitest run src/demos/OutputDemos.test.tsx
```

- [ ] **Step 3: Create OutputDemos.tsx**

```tsx
// apps/docs/src/demos/OutputDemos.tsx
import Enforma from 'enforma';
import { Preview } from '../components/Preview';

export function BasicDemo() {
  return (
    <Preview>
      <h3>
        Hello,{' '}
        <Enforma.Output as="span" value={({ name }) => String(name) || 'stranger'} />
      </h3>
      <Enforma.TextInput bind="name" label="Name" />
    </Preview>
  );
}

export function StaticDemo() {
  return (
    <Preview>
      <Enforma.Output value="All fields marked with * are required." />
      <Enforma.TextInput bind="name" label="Name" required />
    </Preview>
  );
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
nvm use 20 && pnpm --filter docs exec vitest run src/demos/OutputDemos.test.tsx
```

- [ ] **Step 5: Update output.mdx**

Add after frontmatter: `import { BasicDemo, StaticDemo } from '../../../demos/OutputDemos';`

Replace 2 placeholders.

- [ ] **Step 6: Lint, typecheck, commit**

```bash
nvm use 20 && pnpm lint && pnpm typecheck
git add apps/docs/src/demos/OutputDemos.tsx apps/docs/src/demos/OutputDemos.test.tsx apps/docs/src/content/docs/components/output.mdx
git commit -m "feat(docs): add Output demos"
```

---

### Task 16: ScopeDemos.tsx + scope.mdx

**Files:**
- Create: `apps/docs/src/demos/ScopeDemos.tsx`
- Create: `apps/docs/src/demos/ScopeDemos.test.tsx`
- Modify: `apps/docs/src/content/docs/components/scope.mdx`

2 placeholders: Usage → `BasicDemo`, Nested address → `NestedAddressDemo`.

- [ ] **Step 1: Write failing tests**

```tsx
// apps/docs/src/demos/ScopeDemos.test.tsx
import { render, screen } from '@testing-library/react';
import { test, expect } from 'vitest';
import { BasicDemo, NestedAddressDemo } from './ScopeDemos';

test('BasicDemo renders city and zip', () => {
  render(<BasicDemo />);
  expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/^zip/i)).toBeInTheDocument();
});

test('NestedAddressDemo renders street, city, zip', () => {
  render(<NestedAddressDemo />);
  expect(screen.getByLabelText(/street/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/^zip/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run — expect fail**

```bash
nvm use 20 && pnpm --filter docs exec vitest run src/demos/ScopeDemos.test.tsx
```

- [ ] **Step 3: Create ScopeDemos.tsx**

```tsx
// apps/docs/src/demos/ScopeDemos.tsx
import Enforma from 'enforma';
import { Preview } from '../components/Preview';

export function BasicDemo() {
  return (
    <Preview>
      <Enforma.Scope bind="address">
        <Enforma.TextInput bind="city" label="City" />
        <Enforma.TextInput bind="zip" label="ZIP" />
      </Enforma.Scope>
    </Preview>
  );
}

export function NestedAddressDemo() {
  return (
    <Preview>
      <Enforma.Scope bind="address">
        <Enforma.TextInput bind="street" label="Street" />
        <Enforma.TextInput bind="city" label="City" />
        <Enforma.TextInput bind="zip" label="ZIP" />
      </Enforma.Scope>
    </Preview>
  );
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
nvm use 20 && pnpm --filter docs exec vitest run src/demos/ScopeDemos.test.tsx
```

- [ ] **Step 5: Update scope.mdx**

Add after frontmatter: `import { BasicDemo, NestedAddressDemo } from '../../../demos/ScopeDemos';`

Replace 2 placeholders.

- [ ] **Step 6: Run full suite, lint, typecheck, commit**

```bash
nvm use 20 && pnpm test && pnpm lint && pnpm typecheck
git add apps/docs/src/demos/ScopeDemos.tsx apps/docs/src/demos/ScopeDemos.test.tsx apps/docs/src/content/docs/components/scope.mdx
git commit -m "feat(docs): add Scope demos"
```
