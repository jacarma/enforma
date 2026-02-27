import type { EnformaComponentRegistry } from 'enforma';
import { TextInput } from './components/TextInput';
import { Fieldset } from './components/Fieldset';
import { Select } from './components/Select';
import { List } from './components/List';
import { ListItem } from './components/ListItem';
import { AddButton } from './components/AddButton';
import { FormModal } from './components/FormModal';
import { ClassicProvider } from './context/ClassicProvider';
import { OutlinedProvider } from './context/OutlinedProvider';
import { StandardProvider } from './context/StandardProvider';

const listComponents = {
  List,
  ListItem,
  AddButton,
  FormModal,
} satisfies Partial<EnformaComponentRegistry>;

export const classic: Partial<EnformaComponentRegistry> = {
  TextInput,
  Select,
  Fieldset,
  FormWrap: ClassicProvider,
  ...listComponents,
};

export const outlined: Partial<EnformaComponentRegistry> = {
  TextInput,
  Select,
  Fieldset,
  FormWrap: OutlinedProvider,
  ...listComponents,
};

export const standard: Partial<EnformaComponentRegistry> = {
  TextInput,
  Select,
  Fieldset,
  FormWrap: StandardProvider,
  ...listComponents,
};

export { TextInput, Fieldset, Select, List, ListItem, AddButton, FormModal };
export { ClassicProvider, OutlinedProvider, StandardProvider };
export type { MuiVariant } from './context/MuiVariantContext';
