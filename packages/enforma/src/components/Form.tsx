// packages/enforma/src/components/Form.tsx
import { useRef, type ReactNode } from 'react'
import { FormStore, type FormValues } from '../store/FormStore'
import { FormContext } from '../context/FormContext'

interface FormProps {
  values: FormValues
  onChange: (values: FormValues) => void
  children: ReactNode
  'aria-label'?: string
}

export function Form({
  values,
  onChange,
  children,
  'aria-label': ariaLabel = 'form',
}: FormProps) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const storeRef = useRef<FormStore | null>(null)
  if (storeRef.current === null) {
    const store = new FormStore(values)
    store.subscribe(() => {
      onChangeRef.current(store.getSnapshot())
    })
    storeRef.current = store
  }

  return (
    <FormContext.Provider value={storeRef.current}>
      <form aria-label={ariaLabel}>{children}</form>
    </FormContext.Provider>
  )
}
