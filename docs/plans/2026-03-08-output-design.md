# Output Component Design

**Date:** 2026-03-08
**Status:** Approved

## Summary

`Output` is a read-only inline element that renders a reactive value as text. It is used for instructions, section notes, or computed text displayed mid-sentence within other elements.

```tsx
<h3>Hello, <Output as="span" value={({ name }) => name} /></h3>
```

## Props

`OutputProps` does **not** extend `CommonProps` — no `bind`, `label`, `description`, `disabled`, or validation.

```ts
type OutputProps = {
  value: Reactive<unknown>; // reactive or static value to display
  as?: string;              // HTML element tag, defaults to 'span'
};
```

## Resolved Props (adapter contract)

```ts
type ResolvedOutputProps = {
  value: unknown; // resolved (reactive function already called)
  as: string;     // always present, defaults to 'span'
};
```

## Dispatch (`packages/enforma`)

In `fields.tsx`, following the same pattern as `Calculated`:

```tsx
function OutputDispatch({ value, as = 'span' }: OutputProps) {
  const resolvedValue = useReactiveProp(value);
  return dispatchComponent('Output', { value: resolvedValue, as });
}
export const Output = memo(OutputDispatch, stablePropsEqual);
```

`'Output': ResolvedOutputProps` is added to `ComponentPropsMap`.

## MUI Adapter (`packages/enforma-mui`)

Plain element — no `Typography`, no `ComponentWrap`. Inherits surrounding styles naturally, which is correct for an inline element.

```tsx
export function Output({ value, as: Tag = 'span' }: ResolvedOutputProps) {
  const text = value !== null && value !== undefined ? String(value) : '';
  return <Tag>{text}</Tag>;
}
```

`text` is a React text node (not `innerHTML`), so XSS from form values is not possible. `as` is a developer-controlled prop, same pattern as MUI's `component` prop.

## Exports

- `Output` added to the `Enforma` default export namespace and named export
- `OutputProps` and `ResolvedOutputProps` exported as types from `index.ts`
- `'Output': ResolvedOutputProps` added to `ComponentPropsMap`

## Tests

**`packages/enforma` — `Output.test.tsx`:**
- Static value renders
- Reactive value re-renders when form state changes
- `as` prop changes the rendered element tag
- Default `as` is `span`

**`packages/enforma-mui` — `Output.test.tsx`:**
- Renders `String(value)`
- `null` / `undefined` value renders empty string
- `as` prop is forwarded to the DOM element
