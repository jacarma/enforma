// packages/enforma/src/components/TextInput.tsx
import { useId } from 'react'
import { useFormValue, useReactiveProp } from '../context/ScopeContext'
import type { Reactive } from '../context/ScopeContext'

interface TextInputProps {
  bind: string
  label?: Reactive<string>
  placeholder?: Reactive<string>
  disabled?: Reactive<boolean>
  id?: string
}

export function TextInput({ bind, label, disabled, placeholder, id }: TextInputProps) {
  const [value, setValue] = useFormValue(bind)
  const generatedId = useId()
  const inputId = id ?? generatedId
  const resolvedLabel = useReactiveProp(label)
  const resolvedDisabled = useReactiveProp(disabled)
  const resolvedPlaceholder = useReactiveProp(placeholder)

  return (
    <div>
      {resolvedLabel !== undefined && <label htmlFor={inputId}>{resolvedLabel}</label>}
      <input
        id={inputId}
        type="text"
        value={value}
        placeholder={resolvedPlaceholder}
        disabled={resolvedDisabled}
        onChange={(e) => {
          setValue(e.target.value)
        }}
      />
    </div>
  )
}
