# enforma-mui

Material UI adapter for [enforma](https://www.npmjs.com/package/enforma).

## Installation

```bash
npm install enforma enforma-mui @mui/material @emotion/react @emotion/styled
```

Requires React 18+.

## Setup

Register the adapter once before rendering any forms, typically in your app entry point:

```tsx
import { registerComponents } from 'enforma';
import muiComponents from 'enforma-mui';

registerComponents(muiComponents);
```

Then use enforma components as normal — they will render as MUI fields:

```tsx
import Enforma from 'enforma';

export function MyForm() {
  return (
    <Enforma.Form values={{}} onSubmit={handleSubmit}>
      <Enforma.TextInput bind="name" label="Name" />
      <Enforma.TextInput bind="email" label="Email" />
      <Enforma.Submit>Submit</Enforma.Submit>
    </Enforma.Form>
  );
}
```

## Variants

Pass a `variant` option to `registerComponents` to set the visual style:

```tsx
import { registerComponents } from 'enforma';
import muiComponents from 'enforma-mui';

registerComponents(muiComponents, { variant: 'outlined' });
// variant: 'classic' | 'outlined' | 'standard'
```

| Variant | Description |
|---------|-------------|
| `classic` | Compact fields with labels above inputs |
| `outlined` | Standard MUI outlined text fields |
| `standard` | Minimal underline-style text fields |

## Masked inputs

Masked inputs are supported via `react-imask`. Install the optional dependencies:

```bash
npm install react-imask imask
```

Then pass a `mask` prop to any `TextInput`:

```tsx
<Enforma.TextInput bind="phone" label="Phone" mask="+1 (000) 000-0000" />
<Enforma.TextInput bind="dob" label="Date of birth" mask="DD/MM/YYYY" />
```

If `react-imask` is not installed and a `mask` prop is used, enforma-mui throws at runtime with installation instructions.

## Date / time pickers

Date, time, and datetime pickers require `@mui/x-date-pickers` and a date library:

```bash
npm install @mui/x-date-pickers dayjs
# or: date-fns, luxon, moment
```

## Exports

Default export (`muiComponents`) is the full component registry. Named exports provide individual components for advanced use:

`Output`, `Calculated`, `TextInput`, `Textarea`, `Checkbox`, `Switch`, `NumberInput`, `DatePicker`, `TimePicker`, `DateTimePicker`, `Fieldset`, `Select`, `SelectOption`, `RadioGroup`, `RadioGroupOption`, `Autocomplete`, `AutocompleteOption`, `ExclusiveToggle`, `ExclusiveToggleOption`, `List`, `ListItem`, `AddButton`, `FormModal`, `MuiFormWrap`, `Submit`

Type export: `MuiVariant` (`'classic' | 'outlined' | 'standard'`)

## Peer dependencies

| Package | Required |
|---------|----------|
| `react` >= 18 | Yes |
| `react-dom` >= 18 | Yes |
| `@mui/material` >= 6 | Yes |
| `@emotion/react` >= 11 | Yes |
| `@emotion/styled` >= 11 | Yes |
| `@mui/x-date-pickers` >= 7 | Only for date/time pickers |
| `react-imask` >= 7 | Only for masked inputs |
| `imask` >= 7 | Only for masked inputs |

## CJS usage

When using CommonJS `require`, access the default export via `.default`:

```js
const { default: muiComponents, TextInput } = require('enforma-mui');
```

## License

MIT
