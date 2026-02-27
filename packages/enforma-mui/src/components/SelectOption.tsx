import { MenuItem, type MenuItemProps } from '@mui/material';
import { type ResolvedSelectOptionProps } from 'enforma';

export function SelectOption({
  value,
  label,
  ...rest
}: ResolvedSelectOptionProps & Omit<MenuItemProps, 'value'>) {
  return (
    <MenuItem value={value as string} {...rest}>
      {label}
    </MenuItem>
  );
}
