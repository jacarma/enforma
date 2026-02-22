# MUI List Component Design

**Date:** 2026-02-22
**Status:** Approved

## Goal

A `List` component for `enforma-mui` that replaces the current headless bare-button list with a proper MUI UX: card rows showing item data, a modal dialog for create/edit/display, and configurable delete affordances.

## API

```tsx
{/* Simple: one form for both create and edit */}
<Enforma.List bind="members" defaultItem={{ name: '' }}>
  <Enforma.List.Item title="name" subtitle="email" />
  <Enforma.List.Form>
    <Enforma.TextInput bind="name" label="Name" />
    <Enforma.TextInput bind="email" label="Email" />
  </Enforma.List.Form>
</Enforma.List>

{/* Advanced: separate forms per mode, delete on both row and modal */}
<Enforma.List bind="members" defaultItem={{ name: '' }}>
  <Enforma.List.Item title="name" subtitle="email" avatar="avatarUrl" showDeleteButton />
  <Enforma.List.Form mode="CREATE">
    <Enforma.TextInput bind="name" label="Name" />
  </Enforma.List.Form>
  <Enforma.List.Form mode="UPDATE" showDeleteButton>
    <Enforma.TextInput bind="name" label="Name" />
    <Enforma.TextInput bind="email" label="Email" />
  </Enforma.List.Form>
  <Enforma.List.Form mode="DISPLAY">
    <Enforma.TextInput bind="name" label="Name" disabled />
  </Enforma.List.Form>
</Enforma.List>
```

### `<List>` props

| Prop | Type | Description |
|------|------|-------------|
| `bind` | `string` | Array field path |
| `defaultItem` | `Record<string, unknown>` | Object used when appending a new item |
| `disabled` | `boolean` | When true, row click opens DISPLAY form; add/delete hidden |

### `<List.Item>` props

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string \| ((item) => string)` | Field path or reactive function for row primary text |
| `subtitle?` | `string \| ((item) => string)` | Row secondary text |
| `avatar?` | `string \| ((item) => string)` | Field path resolving to image URL, rendered as MUI `Avatar` |
| `showDeleteButton?` | `boolean` | Show trash icon on each row (default `false`) |

### `<List.Form>` props

| Prop | Type | Description |
|------|------|-------------|
| `mode?` | `"CREATE" \| "UPDATE" \| "DISPLAY"` | Which modal mode this form is used for; omit to use as fallback for all modes |
| `showDeleteButton?` | `boolean` | Show delete button in modal footer (default `false`) |
| `children` | `ReactNode` | Form fields |

### Form resolution

When opening a modal, `List` selects the `List.Form` whose `mode` matches the current mode. Falls back to the untyped `List.Form` (no `mode` prop) if no specific match exists.

## Architecture

### `useListState` hook — core (`packages/enforma/src/hooks/useListState.ts`)

Extracted from the current `List.tsx`. Encapsulates array operations, stable key tracking, and focus management.

```ts
function useListState(bind: string, defaultItem: Record<string, unknown>): {
  arr: unknown[];
  keys: string[];
  append: () => void;
  remove: (index: number) => void;
}
```

Core `List.tsx` refactors to consume this hook. Behavior is unchanged.

### `enforma-mui` components

**`List`** — calls `useListState`, reads children to find `List.Item` and `List.Form` slots, manages modal state (`{ open, index, mode }`).

**`List.Item`** — pure config component (no DOM output); `List` reads its props to render MUI `ListItem` rows.

**`List.Form`** — pure config component; `List` reads its `mode`, `showDeleteButton`, and `children` to render inside the MUI `Dialog`.

### Registration

```ts
export const classic = {
  TextInput,
  Fieldset,
  List,
  FormWrap: ClassicProvider,
};
// same for outlined and standard
```

## Data Flow & Modal Lifecycle

**Row display:** For each item at index `i`, `List` evaluates `List.Item` props against the item object. Reactive props are called with the current item value.

**Opening the modal:**
- "Add" button → mode `CREATE`, `draftValues = defaultItem`
- Row click → mode `UPDATE` (or `DISPLAY` if `disabled`), `draftValues = arr[index]`
- `List` stores `{ open: boolean, index: number, mode }` in local React state

**Draft form:** The `Dialog` wraps `List.Form` children in `<Enforma.Form values={draftValues} onChange={setDraftValues}>`. All field bindings inside the modal target this isolated form context — the parent store is untouched while the modal is open.

**Confirming:**
- CREATE: append `draftValues` to parent store array, close modal
- UPDATE: replace `arr[index]` with `draftValues` in parent store, close modal

**Cancelling:** Discard `draftValues`, close modal. No rollback needed — parent store was never written.

**Delete:**
- Row delete icon (`showDeleteButton` on `List.Item`): removes item directly, no modal
- Modal delete button (`showDeleteButton` on `List.Form`): removes item, closes modal
- Both hidden when `disabled`

## Testing

### Core (`packages/enforma`)

- `useListState` unit tests: append, remove, key stability, focus restoration
- Existing `List.test.tsx` refactored to use `useListState` — behavior unchanged

### `enforma-mui` (`packages/enforma-mui`)

- `List.test.tsx` covering:
  - Rows render with correct title/subtitle from item data
  - "Add" button opens modal with empty draft; confirm appends to parent store
  - Row click opens modal with item data; confirm updates parent store; cancel leaves store unchanged
  - Delete from row removes item
  - Delete from modal removes item and closes dialog
  - `disabled` list: row click opens DISPLAY form; no add/delete affordances visible
  - `showDeleteButton` defaults to false — delete buttons absent unless opted in
  - `mode` fallback — untyped `List.Form` used when no matching mode exists
