import { TextField } from '@mui/material';
import { TextInputProps, useComponentProps } from 'enforma';
import { ComponentWrap } from './ComponentWrap';

export function TextInput(props: TextInputProps) {
  const { value, setValue, label, disabled, placeholder, description, error, showError, onBlur } =
    useComponentProps<string>(props);

  return (
    <ComponentWrap error={showError} disabled={disabled ?? false}>
      <TextField
        label={label}
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
