import { type ReactNode } from 'react';
import { MuiVariantContext } from './MuiVariantContext';

export function ClassicProvider({ children }: { children: ReactNode }) {
  return <MuiVariantContext.Provider value="classic">{children}</MuiVariantContext.Provider>;
}
