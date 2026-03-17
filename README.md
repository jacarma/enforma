# Enforma

**Healthy forms for React.** Write only your business logic — enforma handles the rest.

## Why Enforma

**Only write what's yours.** No state management, no touched/error tracking, no blur handlers. Declare your fields, validations, and submit logic — enforma handles the plumbing.

**Obvious markup.** A single `<TextInput>` renders the wrapper, label, input, error message, description, and aria — exactly as your UI library expects.

**Your form logic doesn't change when your UI does.** Switch to a different component library later — your form code is untouched.

## Example

```tsx
import Enforma, { registerComponents } from 'enforma';
import muiComponents from 'enforma-mui';

registerComponents(muiComponents);

export function CheckoutForm() {
  return (
    <Enforma.Form
      onSubmit={(values) => fetch('/api/order', { method: 'POST', body: JSON.stringify(values) })}
    >
      <Enforma.Select bind="method" label="Delivery method">
        <Enforma.Select.Option value="delivery" label="Delivery" />
        <Enforma.Select.Option value="pickup" label="Pickup in store" />
      </Enforma.Select>
      <Enforma.TextInput
        bind="address"
        label="Delivery address"
        disabled={({ method }) => method !== 'delivery'}
        validate={(value, { method }) =>
          method === 'delivery' && !value ? 'Address is required' : null
        }
      />
      <button type="submit">Place order</button>
    </Enforma.Form>
  );
}
```

[See the same form in plain React (75 lines)](docs/plain-react-comparison.md)

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

### Advanced

**Publishing an adapter** — For component library authors: wrap your library once and let your users plug it into enforma with a single call. [Adapter authoring guide →](docs/adapting.md)

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
