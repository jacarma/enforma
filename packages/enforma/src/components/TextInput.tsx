// packages/enforma/src/components/TextInput.tsx
import { useId } from 'react'
import { useFormValue } from '../context/ScopeContext'

interface TextInputProps {
  bind: string
  label?: string
  placeholder?: string
  id?: string
}

export function TextInput({ bind, label, placeholder, id }: TextInputProps) {
  const [value, setValue] = useFormValue(bind)
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <div>
      {label !== undefined && <label htmlFor={inputId}>{label}</label>}
      <input
        id={inputId}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          setValue(e.target.value)
        }}
      />
    </div>
  )
}
