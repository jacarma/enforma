import { useId } from 'react'
import { useFormValue, useReactiveProp, useFieldValidation } from '../context/ScopeContext'
import type { Reactive } from '../context/ScopeContext'
import type { FormValues } from '../store/FormStore'

interface TextInputProps {
  bind: string
  label?: Reactive<string>
  placeholder?: Reactive<string>
  disabled?: Reactive<boolean>
  id?: string
  validate?: (value: unknown, scopeValues: FormValues, allValues: FormValues) => string | null
  messages?: Partial<Record<string, string>>
}

export function TextInput({
  bind,
  label,
  disabled,
  placeholder,
  id,
  validate,
  messages,
}: TextInputProps) {
  const [value, setValue] = useFormValue(bind)
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`

  const resolvedLabel = useReactiveProp(label)
  const resolvedDisabled = useReactiveProp(disabled)
  const resolvedPlaceholder = useReactiveProp(placeholder)

  const { error, showError, onBlur } = useFieldValidation(
    bind,
    validate,
    messages,
  )

  return (
    <div>
      {resolvedLabel !== undefined && <label htmlFor={inputId}>{resolvedLabel}</label>}
      <input
        id={inputId}
        type="text"
        value={value}
        placeholder={resolvedPlaceholder}
        disabled={resolvedDisabled}
        aria-describedby={showError ? errorId : undefined}
        aria-invalid={showError || undefined}
        onBlur={onBlur}
        onChange={(e) => {
          setValue(e.target.value)
        }}
      />
      {showError && (
        <span id={errorId} role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
