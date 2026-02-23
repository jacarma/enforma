import { createContext, useContext } from 'react';
import type { FormStore } from '../store/FormStore';

export type ScopeValue = {
  store: FormStore;
  prefix: string;
};

export const ScopeContext = createContext<ScopeValue | null>(null);

/** Returns the current scope. Use inside adapter components only (within <Enforma.Form>). */
export function useScope(): ScopeValue {
  const ctx = useContext(ScopeContext);
  if (ctx === null) {
    throw new Error('Enforma field hooks must be used within <Enforma.Form>');
  }
  return ctx;
}

/** @internal Used by useField.ts hooks. Not intended for direct use in most adapters. */
export function joinPath(prefix: string, bind: string): string {
  return prefix === '' ? bind : `${prefix}.${bind}`;
}

export function childScope(parent: ScopeValue, path: string): ScopeValue {
  return { store: parent.store, prefix: joinPath(parent.prefix, path) };
}
