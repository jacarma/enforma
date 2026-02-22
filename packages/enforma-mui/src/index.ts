import type { EnformaComponentRegistry } from 'enforma';
import { TextInput } from './components/TextInput';
import { Fieldset } from './components/Fieldset';
import { List } from './components/List';
import { ClassicProvider } from './context/ClassicProvider';
import { OutlinedProvider } from './context/OutlinedProvider';
import { StandardProvider } from './context/StandardProvider';

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

export { TextInput, Fieldset, List };
export { ClassicProvider, OutlinedProvider, StandardProvider };
export type { MuiVariant } from './context/MuiVariantContext';
