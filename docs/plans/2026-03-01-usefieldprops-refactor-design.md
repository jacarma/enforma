# Design: `useFieldProps` Refactor

## Goal

Refactor `useFieldProps` so that:

1. It resolves **any** reactive props — not just the hardcoded `CommonProps` subset (`label`, `disabled`, `placeholder`, `description`).
2. It uses a **single `useSyncExternalStore`** instead of N separate `useReactiveProp` calls.
3. The call site simplifies to `useFieldProps<ResolvedCheckboxProps>(props)` — one generic parameter, the resolved type.

This is a pure internal refactor. The public API surface (component props, resolved types, registered adapters) is unchanged.

## Type: `ToComponentProps<R>`

A utility type that maps from a resolved type back to the corresponding component props type:

```ts
type ToComponentProps<R extends ResolvedCommonProps> = CommonProps & {
  [K in Exclude<keyof R, keyof ResolvedCommonProps>]?: Reactive<NonNullable<R[K]>>
}
```

`Exclude<keyof R, keyof ResolvedCommonProps>` isolates the extra keys unique to `R`
(e.g. `'labelPlacement'` for `ResolvedCheckboxProps`, `'mask'` for `ResolvedTextInputProps`).
These are typed as optional `Reactive<...>` props.

TypeScript enforces at each call site that the input props satisfy `ToComponentProps<R>`.
If component props and resolved types drift, it becomes a type error.

## New signature

```ts
function useFieldProps<R extends ResolvedCommonProps>(
  props: ToComponentProps<R>
): R
```

The value type is derived automatically: `NonNullable<R['value']>` (e.g. `boolean` for checkbox, `string` for text input). No explicit `T` parameter needed.

## Implementation

```ts
export function useFieldProps<R extends ResolvedCommonProps>(
  props: ToComponentProps<R>
): R {
  const { bind, validate, messages, ...reactiveProps } = props
  const { store, prefix } = useScope()

  type ValueType = NonNullable<R['value']>
  const [value, setValue] = useFormValue<ValueType>(bind)

  // Always-current ref — avoids stale closures in the snapshot
  const propsRef = useRef(reactiveProps)
  propsRef.current = reactiveProps

  // Stable reference cache — useSyncExternalStore compares with Object.is
  const lastRef = useRef<Record<string, unknown> | null>(null)

  // Stable subscribe — only depends on store (from context, never changes)
  const subscribe = useCallback(
    (cb: () => void) =>
      Object.values(propsRef.current).some((v) => typeof v === 'function')
        ? store.subscribe(cb)
        : staticUnsubscribe,
    [store],
  )

  const resolvedExtras = useSyncExternalStore(subscribe, () => {
    const allValues = store.getSnapshot()
    const raw = store.getField(prefix)
    const scopeValues: FormValues =
      prefix === '' || raw === null || typeof raw !== 'object' ? allValues : (raw as FormValues)

    const next: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(propsRef.current)) {
      next[k] = typeof v === 'function' ? (v as (s: FormValues, a: FormValues) => unknown)(scopeValues, allValues) : v
    }

    // Return cached reference if nothing changed — prevents unnecessary re-renders
    const last = lastRef.current
    if (last !== null && Object.keys(next).every((k) => Object.is(last[k], next[k]))) return last
    return (lastRef.current = next)
  })

  return {
    value,
    setValue,
    ...resolvedExtras,
    ...useFieldValidation(bind, validate, messages),
  } as R
}
```

Key points:
- **`propsRef`**: captures latest props each render so the snapshot always sees current values without the subscribe function needing to change.
- **`subscribe` via `useCallback([store])`**: stable reference — React only re-subscribes when the store instance changes (never in practice). The body reads `propsRef.current` at call time to decide whether subscription is needed.
- **`lastRef` cache**: `useSyncExternalStore` compares snapshots with `Object.is`. Since the snapshot returns a plain object (new reference each evaluation), we cache and return the same reference when all values are unchanged — React bails out without re-rendering.
- **`as R` cast**: the implementation is correct by construction; the cast bridges the TypeScript gap between the runtime loop and the generic return type.

## Changes to `fields.tsx`

All dispatch components simplify to one-liners. `TextInputDispatch` no longer needs to destructure and separately resolve `mask`:

```ts
// Before
function TextInputDispatch({ mask, ...props }: TextInputProps) {
  const resolved = useFieldProps<string>(props)
  const resolvedMask = useReactiveProp(mask)
  return dispatchComponent('TextInput', {
    ...resolved,
    ...(resolvedMask !== undefined && { mask: resolvedMask }),
  })
}

// After
function TextInputDispatch(props: TextInputProps) {
  return dispatchComponent('TextInput', useFieldProps<ResolvedTextInputProps>(props))
}
```

Same pattern for all other dispatch components.

## What does NOT change

- `useReactiveProp` — stays exported for custom component authors (e.g. `StarRating` in the demo uses `useFieldProps` with `CommonProps`, not this new generic form; or they call `useReactiveProp` directly).
- `useFormValue`, `useFieldValidation` — unchanged.
- All component prop types (`CheckboxProps`, `TextInputProps`, etc.) — unchanged.
- All resolved types (`ResolvedCheckboxProps`, `ResolvedTextInputProps`, etc.) — unchanged.
- MUI adapter components — unchanged.

## Files affected

- `packages/enforma/src/hooks/useField.ts` — main refactor; `ToComponentProps<R>` defined here or re-exported from `types.ts`
- `packages/enforma/src/components/fields.tsx` — simplify all dispatch components
- `packages/enforma/src/components/types.ts` — export `ToComponentProps<R>` if needed by adapters
- Tests in `packages/enforma/src/` — existing tests should pass unchanged; add tests for extra reactive prop resolution via `useFieldProps`
