import {
  CircularProgress,
  FormControl,
  FormHelperText,
  FormLabel,
  RadioGroup as MuiRadioGroup,
} from '@mui/material';
import { type ResolvedRadioGroupProps } from 'enforma';

export function RadioGroup({
  value,
  setValue,
  label,
  disabled = false,
  error,
  showError,
  onBlur,
  children,
  row,
  isLoading,
  dataSourceError,
}: ResolvedRadioGroupProps) {
  if (isLoading) {
    return <CircularProgress size={20} />;
  }

  return (
    <FormControl disabled={disabled} error={showError}>
      {label !== undefined && <FormLabel>{label}</FormLabel>}
      <MuiRadioGroup
        value={value ?? ''}
        onChange={(e) => {
          setValue(e.target.value);
        }}
        onBlur={onBlur}
        row={row}
      >
        {children}
      </MuiRadioGroup>
      {showError && <FormHelperText>{dataSourceError?.message ?? error}</FormHelperText>}
    </FormControl>
  );
}
