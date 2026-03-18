import { Button } from '@mui/material';
import type { ResolvedSubmitProps } from 'enforma';
import { ComponentWrap } from './ComponentWrap.js';

export function Submit({ children, disabled }: ResolvedSubmitProps) {
  return (
    <ComponentWrap>
      <Button type="submit" variant="contained" disabled={disabled ?? false}>
        {children}
      </Button>
    </ComponentWrap>
  );
}
