// packages/enforma/src/context/FormContext.ts
import { createContext, useContext } from 'react';
import type { FormStore } from '../store/FormStore';

export const FormContext = createContext<FormStore | null>(null);

export function useFormStore(): FormStore {
  const store = useContext(FormContext);
  if (store === null) {
    throw new Error('useFormStore must be used within <Enforma.Form>');
  }
  return store;
}
