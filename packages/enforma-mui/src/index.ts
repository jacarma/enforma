import type { EnformaComponentRegistry } from 'enforma';
import { TextInput } from './components/TextInput';
import { Fieldset } from './components/Fieldset';

const enformaMui: Partial<EnformaComponentRegistry> = {
  TextInput,
  Fieldset,
};

export default enformaMui;
