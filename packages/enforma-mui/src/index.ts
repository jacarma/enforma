import type { EnformaComponentRegistry } from 'enforma';
import { TextInput } from './components/TextInput';
import { Checkbox } from './components/Checkbox';
import { Switch } from './components/Switch';
import { NumberInput } from './components/NumberInput';
import { DatePicker } from './components/DatePicker';
import { TimePicker } from './components/TimePicker';
import { DateTimePicker } from './components/DateTimePicker';
import { Fieldset } from './components/Fieldset';
import { Select } from './components/Select';
import { SelectOption } from './components/SelectOption';
import { List } from './components/List';
import { ListItem } from './components/ListItem';
import { AddButton } from './components/AddButton';
import { FormModal } from './components/FormModal';
import { MuiFormWrap } from './components/MuiFormWrap';

const muiComponents = {
  TextInput,
  Checkbox,
  Switch,
  NumberInput,
  DatePicker,
  TimePicker,
  DateTimePicker,
  Fieldset,
  Select,
  SelectOption,
  List,
  ListItem,
  AddButton,
  FormModal,
  FormWrap: MuiFormWrap,
} satisfies Partial<EnformaComponentRegistry>;

export default muiComponents;

export {
  TextInput,
  Checkbox,
  Switch,
  NumberInput,
  DatePicker,
  TimePicker,
  DateTimePicker,
  Fieldset,
  Select,
  SelectOption,
  List,
  ListItem,
  AddButton,
  FormModal,
  MuiFormWrap,
};
export type { MuiVariant } from './context/MuiVariantContext';
