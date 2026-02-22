import { FormControl, FormControlProps } from '@mui/material';
import { ReactNode } from 'react';

export function ComponentWrap({
  error = false,
  children,
  component = 'div',
  margin = 'dense',
  disabled = false,
}: {
  error?: boolean;
  children: ReactNode;
  component?: FormControlProps['component'];
  margin?: FormControlProps['margin'];
  disabled?: boolean;
}) {
  return (
    <FormControl error={error} fullWidth margin={margin} component={component} disabled={disabled}>
      {children}
    </FormControl>
  );
}
