import { FormGroup, FormLabel } from '@mui/material';
import { type ResolvedFieldsetProps } from 'enforma';
import { ComponentWrap } from './ComponentWrap';

export function Fieldset({ children, title }: ResolvedFieldsetProps) {
  return (
    <ComponentWrap component="fieldset" margin={title ? 'dense' : 'none'}>
      <FormLabel component="legend">{title}</FormLabel>
      <FormGroup>{children}</FormGroup>
    </ComponentWrap>
  );
}
