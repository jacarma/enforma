import { FormGroup, FormLabel } from '@mui/material';
import Enforma, { type FieldsetProps } from 'enforma';
import { ComponentWrap } from './ComponentWrap';

export function Fieldset({ bind, children, title }: FieldsetProps) {
  const content = bind ? <Enforma.Scope bind={bind}>{children}</Enforma.Scope> : children;

  return (
    <ComponentWrap component="fieldset" margin={title ? 'dense' : 'none'}>
      <FormLabel component="legend">{title}</FormLabel>
      <FormGroup>{content}</FormGroup>
    </ComponentWrap>
  );
}
