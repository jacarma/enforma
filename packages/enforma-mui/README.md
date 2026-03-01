# enforma-mui

Material UI adapter for [enforma](../../README.md).

## Installation

```bash
npm install enforma-mui @mui/material @emotion/react @emotion/styled
```

Requires React 18+ and enforma.

## Usage

Register the adapter once before rendering any forms, typically in your app's entry point:

```tsx
import { registerComponents } from "enforma";
import { outlined } from "enforma-mui";

registerComponents(outlined);
```

Then use enforma components as normal — they will render as MUI fields:

```tsx
import Enforma from "enforma";

export function MyForm() {
  return (
    <Enforma.Form values={{}} onSubmit={handleSubmit}>
      <Enforma.TextInput bind="name" label="Name" />
      <Enforma.TextInput bind="email" label="Email" />
      <button type="submit">Submit</button>
    </Enforma.Form>
  );
}
```

## Variants

Three visual variants are available:

| Variant | Description |
|---------|-------------|
| `classic` | Compact fields with separate labels above inputs |
| `outlined` | Standard MUI outlined text fields |
| `standard` | Minimal underline-style text fields |

```tsx
import { classic, outlined, standard } from "enforma-mui";

registerComponents(classic);   // or outlined, or standard
```

## Masked input

Masked inputs are supported via `react-imask`. Install the optional dependencies:

```bash
npm install react-imask imask
```

Then pass a `mask` prop to any `TextInput`:

```tsx
<Enforma.TextInput bind="phone" label="Phone" mask="+1 (000) 000-0000" />
<Enforma.TextInput bind="dob" label="Date of birth" mask="DD/MM/YYYY" />
```

If `react-imask` is not installed and a `mask` prop is used, enforma-mui will throw an error at runtime with installation instructions.

## Peer dependencies

| Package | Required |
|---------|----------|
| `react` >= 18 | Yes |
| `react-dom` >= 18 | Yes |
| `@mui/material` >= 6 | Yes |
| `@emotion/react` >= 11 | Yes |
| `@emotion/styled` >= 11 | Yes |
| `react-imask` >= 7 | Only for masked inputs |
| `imask` >= 7 | Only for masked inputs |
