import { useContext } from 'react';
import {
  CircularProgress,
  Select as MuiSelect,
  InputLabel,
  FormHelperText,
  FormControl as MuiFormControl,
} from '@mui/material';
import { type ResolvedSelectProps } from 'enforma';
import { MuiVariantContext } from '../context/MuiVariantContext';

export function Select({
  value,
  setValue,
  label,
  disabled = false,
  error,
  showError,
  onBlur,
  children,
  displayValue,
  isLoading,
  dataSourceError,
}: ResolvedSelectProps) {
  const variant = useContext(MuiVariantContext);
  const labelId = `select-label-${Math.random().toString(36).slice(2)}`;

  if (isLoading) {
    return <CircularProgress size={20} />;
  }

  return (
    <MuiFormControl fullWidth margin="dense" error={showError} disabled={disabled}>
      {label !== undefined && <InputLabel id={labelId}>{label}</InputLabel>}
      <MuiSelect
        labelId={labelId}
        label={label}
        value={value ?? ''}
        onChange={(e) => {
          setValue(e.target.value);
        }}
        onBlur={onBlur}
        variant={variant === 'classic' ? 'outlined' : variant}
        size={variant === 'classic' ? 'small' : 'medium'}
        renderValue={() => displayValue}
      >
        {children}
      </MuiSelect>
      {showError && <FormHelperText>{dataSourceError?.message ?? error}</FormHelperText>}
    </MuiFormControl>
  );
}
