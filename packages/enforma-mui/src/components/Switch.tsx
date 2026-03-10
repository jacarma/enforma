import { FormControlLabel, Switch as MuiSwitch, FormHelperText } from '@mui/material';
import { type ResolvedSwitchProps } from 'enforma';
import { ComponentWrap } from './ComponentWrap';

export function Switch({
  value,
  setValue,
  label,
  disabled = false,
  description,
  error,
  showError,
  onBlur,
  required,
  labelPlacement = 'end',
}: ResolvedSwitchProps) {
  return (
    <ComponentWrap error={showError} disabled={disabled}>
      <FormControlLabel
        label={label ?? ''}
        labelPlacement={labelPlacement}
        disabled={disabled}
        required={required ?? false}
        control={
          <MuiSwitch
            checked={value ?? false}
            onChange={(e) => {
              setValue(e.target.checked);
            }}
            onBlur={onBlur}
          />
        }
      />
      {showError && error && <FormHelperText>{error}</FormHelperText>}
      {!showError && description !== undefined && <FormHelperText>{description}</FormHelperText>}
    </ComponentWrap>
  );
}
