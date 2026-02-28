# TextInput Mask Support Design

## Summary

Add optional input masking to `TextInput` via IMask, without forcing users who don't need masks to download the masking library.

## Decisions

**IMask as the shared masking library across all adapters.** IMask operates directly on DOM inputs and is not tied to any component library. All future adapters (`enforma-ant`, `enforma-mantine`, etc.) will use the same `react-imask` wrapper, making mask definitions portable — a form using `mask="000-000-0000"` works identically regardless of which adapter is in use.

**`mask` is part of enforma core, not adapter-specific.** Typed as `Reactive<string | RegExp>` in core so it participates in the same reactive resolution pipeline as `label`, `disabled`, `placeholder`, etc.

**Optional peer dependency, not bundled.** `react-imask` and `imask` are optional peer deps of `enforma-mui` only. Users who never use masks pay zero cost.

**Lazy loading via `React.lazy`.** The masked input component is code-split so the imask chunk is only fetched when a `mask` prop is first encountered. If `react-imask` is not installed, a clear actionable error is thrown.

## Type changes (core)

```ts
// TextInputProps — what users write in JSX
export type TextInputProps = CommonProps & {
  mask?: Reactive<string | RegExp>;
};

// ResolvedTextInputProps — what adapter components receive
export type ResolvedTextInputProps = Omit<ResolvedCommonProps, 'value' | 'setValue'> & {
  value: string | undefined;
  setValue: (value: string) => void;
  mask?: string | RegExp;
};
```

## Data flow

```
<Enforma.TextInput bind="phone" mask="000-000-0000" />
  → TextInputDispatch (fields.tsx)
    → useFieldProps resolves common props
    → useReactiveProp(mask) resolves mask
    → dispatchComponent('TextInput', { ...resolved, mask })
      → enforma-mui TextInput adapter
        → if mask: <Suspense><LazyMaskedTextInput /></Suspense>
        → if no mask: standard TextField (unchanged)
```

## enforma-mui implementation

### `TextInput.tsx`

- Accepts `mask` from `ResolvedTextInputProps`
- Extracts shared `commonProps` (unchanged)
- When `mask` is defined: renders `LazyMaskedTextInput` wrapped in `Suspense`, using the unmasked `TextField` as the fallback (no visual flash)
- When `mask` is undefined: renders as today

### `MaskedTextInput.tsx` (new internal file)

- Imports `react-imask` at module top level (triggers chunk boundary)
- Defines a `MaskAdapter` using `forwardRef` that wraps `IMaskInput` to fit MUI's input slot interface
- Renders `TextField` with `inputComponent: MaskAdapter` in slot props
- Handles both classic and variant rendering, same as `TextInput.tsx`

### Lazy wrapper with error handling

```ts
const LazyMaskedTextInput = React.lazy(() =>
  import('./MaskedTextInput').catch(() => {
    throw new Error(
      'enforma-mui: the `mask` prop requires `react-imask`. Run: pnpm add react-imask imask'
    );
  })
);
```

### `package.json`

```json
"peerDependencies": {
  "imask": "^7",
  "react-imask": "^7"
},
"peerDependenciesMeta": {
  "imask": { "optional": true },
  "react-imask": { "optional": true }
}
```

### `vite.config.ts`

Add `react-imask` and `imask` to `rollupOptions.external`.

## Error handling

| Scenario | Behaviour |
|---|---|
| `mask` not provided | Standard TextField, imask never imported |
| `mask` provided, `react-imask` installed | Lazy chunk loaded, masked TextField rendered |
| `mask` provided, `react-imask` not installed | Clear error: "requires react-imask. Run: pnpm add react-imask imask" |

## Testing

- **Core**: `mask` reactive prop is resolved and passed through to the adapter
- **enforma-mui**: with `react-imask` mocked, `IMaskInput` is used as input component when `mask` is provided
- **enforma-mui**: without `react-imask`, a clear error is thrown when `mask` is provided
- **enforma-mui**: when `mask` is absent, component renders as before (no regression)
