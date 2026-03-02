import type { EnformaComponentRegistry } from 'enforma';
import { TextInput } from './components/TextInput';
import { Checkbox } from './components/Checkbox';
import { Switch } from './components/Switch';
import { NumberInput } from './components/NumberInput';
import { Fieldset } from './components/Fieldset';
import { Select } from './components/Select';
import { SelectOption } from './components/SelectOption';
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

const booleanComponents = { Checkbox, Switch } satisfies Partial<EnformaComponentRegistry>;

const numericComponents = { NumberInput } satisfies Partial<EnformaComponentRegistry>;

export const classic: Partial<EnformaComponentRegistry> = {
  TextInput,
  Select,
  SelectOption,
  Fieldset,
  FormWrap: ClassicProvider,
  ...listComponents,
  ...booleanComponents,
  ...numericComponents,
};

export const outlined: Partial<EnformaComponentRegistry> = {
  TextInput,
  Select,
  SelectOption,
  Fieldset,
  FormWrap: OutlinedProvider,
  ...listComponents,
  ...booleanComponents,
  ...numericComponents,
};

export const standard: Partial<EnformaComponentRegistry> = {
  TextInput,
  Select,
  SelectOption,
  Fieldset,
  FormWrap: StandardProvider,
  ...listComponents,
  ...booleanComponents,
  ...numericComponents,
};

export {
  TextInput,
  Checkbox,
  Switch,
  NumberInput,
  Fieldset,
  Select,
  SelectOption,
  List,
  ListItem,
  AddButton,
  FormModal,
};
export { ClassicProvider, OutlinedProvider, StandardProvider };
export type { MuiVariant } from './context/MuiVariantContext';
