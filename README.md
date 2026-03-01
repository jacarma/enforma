# Enforma

**Healthy forms for React.** Write only your business logic — enforma handles the rest.

## Why Enforma

**Only write what's yours.** No state management, no touched/error tracking, no blur handlers. Declare your fields, validations, and submit logic — enforma handles the plumbing.

**Your form logic doesn't change when your UI does.** Enforma is a facade over your component library. Swap MUI for shadcn, or build your own components — your form code is untouched.

## Example

```tsx
import Enforma from 'enforma';

export function ContactForm() {
  return (
    <Enforma.Form
      values={{}}
      onSubmit={(values) => fetch('/api/contact', { method: 'POST', body: JSON.stringify(values) })}
    >
      <Enforma.TextInput
        bind="name"
        label="Name"
        validate={(value) => (!value ? 'Name is required' : null)}
      />
      <Enforma.TextInput
        bind="email"
        label="Email"
        placeholder={({ name }) => (name ? `Email for ${name}` : 'Enter your name first')}
        disabled={({ name }) => !name}
        validate={(value) => {
          if (!value) return 'Email is required';
          if (!value.includes('@')) return 'Invalid email';
          return null;
        }}
      />
      <button type="submit">Send</button>
    </Enforma.Form>
  );
}
```

[See the same form in plain React (96 lines)](docs/plain-react-comparison.md)

## Installation

```bash
# Core
npm install enforma

# With Material UI
npm install enforma-mui @mui/material @emotion/react @emotion/styled
```

Requires React 18+.

## Features

- **High performance** — each field re-renders only when its own value changes, not when siblings update (powered by `useSyncExternalStore`)
- **Minimal boilerplate** — only write your business logic, enforma handles the rest
- **UI library agnostic** — swap your component library without touching form logic
- **Reactive attributes** — `disabled`, `label`, `placeholder` accept static values or functions that respond to form state
- **Cross-field validation** — validators have access to the entire form state
- **Hierarchical scopes** — nest sections with automatic path prefixing
- **Dynamic lists** — field arrays with proper indexing
- **Validation timing** — show errors on blur, on submit, or always

## Extending Enforma

**Adding custom fields** — Use `useFieldProps` and `useListState` to build your own components that integrate with the form store. [Custom components guide →](docs/custom-components.md)

**Building an adapter** — Wrap any component library once and reuse it across all your forms. [Adapter authoring guide →](docs/adapting.md)

## Packages

| Package                               | Description         |
| ------------------------------------- | ------------------- |
| [`enforma`](packages/enforma)         | Core library        |
| [`enforma-mui`](packages/enforma-mui) | Material UI adapter |

## Development

```bash
pnpm dev      # Run the demo app
pnpm test     # Run all tests
pnpm lint     # Run ESLint
pnpm build    # Build the library
```

Requires Node.js >= 20 and pnpm >= 9.

## Contributing

PRs must pass lint and tests before merging.

## License

MIT
