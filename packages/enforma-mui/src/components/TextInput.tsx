import { FormLabel, TextField } from '@mui/material';
import { TextInputProps, useComponentProps } from 'enforma';
import { ComponentWrap } from './ComponentWrap';
import { useId } from 'react';

export function TextInput(props: TextInputProps) {
  const { value, setValue, label, disabled, placeholder, description, error, showError, onBlur } =
    useComponentProps<string>(props);
  const id = useId();

  return (
    <ComponentWrap error={showError} disabled={disabled ?? false}>
      {label && <FormLabel htmlFor={id}>{label}</FormLabel>}
      <TextField
        id={id}
        value={value ?? ''}
        disabled={disabled ?? false}
        onBlur={onBlur}
        onChange={(e) => {
          setValue(e.target.value);
        }}
        fullWidth
        placeholder={placeholder ?? ''}
        type="text"
        variant="outlined"
        error={showError}
        helperText={showError ? error : description}
        color={showError ? 'error' : 'primary'}
        size="small"
      />
    </ComponentWrap>
  );
}
