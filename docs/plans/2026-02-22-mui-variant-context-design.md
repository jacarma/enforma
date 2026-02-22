# enforma-mui Variant Context Design

## Goal

Allow users to choose between three MUI visual styles (`classic`, `outlined`, `standard`) at registration time, with full tree-shaking support and a flexible context-based architecture that scales to future components.

## Architecture

Three layers:

1. **`MuiVariantContext`** — a React context holding `'classic' | 'outlined' | 'standard'`, defaulting to `'outlined'`. Lives in `enforma-mui`.
2. **`FormWrap`** — a component registered via `registerComponents`. Enforma's `Form` renders it around its children if present, falling back to `<>{children}</>` when not registered. Each variant export ships its own provider as the `FormWrap`, which sets the context value.
3. **Shared components** — `TextInput` and `Fieldset` are the same component references across all three variant exports. `TextInput` reads `MuiVariantContext` to switch its rendering. `Fieldset` is unaffected.

Data flow:
```
Form
  └─ FormWrap (e.g. ClassicProvider)   ← sets MuiVariantContext = 'classic'
       └─ TextInput                     ← reads context → label-above, compact
       └─ Fieldset
            └─ TextInput               ← same context, same style
```

## Styles

| Variant | Label | Border | Size |
|---|---|---|---|
| `classic` | Static above input (`FormLabel` + `inputProps.id`) | Outlined rectangle | `small` (compact) |
| `outlined` | Floating (MUI `label` prop, `variant="outlined"`) | Outlined rectangle | default (medium) |
| `standard` | Floating (MUI `label` prop, `variant="standard"`) | Underline only | default (medium) |

The `classic` label uses `inputProps={{ id }}` on `TextField` so that the external `FormLabel`'s `htmlFor` correctly points to the inner `<input>` (accessibility fix).

## Changes to `packages/enforma` core

**`types.ts`** — add `FormWrap` to `ComponentPropsMap`:
```ts
export type FormWrapProps = { children: ReactNode };

export type ComponentPropsMap = {
  TextInput: TextInputProps;
  Textarea: TextareaProps;
  Select: SelectProps;
  Checkbox: CheckboxProps;
  Fieldset: FieldsetProps;
  FormWrap: FormWrapProps;
};
```

**`Form.tsx`** — render `FormWrap` around children if registered, fall back to fragment:
```tsx
const FormWrapComponent = getComponent('FormWrap');
const wrappedChildren = FormWrapComponent
  ? <FormWrapComponent>{children}</FormWrapComponent>
  : children;
// use wrappedChildren inside <form>
```

No other core changes needed.

## `enforma-mui` file structure

```
src/
  context/
    MuiVariantContext.ts      ← createContext<MuiVariant>('outlined')
    ClassicProvider.tsx       ← Provider value="classic"
    OutlinedProvider.tsx      ← Provider value="outlined"
    StandardProvider.tsx      ← Provider value="standard"
  components/
    TextInput.tsx             ← reads context, 3 render paths
    Fieldset.tsx              ← unchanged
    ComponentWrap.tsx         ← unchanged
  index.ts                   ← named exports
```

`TextInput` size logic:
```tsx
const variant = useContext(MuiVariantContext);
const size = variant === 'classic' ? 'small' : undefined;
```

## Export API

```ts
// Pre-built bundles (common case)
export const classic  = { TextInput, Fieldset, FormWrap: ClassicProvider };
export const outlined = { TextInput, Fieldset, FormWrap: OutlinedProvider };
export const standard = { TextInput, Fieldset, FormWrap: StandardProvider };

// Individual exports (mix-and-match / max tree-shaking)
export { TextInput, Fieldset };
export { ClassicProvider, OutlinedProvider, StandardProvider };
```

No default export.

### Usage

```ts
// Most users — pick a bundle:
import { classic } from 'enforma-mui';
registerComponents(classic);

// Mix-and-match:
import { TextInput, ClassicProvider } from 'enforma-mui';
import { Fieldset } from 'other-lib';
registerComponents({ TextInput, Fieldset, FormWrap: ClassicProvider });
```

## Tree-shaking

Because `TextInput` and `Fieldset` are the same module-level references across all three variant objects, importing `classic` does not pull in additional component code compared to `outlined`. The only per-variant code is the provider (a few lines). Unused providers are dead-code eliminated by bundlers when not imported.
