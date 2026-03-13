import { useId } from 'react';
import {
  CircularProgress,
  FormHelperText,
  FormLabel,
  TextField,
  ToggleButtonGroup,
} from '@mui/material';
import { type ResolvedExclusiveToggleProps } from 'enforma';
import { ComponentWrap } from './ComponentWrap';

export function ExclusiveToggle({
  value,
  setValue,
  label,
  disabled = false,
  error,
  showError,
  onBlur,
  children,
  isLoading,
  dataSourceError,
  openChoice,
  isOtherSelected,
  otherText,
}: ResolvedExclusiveToggleProps) {
  const labelId = useId();

  if (isLoading) {
    return <CircularProgress size={20} />;
  }

  return (
    <>
      <ComponentWrap disabled={disabled} error={showError}>
        {label !== undefined && <FormLabel id={labelId}>{label}</FormLabel>}
        <ToggleButtonGroup
          aria-labelledby={label !== undefined ? labelId : undefined}
          value={value ?? null}
          exclusive
          disabled={disabled}
          onChange={(_, newValue: unknown) => {
            if (newValue !== null) {
              setValue(newValue);
            }
          }}
          onBlur={onBlur}
        >
          {children}
        </ToggleButtonGroup>
        {showError && <FormHelperText>{dataSourceError?.message ?? error}</FormHelperText>}
      </ComponentWrap>
      {openChoice && isOtherSelected && (
        <TextField
          value={otherText}
          onChange={(e) => {
            setValue(e.target.value);
          }}
          size="small"
          fullWidth
        />
      )}
    </>
  );
}
