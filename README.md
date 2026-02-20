# Enforma

**Healthy forms for React.** A modern, type-safe form management library built on React 18's `useSyncExternalStore` for fine-grained reactivity and minimal re-renders.

## Philosophy

Enforma is designed with a single core principle: **forms should be simple to reason about, type-safe, and performant**.

Rather than spread form state across scattered hooks and context, Enforma centralizes everything in a plain JavaScript object store that lives outside React. Components subscribe to specific pieces of state and re-render **only when their bound data changes**—not when unrelated fields are touched.

This architecture enables:

- **Granular re-renders** — Each field re-renders only when its value changes, not when siblings update
- **Type safety** — Full TypeScript support from form definition to validation
- **Minimal boilerplate** — Reactive fields, cross-field validation, and dynamic props without extra wiring
- **Hierarchical and list support** — Scope nesting and dynamic field arrays built in from the ground up
- **Framework-agnostic validation** — Plug in your own validation logic or use reactive validators that respond to form state changes

## Key Features

- ✅ **useSyncExternalStore-powered** — Fine-grained subscriptions eliminate unnecessary re-renders
- ✅ **Reactive attributes** — `disabled`, `label`, `placeholder` can be static values or functions that respond to form state
- ✅ **Cross-field validation** — Validators have access to the entire form state
- ✅ **Hierarchical scopes** — Nest forms and sections with automatic path prefixing
- ✅ **List/array support** — Dynamic field arrays with proper indexing
- ✅ **Validation timing control** — Show errors on blur, on submit, or always
- ✅ **TypeScript strict mode** — Built with `strict: true` and `noUncheckedIndexedAccess`

## Why Enforma?

### The Simplicity Difference

Consider a simple form with one text input that has a label, description, and custom validation. Here's how much code you'd write:

**Standard React** (~80 lines):

```tsx
import { useState, useCallback } from "react";

export function MyForm() {
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = useCallback((value: string) => {
    if (!value) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return "Please enter a valid email";
    }
    if (!value.includes("company.com")) {
      return "Must be a company email";
    }
    return null;
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (touched) {
      setError(validate(value));
    }
  };

  const handleBlur = () => {
    setTouched(true);
    setError(validate(email));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate(email);
    if (err) {
      setError(err);
      setTouched(true);
      return;
    }
    setIsSubmitting(true);
    try {
      await fetch("/api/subscribe", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="email">Email</label>
      <p className="description">We'll only use this to send updates.</p>
      <input
        id="email"
        type="email"
        value={email}
        onChange={handleChange}
        onBlur={handleBlur}
        aria-invalid={touched && error ? "true" : "false"}
      />
      {touched && error && <p className="error">{error}</p>}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Subscribing..." : "Subscribe"}
      </button>
    </form>
  );
}
```

**Enforma** (~15 lines):

```tsx
import Enforma from "enforma";

export function MyForm() {
  return (
    <Enforma.Form
      values={{ email: "" }}
      onSubmit={(values) =>
        fetch("/api/subscribe", {
          method: "POST",
          body: JSON.stringify(values),
        })
      }
      showErrors={true}
    >
      <Enforma.TextInput
        bind="email"
        label="Email"
        description="We'll only use this to send updates."
        validate={(value) => {
          if (!value) return "Email is required";
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
            return "Please enter a valid email";
          if (!value.includes("company.com")) return "Must be a company email";
          return null;
        }}
      />
      <button type="submit">Subscribe</button>
    </Enforma.Form>
  );
}
```

That's **~5x less boilerplate**. No manual state management, no touched/error tracking, no blur handlers—just declare what you want.

## Getting Started

### Installation

```bash
npm install enforma
# or
pnpm add enforma
```

### Basic Usage

```tsx
import Enforma from "enforma";

export function MyForm() {
  return (
    <Enforma.Form
      values={{ name: "", email: "" }}
      onChange={(values) => console.log(values)}
      onSubmit={(values) => {
        // Handle form submission
        console.log("Submitted:", values);
      }}
    >
      <Enforma.TextInput bind="name" label="Full Name" />
      <Enforma.TextInput bind="email" label="Email" />
      <button type="submit">Submit</button>
    </Enforma.Form>
  );
}
```

### Reactive Props

Props like `disabled`, `label`, and `placeholder` can be dynamic functions:

```tsx
<Enforma.TextInput
  bind="email"
  label="Email"
  disabled={(scopeValues, allValues) => allValues.name === ""}
  placeholder={(scopeValues, allValues) =>
    allValues.name
      ? `Email for ${allValues.name}`
      : "Please enter your name first"
  }
/>
```

### Validation

```tsx
<Enforma.Form
  values={{ email: "" }}
  onChange={(values, state) => {
    console.log("Valid:", state.isValid);
    console.log("Errors:", state.errors);
  }}
  showErrors={true}
  messages={{
    email_required: "Email is required",
    email_invalid: "Please enter a valid email",
  }}
>
  <Enforma.TextInput
    bind="email"
    label="Email"
    validate={(value, allValues) => {
      if (!value) return "email_required";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "email_invalid";
      return null;
    }}
  />
</Enforma.Form>
```

### Hierarchical Scopes

Group related fields with `Scope`:

```tsx
<Enforma.Form values={{ user: { name: '', email: '' }, billing: { ... } }}>
  <Enforma.Scope prefix="user">
    <Enforma.TextInput bind="name" label="Name" />
    <Enforma.TextInput bind="email" label="Email" />
  </Enforma.Scope>

  <Enforma.Scope prefix="billing">
    <Enforma.TextInput bind="address" label="Address" />
  </Enforma.Scope>
</Enforma.Form>
```

### Dynamic Lists

Use `List` for arrays of items:

```tsx
<Enforma.Form
  values={{ items: [{ name: "" }, { name: "" }] }}
  onChange={handleChange}
>
  <Enforma.List bind="items">
    {(item, index) => (
      <Enforma.Scope prefix={String(index)} key={index}>
        <Enforma.TextInput bind="name" label={`Item ${index + 1} Name`} />
      </Enforma.Scope>
    )}
  </Enforma.List>
</Enforma.Form>
```

## Architecture

### Form Store

The `FormStore` is a plain JavaScript object that holds:

- Form values
- Validation state (touched fields, submission status)
- Error messages
- Validator registry

Components subscribe to specific fields via `useSyncExternalStore`, so only affected components re-render.

### Context Stack

- **FormContext** — Provides access to the store and submission state
- **ScopeContext** — Manages hierarchical path prefixing
- **FormSettingsContext** — Distributes validation settings (show errors, messages) without prop-drilling

## Component Library

A set of pre-built, accessible form components is coming soon. In the meantime, you can build custom components using the `useFieldValidation` and reactive prop hooks provided by Enforma.

## Development

This monorepo contains:

- **`packages/enforma`** — The core library (Vite, TypeScript strict, Vitest)
- **`apps/demo`** — Development playground and examples

### Scripts

```bash
pnpm dev          # Run the demo app
pnpm test         # Run all tests
pnpm test:watch   # Run tests in watch mode
pnpm lint         # Run ESLint
pnpm build        # Build the library
pnpm coverage     # Generate test coverage
```

### Requirements

- **Node.js** >= 20
- **pnpm** >= 9

## Contributing

This project uses strict TypeScript and ESLint. All tests must pass before committing:

```bash
pnpm lint   # No errors or warnings
pnpm test   # All tests pass
```

## License

MIT
