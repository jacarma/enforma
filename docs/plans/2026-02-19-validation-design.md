# Validation and Errors — Design

Date: 2026-02-19

## Overview

Field-level validation with custom and implicit validators, reactive cross-field
validation, and controlled error visibility. Validation state lives in `FormStore`
alongside value state.

## Design Principle: Store Holds Raw Values

The store is always in sync with what the user has typed, even if invalid. A
`DateInput` where the user types `"2026-02-"` writes that raw string to the store
immediately. The implicit validator produces an error and blocks submission, but
the value is never rejected or rolled back.

- `onChange` fires with partial/invalid values — consumers must be aware
- `onSubmit` is only called when the form is fully valid — consumers can trust the values
- There is no coerced or parsed value layer at the store level

## FormStore Changes

Three new pieces of state and a validator registry:

```typescript
touched: Set<string>                       // paths that have been blurred
submitted: boolean                         // form has been submitted at least once
errors: Map<string, string | null>         // computed error per path
validators: Map<string, () => string | null>  // registered validator per path
```

New methods:

| Method | Purpose |
|---|---|
| `registerValidator(path, fn)` | Called on field mount; returns an unregister fn |
| `runAllValidators()` | Re-runs every registered validator and updates `errors` |
| `touchField(path)` | Marks a path as touched (called on blur) |
| `setSubmitted()` | Sets `submitted = true` and calls `runAllValidators()` |
| `getError(path)` | Returns the stored error string or null for a path |
| `isValid()` | Returns true if `errors` has no non-null values |

On every `setField(path, value)` call, the store calls `runAllValidators()` after
notifying subscribers. This is what makes cross-field validation reactive — a
"confirm password" field re-validates when "password" changes.

## Validation Lifecycle

1. **Field mounts** — registers a combined validator (implicit + user's `validate`)
2. **User types** — `setField` updates value, triggers `runAllValidators()`,
   errors updated in store
3. **User blurs** — `touchField(path)` called, field subscribes to its touched
   state and re-renders to show error if one exists
4. **User submits** — `setSubmitted()` called; all errors become visible;
   `onSubmit(values)` called only if `isValid()`
5. **Field unmounts** — unregisters its validator

**Error visibility rule:**

```
show error = (touched || submitted || showErrors) && error !== null
```

`showErrors` flows from `<Form>` through `FormContext` so fields can read it
without prop-drilling through `<Scope>`.

## Field Component API

New props on all field components:

```tsx
<Enforma.TextInput
  bind="email"
  validate={(value, scopeValues, allValues) => {
    if (!value) return "Email is required"
    if (!value.includes("@")) return "Must be a valid email"
    return null
  }}
  messages={{
    invalid: "Not a valid format"   // overrides an implicit error key
  }}
/>
```

| Prop | Type | Purpose |
|---|---|---|
| `validate` | `(value, scopeValues, allValues) => string \| null` | Custom validation |
| `messages` | `Partial<Record<string, string>>` | Override implicit error message text |

Error display: a `<span>` rendered below the input, linked via `aria-describedby`.
Visible only when the error visibility rule is satisfied.

## Implicit Validations

Components with internal validity checks (e.g. `DateInput` parsing a raw string)
define an implicit validator with a named key. The combined validator registered
with the store runs the implicit check first:

```typescript
const combinedValidator = () => {
  // 1. Implicit check
  if (internallyInvalid) {
    const key = "invalidDate"
    return localMessages?.[key]   // field-level messages prop
      ?? formMessages?.[key]      // Form-level messages prop
      ?? "Invalid date"           // built-in default
  }

  // 2. User's validate fn (only runs if implicit check passes)
  return validate?.(value, scopeValues, allValues) ?? null
}
```

Implicit errors block the user's `validate` from running — no point validating
semantics if the value is unparseable.

Each component type documents the implicit error keys it can emit so consumers
know what to override in `messages`.

## Form Component API

```tsx
<Form
  initialValues={{ email: "", birthDate: "" }}
  onChange={(values, { isValid, errors }) => {
    setCanSave(isValid)
  }}
  onSubmit={values => saveToServer(values)}
  showErrors={isEditing}
  messages={{
    invalidDate: "Please enter a date in DD/MM/YYYY format"
  }}
>
  ...
</Form>
```

| Prop | Type | Purpose |
|---|---|---|
| `onSubmit` | `(values) => void` | Called only when form is valid |
| `showErrors` | `boolean` | Force all field errors visible (e.g. edit mode) |
| `messages` | `Partial<Record<string, string>>` | Global fallback message text for implicit error keys |
| `onChange` | `(values, { isValid, errors }) => void` | Extended with validation state |

`<Form>` renders a `<form>` element. Its native `onSubmit` handler:
1. Calls `e.preventDefault()`
2. Calls `store.setSubmitted()`
3. If `store.isValid()` → calls user's `onSubmit(store.getValues())`

`messages` and `showErrors` flow through `FormContext` (not `ScopeContext`)
since they are form-wide concerns, not scope-specific.
