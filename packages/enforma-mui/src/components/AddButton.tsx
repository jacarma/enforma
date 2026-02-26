import { Button } from '@mui/material';
import { type ResolvedAddButtonProps } from 'enforma';

export function AddButton({ onClick, disabled }: ResolvedAddButtonProps) {
  if (disabled) return null;
  return <Button onClick={onClick}>Add</Button>;
}
