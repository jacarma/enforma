# Enforma — TODO

## Task 0: ESLint + coverage

- Add `eslint-plugin-react-hooks` to `packages/enforma` and `apps/demo` ESLint configs
- Wire up Vitest coverage with the `v8` provider
- Add a `coverage` script to `packages/enforma/package.json`

## Task 1: Hierarchical scopes

A `scope` prop on container components so child inputs bind relative paths.

```tsx
<Enforma.Scope path="address">
  <Enforma.TextInput bind="city" />   {/* resolves to address.city */}
</Enforma.Scope>
```

## Task 2: Reactive attributes

Props as functions evaluated against the current form state.

```tsx
<Enforma.TextInput
  bind="email"
  disabled={(values) => !values.name}
/>
```

## Task 3: Validation and errors

Field-level and form-level validation with error display.

```tsx
<Enforma.TextInput
  bind="email"
  rules={{ required: true, pattern: /\S+@\S+/ }}
/>
```

## Task 4: Array / list support

Repeated sections driven by array data.

```tsx
<Enforma.List bind="items">
  {(item) => <Enforma.TextInput bind="name" />}
</Enforma.List>
```

## Task 5: More components

- `Enforma.Select`
- `Enforma.Checkbox`
- `Enforma.Textarea`
