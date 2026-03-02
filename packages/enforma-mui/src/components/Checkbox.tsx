import { FormControlLabel, Checkbox as MuiCheckbox, FormHelperText } from '@mui/material';
import { type ResolvedCheckboxProps } from 'enforma';
import { ComponentWrap } from './ComponentWrap';

export function Checkbox({
  value,
  setValue,
  label,
  disabled = false,
  description,
  error,
  showError,
  onBlur,
  labelPlacement = 'end',
}: ResolvedCheckboxProps) {
  return (
    <ComponentWrap error={showError} disabled={disabled}>
      <FormControlLabel
        label={label ?? ''}
        labelPlacement={labelPlacement}
        disabled={disabled}
        control={
          <MuiCheckbox
            checked={value ?? false}
            onChange={(e) => {
              setValue(e.target.checked);
            }}
            onBlur={onBlur}
          />
        }
      />
      {showError && error && <FormHelperText>{error}</FormHelperText>}
      {!showError && description !== undefined && (
        <FormHelperText>{description}</FormHelperText>
      )}
    </ComponentWrap>
  );
}
