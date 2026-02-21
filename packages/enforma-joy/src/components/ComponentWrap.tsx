import Box from '@mui/joy/Box';
import { ReactNode } from 'react';

export function ComponentWrap({ children }: { children: ReactNode }) {
  return <Box sx={{ mb: '12px' }}>{children}</Box>;
}
