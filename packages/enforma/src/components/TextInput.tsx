// packages/enforma/src/components/TextInput.tsx
import { useSyncExternalStore, useId } from 'react'
import { useFormStore } from '../context/FormContext'

interface TextInputProps {
  bind: string
  label?: string
  placeholder?: string
  id?: string
}

export function TextInput({ bind, label, placeholder, id }: TextInputProps) {
  const store = useFormStore()
  const generatedId = useId()
  const inputId = id ?? generatedId

  const value = useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => {
      const fieldValue = store.getField(bind)
      return typeof fieldValue === 'string' ? fieldValue : ''
    },
  )

  return (
    <div>
      {label !== undefined && <label htmlFor={inputId}>{label}</label>}
      <input
        id={inputId}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          store.setField(bind, e.target.value)
        }}
      />
    </div>
  )
}
