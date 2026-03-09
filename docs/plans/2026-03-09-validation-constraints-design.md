# Validation Constraints — Design

Date: 2026-03-09

## Overview

Add built-in constraint props to field components: `required`, `minLength`/`maxLength` for text fields, and `minItems`/`maxItems` for `List`. Consistent with the existing `min`/`max` pattern on `NumberInput` — constraints are props, not standalone validator helpers.

## New Props

### `CommonProps` (all field components)

```ts
required?: Reactive<boolean>
```

### `TextInputProps` and `TextareaProps`

```ts
minLength?: Reactive<number>
maxLength?: Reactive<number>
```

### `ListProps`

```ts
minItems?: Reactive<number>
maxItems?: Reactive<number>
```

All constraint props are `Reactive<T>`. They flow to resolved props so adapters can use them for UI enhancements beyond validation (asterisks on labels, character counters, disabling "Add" at `maxItems`).

## Usage

```tsx
<TextInput bind="name" required minLength={3} maxLength={100} />
<Textarea bind="notes" maxLength={500} />
<Checkbox bind="acceptTerms" required label="I accept the terms" />
<List bind="contacts" minItems={1} maxItems={5} />
```

## Validation Semantics

Constraint validators run as part of the `typeValidator` chain — before the user's `validate` function. If a constraint fails, the user's validator is not called.

### `required` by field type

| Field | Fails when |
|---|---|
| TextInput, Textarea | `undefined`, `null`, or `''` |
| Select, RadioGroup, Autocomplete, ExclusiveToggle | `undefined` or `null` |
| Checkbox, Switch | `undefined`, `null`, or `false` |
| List | array length is `0` (equivalent to `minItems={1}`) |

### Message keys and defaults

| Constraint | Key | Default message |
|---|---|---|
| `required` | `"required"` | `"This field is required"` |
| `minLength` | `"tooShort"` | `"Must be at least {n} characters"` |
| `maxLength` | `"tooLong"` | `"Must be {n} characters or fewer"` |
| `minItems` | `"tooFewItems"` | `"Must have at least {n} item(s)"` |
| `maxItems` | `"tooManyItems"` | `"Must have {n} item(s) or fewer"` |

The `{n}` placeholder is interpolated at validation time with the current constraint value. Customizable via `messages` on the field or globally on `<Form>`:

```tsx
<TextInput
  bind="name"
  required
  minLength={3}
  messages={{ required: "Name is required", tooShort: "At least 3 characters please" }}
/>
```

## Internal Implementation

### Field components (TextInput, Textarea, Checkbox, Switch, Select, etc.)

Each dispatch function resolves constraint props via `useReactiveProp`, then passes a `typeValidator` closure to `useFieldProps` that checks them. Components with an existing `typeValidator` (NumberInput, DatePicker, TimePicker, DateTimePicker) chain constraint checks after the existing type check.

### List

`minItems`/`maxItems` are handled in the `List` component directly — it registers its own validator on the store (it does not use `useFieldProps`). The validator reads the array length at the bound path.

### Message interpolation

Default messages containing `{n}` are resolved to a final string at validation time (e.g. `"Must be at least 3 characters"`). User-supplied `messages` overrides receive the same interpolation if they contain `{n}`.

No changes to `useFieldValidation` or `useFieldProps` signatures — constraint validation is handled entirely within each dispatch function.
