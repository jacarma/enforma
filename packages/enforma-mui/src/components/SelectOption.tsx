import { MenuItem } from '@mui/material';
import { type ResolvedSelectOptionProps } from 'enforma';

export function SelectOption({ value, label }: ResolvedSelectOptionProps) {
  return <MenuItem value={value as string}>{label}</MenuItem>;
}
