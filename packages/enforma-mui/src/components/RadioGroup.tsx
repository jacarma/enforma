import { useId } from 'react';
import {
  CircularProgress,
  FormHelperText,
  FormLabel,
  RadioGroup as MuiRadioGroup,
  TextField,
} from '@mui/material';
import { type ResolvedRadioGroupProps } from 'enforma';
import { ComponentWrap } from './ComponentWrap';

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
  options,
  isLoading,
  dataSourceError,
  openChoice,
  isOtherSelected,
  otherText,
}: ResolvedRadioGroupProps) {
  const labelId = useId();

  if (isLoading) {
    return <CircularProgress size={20} />;
  }

  return (
    <>
      <ComponentWrap disabled={disabled} error={showError}>
        {label !== undefined && <FormLabel id={labelId}>{label}</FormLabel>}
        <MuiRadioGroup
          aria-labelledby={label !== undefined ? labelId : undefined}
          value={value ?? ''}
          onChange={(e) => {
            const matched = options.find((opt) => String(opt.value) === e.target.value);
            if (matched !== undefined) setValue(matched.value);
          }}
          onBlur={onBlur}
          row={row}
        >
          {children}
        </MuiRadioGroup>
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
