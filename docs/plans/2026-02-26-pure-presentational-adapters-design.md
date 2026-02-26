# Pure Presentational Adapters Design

## Problem

Complex components like `List` and `Select` require orchestration logic (modal state, draft values, datasource wiring, options resolution) that would be duplicated in every UI adapter. A second adapter (e.g. shadcn/ui) would need to reimplement ~150 lines of identical logic with only the UI components swapped out.

## Solution

Move all orchestration into the core dispatch layer. Adapter components receive fully-resolved props and render UI primitives only — zero enforma hook imports, zero state management.

## Architecture

Three layers:

**User layer** — declarative JSX with reactive props, bind strings, datasources. Unchanged from current API.

**Core dispatch layer** — calls hooks, resolves all reactive values, manages orchestration state (modal, drafts), builds resolved props and slot nodes, dispatches to registry.

**Adapter layer** — receives resolved props, renders UI library components. No enforma imports except types.

### Simple fields

```
useFieldProps(props) → { value, setValue, label, error, ... } → registered TextInput
```

### List

```
Core List component
  → useListState(bind, defaultItem)
  → useState for modal + draftValues (internal)
  → builds: items: ReactNode[], addButton: ReactNode, modal: ReactNode
  → dispatches to registered ListWrap
```

`useListState` remains exported as a low-level hook for custom list UIs. The modal orchestration lives inside the core `List` dispatch component directly — no intermediate `useListOrchestration` hook is needed.

## Type System

Two type families per component:

**Input types** — user-facing API, unchanged. Continue to export as `TextInputProps`, `SelectProps`, etc.

**Resolved types** — adapter contract. Registry maps to these. Named with `Resolved` prefix.

`Unresolved<T>` is a naming convention, not a mechanical utility type. The transformation from resolved to input is structural in places (`value/setValue` → `bind`, `error/showError/onBlur` → `validate/messages`), so both families are defined explicitly.

### Registry change

```typescript
// before
type EnformaComponentRegistry = {
  TextInput?: ComponentType<TextInputProps>;
};

// after
type EnformaComponentRegistry = {
  TextInput?: ComponentType<ResolvedTextInputProps>;
  ListWrap?: ComponentType<ResolvedListProps>;
  ListItem?: ComponentType<ResolvedListItemProps>;
  FormModal?: ComponentType<ResolvedFormModalProps>;
  AddButton?: ComponentType<ResolvedAddButtonProps>;
};
```

## Component Contracts

### Simple fields (TextInput, Textarea, Checkbox)

```typescript
type ResolvedTextInputProps = {
  value: string | undefined;
  setValue: (v: string) => void;
  label?: string;
  disabled?: boolean;
  placeholder?: string;
  description?: string;
  error: string | null;
  showError: boolean;
  onBlur: () => void;
};
```

### Select

```typescript
type ResolvedSelectProps = ResolvedTextInputProps & {
  options: { value: unknown; label: string }[];
  isLoading: boolean;
  dataSourceError: Error | null;
  children?: ReactNode; // inline <Select.Option> passthrough
};
```

### Fieldset

Core handles `bind` → `Scope` wrapping. Adapter receives children already scoped.

```typescript
type ResolvedFieldsetProps = {
  children: ReactNode;
  title?: string;
};
```

### List slots

```typescript
type ResolvedListProps = {
  items: ReactNode[];    // pre-built ListItem nodes
  addButton: ReactNode;
  modal: ReactNode;
  isEmpty: boolean;
  disabled: boolean;
};

type ResolvedListItemProps = {
  item: FormValues;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  disabled: boolean;
  title: string;
  subtitle?: string;
  avatar?: string;
  showDeleteButton: boolean;
};

type ResolvedFormModalProps = {
  open: boolean;
  mode: 'CREATE' | 'UPDATE' | 'DISPLAY';
  title: string;
  children: ReactNode;  // draft form content
  onConfirm: () => void;
  onCancel: () => void;
  onDelete?: () => void;
};

type ResolvedAddButtonProps = {
  onClick: () => void;
  disabled: boolean;
};
```

### FormModal

`FormModal` is scoped to "a modal that hosts a draft form with confirm/cancel/delete actions". It is not a generic modal and not List-specific — it applies equally to any future component that needs an edit-in-dialog UX (e.g. Lookup field).

## Named Slots for Layout Control

List passes slot nodes as named props (`items`, `addButton`, `modal`) rather than a single `children` blob. This gives adapters full layout control:

```tsx
// MUI: add button below list
function ListWrap({ items, addButton, modal, isEmpty }: ResolvedListProps) {
  return (
    <>
      <MuiList>{isEmpty ? <EmptyState /> : items}</MuiList>
      {addButton}
      {modal}
    </>
  );
}

// shadcn: add button in card header
function ListWrap({ items, addButton, modal }: ResolvedListProps) {
  return (
    <Card>
      <CardHeader action={addButton} />
      <CardContent>{items}</CardContent>
      {modal}
    </Card>
  );
}
```

Adapters cannot access per-item data (items are opaque `ReactNode[]`). Per-item rendering is handled by the registered `ListItem` component.

## Migration: enforma-mui

**TextInput** — removes `useFieldProps` import and call. Props change from `TextInputProps` to `ResolvedTextInputProps`.

**Fieldset** — removes `Enforma.Scope` and `bind` handling. Props change to `ResolvedFieldsetProps`.

**List** — one 150+ line component splits into four focused components: `ListWrap`, `ListItem`, `AddButton`, `FormModal`. Each is 20–40 lines.

**Registry** — gains `ListWrap`, `ListItem`, `AddButton`, `FormModal` entries across all variant exports (`classic`, `outlined`, `standard`).

## Adapter Authoring Benefits

A new adapter author needs no knowledge of enforma internals:

1. Implement `TextInput`, `Textarea`, `Checkbox`, `Select` — receive resolved field values, render inputs
2. Implement `Fieldset` — receive children + title, render a fieldset wrapper
3. Implement `ListWrap`, `ListItem`, `AddButton`, `FormModal` — receive resolved props, render UI
4. Register all components
5. TypeScript enforces the full contract — nothing can be forgotten
