import { useContext, useId } from 'react';
import { FormLabel, TextField } from '@mui/material';
import type { ResolvedCalculatedProps } from 'enforma';
import { ComponentWrap } from './ComponentWrap';
import { MuiVariantContext } from '../context/MuiVariantContext';

export function Calculated({
  value,
  label,
  description,
  disabled = false,
}: ResolvedCalculatedProps) {
  const variant = useContext(MuiVariantContext);
  const id = useId();
  const displayValue =
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
      ? String(value)
      : '';

  if (variant === 'classic') {
    return (
      <ComponentWrap disabled={disabled}>
        {label !== undefined && <FormLabel htmlFor={id}>{label}</FormLabel>}
        <TextField
          value={displayValue}
          label={undefined}
          helperText={description}
          disabled={disabled}
          slotProps={{ input: { readOnly: true }, htmlInput: { id } }}
          fullWidth
          variant="outlined"
          size="small"
        />
      </ComponentWrap>
    );
  }

  return (
    <ComponentWrap disabled={disabled}>
      <TextField
        value={displayValue}
        label={label}
        helperText={description}
        disabled={disabled}
        slotProps={{ input: { readOnly: true } }}
        fullWidth
        variant={variant}
      />
    </ComponentWrap>
  );
}
