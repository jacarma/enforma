import { FormControlLabel, Radio } from '@mui/material';
import { type ResolvedRadioGroupOptionProps } from 'enforma';

export function RadioGroupOption({ value, label }: ResolvedRadioGroupOptionProps) {
  return <FormControlLabel value={value} control={<Radio />} label={label} />;
}
