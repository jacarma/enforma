import { Box, Typography } from '@mui/joy';
import { type FieldsetProps, ScopeContext, type ScopeValue } from 'enforma';
import { useContext, type ReactNode } from 'react';
import { ComponentWrap } from './ComponentWrap';

export function Fieldset({ path, children, title }: FieldsetProps) {
  const parent = useContext(ScopeContext);

  let content: ReactNode = children;
  if (path && parent) {
    const scopeValue: ScopeValue = {
      store: parent.store,
      prefix: parent.prefix === '' ? path : `${parent.prefix}.${path}`,
    };
    content = <ScopeContext.Provider value={scopeValue}>{children}</ScopeContext.Provider>;
  }

  return (
    <ComponentWrap>
      <Box
        component="fieldset"
        border={title ? 1 : 0}
        marginInline={!title ? 0 : 'auto'}
        paddingInline={!title ? 0 : 'auto'}
        paddingBlock={!title ? 0 : 'auto'}
      >
        {title && <Typography component="legend">{title}</Typography>}
        {content}
      </Box>
    </ComponentWrap>
  );
}
