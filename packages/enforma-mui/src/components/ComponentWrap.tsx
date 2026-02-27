import { FormControl, FormControlProps } from '@mui/material';
import { ReactNode } from 'react';

export function ComponentWrap({
  error = false,
  children,
  component = 'div',
  margin = 'dense',
  disabled = false,
  variant,
}: {
  error?: boolean;
  children: ReactNode;
  component?: FormControlProps['component'];
  margin?: FormControlProps['margin'];
  disabled?: boolean;
  variant?: FormControlProps['variant'];
}) {
  return (
    <FormControl
      error={error}
      fullWidth
      margin={margin}
      component={component}
      disabled={disabled}
      {...(variant !== undefined ? { variant } : {})}
    >
      {children}
    </FormControl>
  );
}
