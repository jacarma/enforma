import { useId, useContext } from 'react';
import { FormLabel, TextField } from '@mui/material';
import { type ResolvedTextInputProps } from 'enforma';
import { ComponentWrap } from './ComponentWrap';
import { MuiVariantContext } from '../context/MuiVariantContext';

export function TextInput({
  value,
  setValue,
  label,
  disabled = false,
  placeholder,
  description,
  error,
  showError,
  onBlur,
}: ResolvedTextInputProps) {
  const variant = useContext(MuiVariantContext);
  const id = useId();

  const commonProps = {
    value: value ?? '',
    disabled,
    onBlur,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
    },
    fullWidth: true,
    placeholder: placeholder ?? '',
    type: 'text',
    error: showError,
    helperText: showError ? error : description,
    color: showError ? ('error' as const) : ('primary' as const),
  };

  if (variant === 'classic') {
    return (
      <ComponentWrap error={showError} disabled={disabled}>
        {label !== undefined && <FormLabel htmlFor={id}>{label}</FormLabel>}
        <TextField
          {...commonProps}
          slotProps={{ htmlInput: { id } }}
          variant="outlined"
          size="small"
        />
      </ComponentWrap>
    );
  }

  return (
    <ComponentWrap error={showError} disabled={disabled}>
      <TextField {...commonProps} label={label} variant={variant} />
    </ComponentWrap>
  );
}
