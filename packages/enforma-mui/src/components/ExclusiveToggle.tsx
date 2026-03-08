// packages/enforma-mui/src/components/ExclusiveToggle.tsx
import { CircularProgress, FormHelperText, FormLabel, ToggleButtonGroup } from '@mui/material';
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
}: ResolvedExclusiveToggleProps) {
  if (isLoading) {
    return <CircularProgress size={20} />;
  }

  return (
    <ComponentWrap disabled={disabled} error={showError}>
      {label !== undefined && <FormLabel>{label}</FormLabel>}
      <ToggleButtonGroup
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
  );
}
