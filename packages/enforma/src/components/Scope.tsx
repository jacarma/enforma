// packages/enforma/src/components/Scope.tsx
import { useContext, useMemo, type ReactNode } from 'react';
import { ScopeContext, childScope } from '../context/ScopeContext';

type ScopeProps = {
  bind: string;
  children: ReactNode;
};

export function Scope({ bind, children }: ScopeProps) {
  const parent = useContext(ScopeContext);
  if (parent === null) {
    throw new Error('<Enforma.Scope> must be used within <Enforma.Form>');
  }
  const scopeValue = useMemo(() => childScope(parent, bind), [parent, bind]);
  return <ScopeContext.Provider value={scopeValue}>{children}</ScopeContext.Provider>;
}
