# OpenChoice Design

**Date:** 2026-03-08
**Status:** Approved

## Overview

Add an `openChoice` boolean prop to `Select`, `RadioGroup`, and `ExclusiveToggle`. When enabled, an extra "Other" option appears at the end of the options list. Selecting it reveals a text input below the component where the user can type a free-form value. That typed value is stored directly as the field's form value — no wrapper object, no sentinel in the store.

## Prop API

```typescript
// Added to SelectProps, RadioGroupProps, ExclusiveToggleProps
openChoice?: boolean;
```

## Resolved Props Additions

All three resolved prop types (`ResolvedSelectProps`, `ResolvedRadioGroupProps`, `ResolvedExclusiveToggleProps`) gain:

```typescript
openChoice: boolean;       // mirrors the input prop
isOtherSelected: boolean;  // true when value is non-empty and not in options
otherText: string;         // = value as string when isOtherSelected, else ''
```

The adapter uses the existing `setValue` to write both real option values and the typed custom text.

## Core Dispatch Logic

Each dispatch component (`SelectDispatch`, `RadioGroupDispatch`, `ExclusiveToggleDispatch`) adds:

1. **Sentinel injection** — after `buildSelectOptions`, append `{ value: '__enforma_other__', label: 'Other' }` when `openChoice` is true.

2. **Intercept `setValue`** — wrap the store setter:
   - If called with `'__enforma_other__'`: set `localOtherSelected = true` (local state), do NOT write to the store.
   - Otherwise: set `localOtherSelected = false`, write to the store normally.

3. **Compute resolved props:**
   - `isOtherSelected = localOtherSelected || (value !== '' && value != null && !rawOptions.some(o => o.value === value))`
   - `otherText = isOtherSelected ? (value as string) : ''`

4. **On mount / external value change** — if the incoming value is non-empty and not in options, sync `localOtherSelected = true` so the text input appears immediately.

## Adapter Changes (MUI)

Each of the three MUI adapters renders a `TextField` below its main component when `openChoice && isOtherSelected`:

```tsx
{openChoice && isOtherSelected && (
  <TextField
    value={otherText}
    onChange={(e) => setValue(e.target.value)}
    // label / size / variant inherited from surrounding context
  />
)}
```

The sentinel option (`__enforma_other__`) renders like any other option — no special casing needed in adapters.

## Text Input Placement

Always below the main component, regardless of layout (`row` or vertical).

## Value Behaviour

| Scenario | Form value | isOtherSelected | otherText |
|---|---|---|---|
| Nothing selected | `''` / `null` | `false` | `''` |
| Real option selected | `'red'` | `false` | `''` |
| Custom text typed | `'tangerine'` | `true` | `'tangerine'` |
| Pre-loaded custom value | `'tangerine'` | `true` | `'tangerine'` |
| "Other" clicked, not yet typed | (unchanged) | `true` | current value or `''` |

## Deferred: messages prop

The "Other" label is hardcoded for now. When the `messages` prop is implemented project-wide, it should allow overriding this label (e.g., `messages={{ other: 'Other (specify)' }}`).

## Testing

Per component (Select, RadioGroup, ExclusiveToggle):

- `openChoice` appends "Other" to the options list
- Clicking "Other" shows the text input
- Typing in the text input sets the form value
- Pre-loaded value not in options → "Other" selected, text input shows value
- Pre-loaded value in options → normal selection, no text input
- Empty/null value → nothing selected, no text input
