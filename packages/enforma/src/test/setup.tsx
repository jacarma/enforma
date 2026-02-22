import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { useId } from 'react';
import { registerComponents, clearRegistry } from '../components/registry';
import { useComponentProps } from '../context/ScopeContext';
import type { TextInputProps } from '../components/types';

function DefaultTextInput(props: TextInputProps) {
  const { value, setValue, label, disabled, placeholder, error, showError, onBlur } =
    useComponentProps<string>(props);
  const generatedId = useId();
  const inputId = props.id ?? generatedId;
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
