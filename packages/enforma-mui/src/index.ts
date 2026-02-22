import type { EnformaComponentRegistry } from 'enforma';
import { TextInput } from './components/TextInput';
import { Fieldset } from './components/Fieldset';
import { ClassicProvider } from './context/ClassicProvider';
import { OutlinedProvider } from './context/OutlinedProvider';
import { StandardProvider } from './context/StandardProvider';

// Pre-built bundles — pick one and pass to registerComponents
export const classic: Partial<EnformaComponentRegistry> = {
  TextInput,
  Fieldset,
  FormWrap: ClassicProvider,
};

export const outlined: Partial<EnformaComponentRegistry> = {
  TextInput,
  Fieldset,
  FormWrap: OutlinedProvider,
};

export const standard: Partial<EnformaComponentRegistry> = {
  TextInput,
  Fieldset,
  FormWrap: StandardProvider,
};

// Individual exports for mix-and-match / max tree-shaking
export { TextInput, Fieldset };
export { ClassicProvider, OutlinedProvider, StandardProvider };
export type { MuiVariant } from './context/MuiVariantContext';
