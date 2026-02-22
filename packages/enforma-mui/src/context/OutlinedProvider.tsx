import { type ReactNode } from 'react';
import { MuiVariantContext } from './MuiVariantContext';

export function OutlinedProvider({ children }: { children: ReactNode }) {
  return <MuiVariantContext.Provider value="outlined">{children}</MuiVariantContext.Provider>;
}
