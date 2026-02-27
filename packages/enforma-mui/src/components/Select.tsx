import { useId, useContext } from 'react';
import {
  CircularProgress,
  Select as MuiSelect,
  InputLabel,
  FormHelperText,
  FormLabel,
} from '@mui/material';
import { type ResolvedSelectProps } from 'enforma';
import { ComponentWrap } from './ComponentWrap';
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
  const labelId = useId();
  const isClassic = variant === 'classic';

  if (isLoading) {
    return <CircularProgress size={20} />;
  }

  const muiVariant = isClassic ? 'outlined' : variant;

  const labelEl =
    label !== undefined ? (
      isClassic ? (
        <FormLabel id={labelId}>{label}</FormLabel>
      ) : (
        <InputLabel id={labelId}>{label}</InputLabel>
      )
    ) : null;

  const variantProps = isClassic ? { labelId, size: 'small' as const } : { labelId, label };

  return (
    <ComponentWrap error={showError} disabled={disabled} variant={muiVariant}>
      {labelEl}
      <MuiSelect
        value={value ?? ''}
        onChange={(e) => {
          setValue(e.target.value);
        }}
        onBlur={onBlur}
        fullWidth
        renderValue={() => displayValue}
        variant={muiVariant}
        {...variantProps}
      >
        {children}
      </MuiSelect>
      {showError && <FormHelperText>{dataSourceError?.message ?? error}</FormHelperText>}
    </ComponentWrap>
  );
}
