# Date/Time Pickers Design

**Date:** 2026-03-03
**Scope:** Bundle API refactor + DatePicker, TimePicker, DateTimePicker field types

---

## Goals

- Add `DatePicker`, `TimePicker`, and `DateTimePicker` field types to enforma
- Simplify the enforma-mui bundle API: single import, options-based configuration
- Keep `@mui/x-date-pickers` as an optional lazy-loaded peer dependency

---

## 1. Bundle API Refactor

### Before

```ts
import { classic } from 'enforma-mui';
registerComponents(classic);
```

### After

```ts
import muiComponents from 'enforma-mui';
registerComponents(muiComponents, { variant: 'classic', dateAdapter: 'dayjs' });
```

### Changes

**`registerComponents(components, options?)`** gains an optional second argument stored in the registry alongside components. A new `useRegistryOptions()` hook exposes them to internal components.

**`options` type:**

```ts
type RegisterOptions = {
  variant?: 'classic' | 'outlined' | 'standard'; // default: 'outlined'
  dateAdapter?: 'dayjs' | 'date-fns' | 'luxon' | 'moment';
};
```

**`FormWrap`** becomes a single `MuiFormWrap` component replacing the three existing providers (`ClassicProvider`, `OutlinedProvider`, `StandardProvider`). It reads `variant` from registry options to set `MuiVariantContext`, and conditionally wraps children in `<LocalizationProvider>` if `dateAdapter` is set.

The date adapter is lazy-loaded by an internal map:

```ts
const adapterMap = {
  dayjs:      () => import('@mui/x-date-pickers/AdapterDayjs'),
  'date-fns': () => import('@mui/x-date-pickers/AdapterDateFns'),
  luxon:      () => import('@mui/x-date-pickers/AdapterLuxon'),
  moment:     () => import('@mui/x-date-pickers/AdapterMoment'),
};
```

**`enforma-mui` default export:** a single bundle object containing all components, with `FormWrap: MuiFormWrap`.

The named exports `classic`, `outlined`, `standard` are removed.

---

## 2. Core Field Types (enforma)

### Value types

| Field | Valid | Intermediate (partial/invalid) | Empty |
|-------|-------|-------------------------------|-------|
| `DatePicker` | `Date` | `string` | `undefined` |
| `TimePicker` | `string` (`"HH:mm"`) | `string` (partial) | `undefined` |
| `DateTimePicker` | `Date` | `string` | `undefined` |

`TimePicker` never stores a `Date` — `"HH:mm"` strings are the canonical valid representation, matching `<input type="time">` and REST API conventions.

### Type validators

Each dispatch function registers a `typeValidator`:

- `DatePicker`: returns `'invalidDate'` if value is a non-Date string
- `TimePicker`: returns `'invalidTime'` if value doesn't match `/^\d{2}:\d{2}$/`
- `DateTimePicker`: returns `'invalidDateTime'` if value is a non-Date string

All three return `null` for `undefined` (empty is not a type error).

### Props

```ts
type DatePickerProps = CommonProps & {
  minDate?: Reactive<Date>;
  maxDate?: Reactive<Date>;
  disableFuture?: Reactive<boolean>;
  disablePast?: Reactive<boolean>;
};

type TimePickerProps = CommonProps & {
  minTime?: Reactive<Date>;
  maxTime?: Reactive<Date>;
  ampm?: Reactive<boolean>;
};

type DateTimePickerProps = DatePickerProps & Pick<TimePickerProps, 'ampm'>;
```

Resolved types follow the same pattern as `ResolvedNumberInputProps`. All three added to `ComponentPropsMap` and `EnformaComponentRegistry`.

---

## 3. MUI Adapter

### Lazy loading

All three pickers use the same Suspense/skeleton pattern as `NumberInput`: `lazy(() => import('@mui/x-date-pickers/...'))` with a disabled `TextField` skeleton shown while loading. A missing `@mui/x-date-pickers` package throws a helpful error message.

### Intermediate state capture

MUI's `DatePicker` fires `onChange(Date | null)` — it does not expose raw text when the date is invalid. The adapter captures partial input via `slotProps.textField.onChange`:

```tsx
// Local state in the adapter
const [rawInput, setRawInput] = useState('');

slotProps={{
  textField: {
    onChange: (e) => setRawInput(e.target.value),
  }
}}
```

On the picker's `onChange(date)`:
- Valid `Date` → `setValue(date)`
- `null` + `rawInput` empty → `setValue(undefined)`
- `null` + `rawInput` non-empty → `setValue(rawInput)`

No `displayValue` local state is needed — MUI manages the display string internally.

### TimePicker conversion

MUI `TimePicker` fires `onChange` with a `Date` object (time parts only). The adapter converts:
- Valid `Date` → `setValue(formatTime(date))` where `formatTime` extracts `"HH:mm"` using the date adapter's utilities
- `null` + rawInput empty → `setValue(undefined)`
- `null` + rawInput non-empty → `setValue(rawInput)`

### LocalizationProvider

Provided by `MuiFormWrap` when `dateAdapter` option is set. The picker adapters do not render their own `LocalizationProvider`.

---

## 4. Testing

### Bundle API refactor (enforma-mui)

- `registerComponents(muiComponents, { variant: 'outlined' })` renders with correct MUI variant
- `registerComponents(muiComponents, { variant: 'classic' })` renders classic layout
- `dateAdapter: 'dayjs'` causes `LocalizationProvider` to be rendered in the tree

### Core field types (enforma)

- `DatePicker` `typeValidator` returns `'invalidDate'` for strings, `null` for `Date` and `undefined`
- `TimePicker` `typeValidator` returns `'invalidTime'` for non-`"HH:mm"` strings, `null` for valid and `undefined`
- `DateTimePicker` `typeValidator` returns `'invalidDateTime'` for strings, `null` for `Date` and `undefined`
- `isValid: false` in `onChange` when value is a string

### MUI adapters (mocked `@mui/x-date-pickers`)

- Renders an input
- Fires `onChange` with a `Date` when picker resolves a valid date
- Fires `onChange` with `undefined` when cleared
- Fires `onChange` with a `string` when partial text entered (invalid state)
- `TimePicker` fires `onChange` with `"HH:mm"` string when valid
- Shows `validate()` error after blur
- Reveals all errors on submit
- Missing `@mui/x-date-pickers` throws a helpful error
