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
        <ScopeContext.Provider key={index} value={extendPrefix(parent, `${bind}.${String(index)}`)}>
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
