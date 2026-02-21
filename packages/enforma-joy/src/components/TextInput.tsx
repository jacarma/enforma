import { FormControl, FormHelperText, FormLabel, Input } from '@mui/joy';
import { TextInputProps, useComponentProps } from 'enforma';

export function TextInput(props: TextInputProps) {
  const { value, setValue, label, disabled, placeholder, description, error, showError, onBlur } =
    useComponentProps<string>(props);

  return (
    <FormControl error={showError}>
      {label && <FormLabel>{label}</FormLabel>}
      <Input
        value={value ?? ''}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={showError || undefined}
        onBlur={onBlur}
        onChange={(e) => {
          setValue(e.target.value);
        }}
      />
      {(showError || description) && (
        <FormHelperText>{showError ? error : description}</FormHelperText>
      )}
    </FormControl>
  );
}
