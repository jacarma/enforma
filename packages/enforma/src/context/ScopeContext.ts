// packages/enforma/src/context/ScopeContext.ts
import { createContext, useContext, useSyncExternalStore } from 'react'
import type { FormStore, FormValues } from '../store/FormStore'

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

export type Reactive<T> = T | ((scopeValues: FormValues, allValues: FormValues) => T)

// No-op unsubscribe returned by useSyncExternalStore when prop is static (no store subscription needed).
// eslint-disable-next-line @typescript-eslint/no-empty-function
const staticUnsubscribe = (): void => {}

export function useReactiveProp<T>(prop: Reactive<T> | undefined): T | undefined {
  const { store, prefix } = useScopeValue()

  return useSyncExternalStore(
    (cb) => (typeof prop === 'function' ? store.subscribe(cb) : staticUnsubscribe),
    (): T | undefined => {
      if (typeof prop !== 'function') return prop
      const fn = prop as (scopeValues: FormValues, allValues: FormValues) => T
      const allValues = store.getSnapshot()
      const raw = store.getField(prefix)
      const scopeValues: FormValues =
        prefix === '' || raw === null || typeof raw !== 'object'
          ? allValues
          : (raw as FormValues)
      return fn(scopeValues, allValues)
    },
  )
}

export function makeScopeValue(store: FormStore, prefix: string): ScopeValue {
  return { store, prefix }
}

export function extendPrefix(parent: ScopeValue, path: string): ScopeValue {
  return { store: parent.store, prefix: joinPath(parent.prefix, path) }
}
