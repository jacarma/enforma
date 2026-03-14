import { Button } from '@mui/material';
import type { ResolvedSubmitProps } from 'enforma';

export function Submit({ children, disabled }: ResolvedSubmitProps) {
  return (
    <Button type="submit" variant="contained" disabled={disabled ?? false}>
      {children}
    </Button>
  );
}
