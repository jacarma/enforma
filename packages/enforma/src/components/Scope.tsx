// packages/enforma/src/components/Scope.tsx
import { useContext, type ReactNode } from 'react';
import { ScopeContext, extendPrefix } from '../context/ScopeContext';

type ScopeProps = {
  path: string;
  children: ReactNode;
};

export function Scope({ path, children }: ScopeProps) {
  const parent = useContext(ScopeContext);
  if (parent === null) {
    throw new Error('<Enforma.Scope> must be used within <Enforma.Form>');
  }
  const scopeValue = extendPrefix(parent, path);
  return <ScopeContext.Provider value={scopeValue}>{children}</ScopeContext.Provider>;
}
