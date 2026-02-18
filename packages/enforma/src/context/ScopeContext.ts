// packages/enforma/src/context/ScopeContext.ts
import { createContext, useContext, useSyncExternalStore } from 'react'
import type { FormStore } from '../store/FormStore'

interface ScopeValue {
  store: FormStore
  prefix: string
}

export const ScopeContext = createContext<ScopeValue | null>(null)

function useScopeValue(): ScopeValue {
  const ctx = useContext(ScopeContext)
  if (ctx === null) {
    throw new Error('useFormValue must be used within <Enforma.Form>')
  }
  return ctx
}

function joinPath(prefix: string, bind: string): string {
  return prefix === '' ? bind : `${prefix}.${bind}`
}

export function useFormValue(
  bind: string,
): [string, (value: string) => void] {
  const { store, prefix } = useScopeValue()
  const fullPath = joinPath(prefix, bind)

  const value = useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => {
      const fieldValue = store.getField(fullPath)
      return typeof fieldValue === 'string' ? fieldValue : ''
    },
  )

  const setValue = (newValue: string) => {
    store.setField(fullPath, newValue)
  }

  return [value, setValue]
}

export function makeScopeValue(store: FormStore, prefix: string): ScopeValue {
  return { store, prefix }
}

export function extendPrefix(parent: ScopeValue, path: string): ScopeValue {
  return { store: parent.store, prefix: joinPath(parent.prefix, path) }
}
