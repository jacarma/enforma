import { useId, useContext } from 'react';
import { FormLabel, TextField } from '@mui/material';
import { type ResolvedTextareaProps } from 'enforma';
import { ComponentWrap } from './ComponentWrap';
import { MuiVariantContext } from '../context/MuiVariantContext';

export function Textarea({
  value,
  setValue,
  label,
  disabled = false,
  placeholder,
  description,
  error,
  showError,
  onBlur,
  required,
}: ResolvedTextareaProps) {
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
    multiline: true,
    minRows: 3,
    error: showError,
    helperText: showError ? error : description,
    color: showError ? ('error' as const) : ('primary' as const),
    required: required ?? false,
  };

  if (variant === 'classic') {
    return (
      <ComponentWrap error={showError} disabled={disabled}>
        {label !== undefined && <FormLabel htmlFor={id}>{label}</FormLabel>}
        <TextField
          {...commonProps}
          slotProps={{
            htmlInput: { id } as unknown as React.InputHTMLAttributes<HTMLInputElement>,
          }}
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
