import { createContext } from 'react';

export type MuiVariant = 'classic' | 'outlined' | 'standard';

export const MuiVariantContext = createContext<MuiVariant>('outlined');
