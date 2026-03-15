# enforma

**Healthy forms for React.** Write only your business logic — enforma handles the rest.

## Why Enforma

**Only write what's yours.** No state management, no touched/error tracking, no blur handlers. Declare your fields, validations, and submit logic — enforma handles the plumbing.

**Your form logic doesn't change when your UI does.** Enforma is a facade over your component library. Swap MUI for shadcn, or build your own components — your form code is untouched.

## Installation

```bash
npm install enforma
```

Requires React 18+. Enforma has no UI of its own — you need a component adapter to render fields. See [enforma-mui](https://www.npmjs.com/package/enforma-mui) for the Material UI adapter.

## Setup

Register a component adapter once before rendering any forms, typically in your app entry point:

```tsx
import { registerComponents } from 'enforma';
import muiComponents from 'enforma-mui';

registerComponents(muiComponents, { variant: 'outlined' });
```

## Usage

```tsx
import Enforma from 'enforma';

export function CheckoutForm() {
  return (
    <Enforma.Form
      values={{}}
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
      <Enforma.Submit>Place order</Enforma.Submit>
    </Enforma.Form>
  );
}
```

## Features

- **High performance** — each field re-renders only when its own value changes (powered by `useSyncExternalStore`)
- **Reactive attributes** — `disabled`, `label`, `placeholder` accept static values or functions that respond to form state
- **Cross-field validation** — validators receive the full form state
- **Hierarchical scopes** — nest sections with automatic path prefixing via `Enforma.Scope`
- **Dynamic lists** — field arrays with `Enforma.List`
- **UI library agnostic** — swap your component library without touching form logic

## Custom components

Use `useFieldProps` to build components that integrate with the form store:

```tsx
import { useFieldProps } from 'enforma';

function MyInput({ bind, label }: { bind: string; label: string }) {
  const { value, setValue, error } = useFieldProps({ bind, label });
  return <input value={value} onChange={(e) => setValue(e.target.value)} />;
}
```

## CJS usage

When using CommonJS `require`, access the default export via `.default`:

```js
const { default: Enforma, registerComponents } = require('enforma');
```

## License

MIT
