import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { useId } from 'react';
import { registerComponents, clearRegistry } from '../components/registry';
import type { ResolvedTextInputProps } from '../components/types';

function DefaultTextInput({
  value,
  setValue,
  label,
  disabled,
  placeholder,
  error,
  showError,
  onBlur,
}: ResolvedTextInputProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;

  return (
    <div>
      {label !== undefined && <label htmlFor={inputId}>{label}</label>}
      <input
        id={inputId}
        type="text"
        value={value ?? ''}
        placeholder={placeholder}
        disabled={disabled}
        aria-describedby={showError ? errorId : undefined}
        aria-invalid={showError || undefined}
        onBlur={onBlur}
        onChange={(e) => {
          setValue(e.target.value);
        }}
      />
      {showError && error && (
        <span id={errorId} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

beforeEach(() => {
  clearRegistry();
  registerComponents({ TextInput: DefaultTextInput });
});

afterEach(cleanup);
