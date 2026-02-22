import { type ReactNode } from 'react';
import { MuiVariantContext } from './MuiVariantContext';

export function StandardProvider({ children }: { children: ReactNode }) {
  return <MuiVariantContext.Provider value="standard">{children}</MuiVariantContext.Provider>;
}
