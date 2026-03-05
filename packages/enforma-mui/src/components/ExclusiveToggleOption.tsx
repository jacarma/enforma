// packages/enforma-mui/src/components/ExclusiveToggleOption.tsx
import { ToggleButton } from '@mui/material';
import { type ResolvedExclusiveToggleOptionProps } from 'enforma';

export function ExclusiveToggleOption({ value, label }: ResolvedExclusiveToggleOptionProps) {
  return <ToggleButton value={value as string}>{label}</ToggleButton>;
}
