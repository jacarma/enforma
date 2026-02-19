# List Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `<Enforma.List>` — a component that renders repeated form sections driven by an array value, with built-in add/remove controls.

**Architecture:** `List` reads an array from the store via `bind` (same path resolution as `TextInput`), then renders `children` once per item inside a `ScopeContext.Provider` scoped to `items.0`, `items.1`, etc. `FormStore` gains `appendItem`/`removeItem` methods that mutate the array and notify subscribers.

**Tech Stack:** React 18, TypeScript strict, Vitest + @testing-library/react, `useSyncExternalStore`

---

### Task 1: Add `appendItem` and `removeItem` to FormStore

**Files:**
- Modify: `packages/enforma/src/store/FormStore.ts`
- Test: `packages/enforma/src/store/FormStore.test.ts`

**Step 1: Write the failing tests**

Add to the bottom of `FormStore.test.ts`, inside `describe('FormStore', ...)`:

```ts
describe('appendItem', () => {
  it('appends a value to an existing array', () => {
    const store = new FormStore({ items: [{ name: 'Alice' }] })
    store.appendItem('items', { name: 'Bob' })
    expect(store.getField('items')).toEqual([{ name: 'Alice' }, { name: 'Bob' }])
  })

  it('creates the array when none exists at path', () => {
    const store = new FormStore({})
    store.appendItem('items', { name: 'Alice' })
    expect(store.getField('items')).toEqual([{ name: 'Alice' }])
  })

  it('notifies subscribers', () => {
    const store = new FormStore({ items: [] })
    const cb = vi.fn()
    store.subscribe(cb)
    store.appendItem('items', { name: 'Alice' })
    expect(cb).toHaveBeenCalledOnce()
  })
})

describe('removeItem', () => {
  it('removes the item at the given index', () => {
    const store = new FormStore({ items: [{ name: 'Alice' }, { name: 'Bob' }] })
    store.removeItem('items', 0)
    expect(store.getField('items')).toEqual([{ name: 'Bob' }])
  })

  it('notifies subscribers', () => {
    const store = new FormStore({ items: [{ name: 'Alice' }] })
    const cb = vi.fn()
    store.subscribe(cb)
    store.removeItem('items', 0)
    expect(cb).toHaveBeenCalledOnce()
  })

  it('does nothing when path is not an array', () => {
    const store = new FormStore({ name: 'Alice' })
    store.removeItem('name', 0)
    expect(store.getField('name')).toBe('Alice')
  })
})
```

**Step 2: Run tests to verify they fail**

```
pnpm --filter enforma test FormStore
```

Expected: failures on `appendItem` and `removeItem` — method does not exist.

**Step 3: Implement the methods**

Add to `FormStore` class in `FormStore.ts`, after `setField`:

```ts
appendItem(path: string, value: unknown): void {
  const current = getByPath(this._values, path)
  const arr = Array.isArray(current) ? current : []
  this._values = setByPath(this._values, path, [...arr, value])
  this.runAllValidators()
  this.notifySubscribers()
}

removeItem(path: string, index: number): void {
  const current = getByPath(this._values, path)
  if (!Array.isArray(current)) return
  this._values = setByPath(this._values, path, current.filter((_, i) => i !== index))
  this.runAllValidators()
  this.notifySubscribers()
}
```

**Step 4: Run tests to verify they pass**

```
pnpm --filter enforma test FormStore
```

Expected: all tests pass.

**Step 5: Run lint**

```
pnpm lint
```

Expected: no errors or warnings.

**Step 6: Commit**

```bash
git add packages/enforma/src/store/FormStore.ts packages/enforma/src/store/FormStore.test.ts
git commit -m "feat: add appendItem and removeItem to FormStore"
```

---

### Task 2: Create the List component

**Files:**
- Create: `packages/enforma/src/components/List.tsx`
- Create: `packages/enforma/src/components/List.test.tsx`

**Step 1: Write the failing tests**

Create `packages/enforma/src/components/List.test.tsx`:

```tsx
// packages/enforma/src/components/List.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Form } from './Form'
import { List } from './List'
import { TextInput } from './TextInput'

describe('List', () => {
  it('renders one scoped item per array element', () => {
    render(
      <Form values={{ items: [{ name: 'Alice' }, { name: 'Bob' }] }} onChange={vi.fn()}>
        <List bind="items" defaultItem={{ name: '' }}>
          <TextInput bind="name" label="Name" />
        </List>
      </Form>,
    )
    const inputs = screen.getAllByLabelText('Name')
    expect(inputs).toHaveLength(2)
    expect(inputs[0]).toHaveValue('Alice')
    expect(inputs[1]).toHaveValue('Bob')
  })

  it('renders nothing when the array is empty', () => {
    render(
      <Form values={{ items: [] }} onChange={vi.fn()}>
        <List bind="items" defaultItem={{ name: '' }}>
          <TextInput bind="name" label="Name" />
        </List>
      </Form>,
    )
    expect(screen.queryAllByLabelText('Name')).toHaveLength(0)
  })

  it('scopes each item to its own index so edits do not bleed', async () => {
    const onChange = vi.fn()
    render(
      <Form values={{ items: [{ name: 'Alice' }, { name: 'Bob' }] }} onChange={onChange}>
        <List bind="items" defaultItem={{ name: '' }}>
          <TextInput bind="name" label="Name" />
        </List>
      </Form>,
    )
    const [first] = screen.getAllByLabelText('Name')
    await userEvent.clear(first)
    await userEvent.type(first, 'Charlie')
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ items: [{ name: 'Charlie' }, { name: 'Bob' }] }),
      expect.anything(),
    )
  })

  it('appends a new item when the Add button is clicked', async () => {
    render(
      <Form values={{ items: [] }} onChange={vi.fn()}>
        <List bind="items" defaultItem={{ name: '' }}>
          <TextInput bind="name" label="Name" />
        </List>
      </Form>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getAllByLabelText('Name')).toHaveLength(1)
    expect(screen.getByLabelText('Name')).toHaveValue('')
  })

  it('removes the correct item when its Remove button is clicked', async () => {
    render(
      <Form values={{ items: [{ name: 'Alice' }, { name: 'Bob' }] }} onChange={vi.fn()}>
        <List bind="items" defaultItem={{ name: '' }}>
          <TextInput bind="name" label="Name" />
        </List>
      </Form>,
    )
    const removes = screen.getAllByRole('button', { name: 'Remove' })
    await userEvent.click(removes[0])
    const inputs = screen.getAllByLabelText('Name')
    expect(inputs).toHaveLength(1)
    expect(inputs[0]).toHaveValue('Bob')
  })

  it('works nested inside a Scope', () => {
    render(
      <Form values={{ team: { members: [{ name: 'Alice' }] } }} onChange={vi.fn()}>
        <Enforma_Scope path="team">
          <List bind="members" defaultItem={{ name: '' }}>
            <TextInput bind="name" label="Name" />
          </List>
        </Enforma_Scope>
      </Form>,
    )
    expect(screen.getByLabelText('Name')).toHaveValue('Alice')
  })
})
```

Wait — that last test needs `Scope`. Replace it with an import. Here is the corrected full file:

```tsx
// packages/enforma/src/components/List.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Form } from './Form'
import { List } from './List'
import { Scope } from './Scope'
import { TextInput } from './TextInput'

describe('List', () => {
  it('renders one scoped item per array element', () => {
    render(
      <Form values={{ items: [{ name: 'Alice' }, { name: 'Bob' }] }} onChange={vi.fn()}>
        <List bind="items" defaultItem={{ name: '' }}>
          <TextInput bind="name" label="Name" />
        </List>
      </Form>,
    )
    const inputs = screen.getAllByLabelText('Name')
    expect(inputs).toHaveLength(2)
    expect(inputs[0]).toHaveValue('Alice')
    expect(inputs[1]).toHaveValue('Bob')
  })

  it('renders nothing when the array is empty', () => {
    render(
      <Form values={{ items: [] }} onChange={vi.fn()}>
        <List bind="items" defaultItem={{ name: '' }}>
          <TextInput bind="name" label="Name" />
        </List>
      </Form>,
    )
    expect(screen.queryAllByLabelText('Name')).toHaveLength(0)
  })

  it('scopes each item to its own index so edits do not bleed', async () => {
    const onChange = vi.fn()
    render(
      <Form values={{ items: [{ name: 'Alice' }, { name: 'Bob' }] }} onChange={onChange}>
        <List bind="items" defaultItem={{ name: '' }}>
          <TextInput bind="name" label="Name" />
        </List>
      </Form>,
    )
    const [first] = screen.getAllByLabelText('Name')
    await userEvent.clear(first)
    await userEvent.type(first, 'Charlie')
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ items: [{ name: 'Charlie' }, { name: 'Bob' }] }),
      expect.anything(),
    )
  })

  it('appends a new item when the Add button is clicked', async () => {
    render(
      <Form values={{ items: [] }} onChange={vi.fn()}>
        <List bind="items" defaultItem={{ name: '' }}>
          <TextInput bind="name" label="Name" />
        </List>
      </Form>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getAllByLabelText('Name')).toHaveLength(1)
    expect(screen.getByLabelText('Name')).toHaveValue('')
  })

  it('removes the correct item when its Remove button is clicked', async () => {
    render(
      <Form values={{ items: [{ name: 'Alice' }, { name: 'Bob' }] }} onChange={vi.fn()}>
        <List bind="items" defaultItem={{ name: '' }}>
          <TextInput bind="name" label="Name" />
        </List>
      </Form>,
    )
    const removes = screen.getAllByRole('button', { name: 'Remove' })
    await userEvent.click(removes[0])
    const inputs = screen.getAllByLabelText('Name')
    expect(inputs).toHaveLength(1)
    expect(inputs[0]).toHaveValue('Bob')
  })

  it('works nested inside a Scope', () => {
    render(
      <Form values={{ team: { members: [{ name: 'Alice' }] } }} onChange={vi.fn()}>
        <Scope path="team">
          <List bind="members" defaultItem={{ name: '' }}>
            <TextInput bind="name" label="Name" />
          </List>
        </Scope>
      </Form>,
    )
    expect(screen.getByLabelText('Name')).toHaveValue('Alice')
  })
})
```

**Step 2: Run tests to verify they fail**

```
pnpm --filter enforma test List
```

Expected: failures — `List` module not found.

**Step 3: Implement List**

Create `packages/enforma/src/components/List.tsx`:

```tsx
// packages/enforma/src/components/List.tsx
import { useContext, useSyncExternalStore, type ReactNode } from 'react'
import { ScopeContext, extendPrefix } from '../context/ScopeContext'

interface ListProps {
  bind: string
  defaultItem: Record<string, unknown>
  children: ReactNode
}

export function List({ bind, defaultItem, children }: ListProps) {
  const parent = useContext(ScopeContext)
  if (parent === null) {
    throw new Error('<Enforma.List> must be used within <Enforma.Form>')
  }
  const { store } = parent
  const fullPath = parent.prefix === '' ? bind : `${parent.prefix}.${bind}`

  const length = useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => {
      const val = store.getField(fullPath)
      return Array.isArray(val) ? val.length : 0
    },
  )

  return (
    <>
      {Array.from({ length }, (_, index) => (
        <ScopeContext.Provider key={index} value={extendPrefix(parent, `${bind}.${index}`)}>
          {children}
          <button type="button" onClick={() => { store.removeItem(fullPath, index) }}>
            Remove
          </button>
        </ScopeContext.Provider>
      ))}
      <button type="button" onClick={() => { store.appendItem(fullPath, defaultItem) }}>
        Add
      </button>
    </>
  )
}
```

**Step 4: Run tests to verify they pass**

```
pnpm --filter enforma test List
```

Expected: all 6 tests pass.

**Step 5: Run all tests**

```
pnpm test
```

Expected: all tests pass.

**Step 6: Run lint**

```
pnpm lint
```

Expected: no errors or warnings.

**Step 7: Commit**

```bash
git add packages/enforma/src/components/List.tsx packages/enforma/src/components/List.test.tsx
git commit -m "feat: add List component"
```

---

### Task 3: Export List from the public API

**Files:**
- Modify: `packages/enforma/src/index.ts`

**Step 1: Update the index**

In `packages/enforma/src/index.ts`, add the `List` import and include it in the `Enforma` object:

```ts
// packages/enforma/src/index.ts
import { Form } from './components/Form'
import { TextInput } from './components/TextInput'
import { Scope } from './components/Scope'
import { List } from './components/List'

const Enforma = { Form, TextInput, Scope, List } as const

export default Enforma
export type { FormValues } from './store/FormStore'
export type { Reactive } from './context/ScopeContext'
```

**Step 2: Run lint and tests**

```
pnpm lint && pnpm test
```

Expected: all pass, no errors.

**Step 3: Commit**

```bash
git add packages/enforma/src/index.ts
git commit -m "feat: export List from public API"
```

---

### Task 4: Add List demo to the demo app

**Files:**
- Modify: `apps/demo/src/App.tsx`

**Step 1: Add list state and section**

In `apps/demo/src/App.tsx`:

1. Add initial values near the top:

```ts
const LIST_INITIAL: FormValues = {
  members: [{ name: 'Alice' }, { name: 'Bob' }],
}
```

2. Add state in the `App` component body:

```ts
const [listValues, setListValues] = useState<FormValues>(LIST_INITIAL)
```

3. Add a new section after the validation section (before the closing `</div>`):

```tsx
<hr style={{ margin: '2rem 0' }} />

<h2>List</h2>
<p style={{ color: '#555', marginBottom: '1rem' }}>
  Repeated sections driven by an array. Each item is scoped automatically.
</p>

<Enforma.Form values={listValues} onChange={setListValues} aria-label="list demo form">
  <Enforma.List bind="members" defaultItem={{ name: '' }}>
    <Enforma.TextInput bind="name" label="Name" />
  </Enforma.List>
</Enforma.Form>

<pre style={{ marginTop: '2rem', background: '#f4f4f4', padding: '1rem' }}>
  {JSON.stringify(listValues, null, 2)}
</pre>
```

**Step 2: Run lint**

```
pnpm lint
```

Expected: no errors or warnings.

**Step 3: Commit**

```bash
git add apps/demo/src/App.tsx
git commit -m "demo: add list section"
```
