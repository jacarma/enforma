import type { EnformaComponentRegistry } from 'enforma';
import { Output } from './components/Output';
import { Calculated } from './components/Calculated';
import { TextInput } from './components/TextInput';
import { Textarea } from './components/Textarea';
import { Checkbox } from './components/Checkbox';
import { Switch } from './components/Switch';
import { NumberInput } from './components/NumberInput';
import { DatePicker } from './components/DatePicker';
import { TimePicker } from './components/TimePicker';
import { DateTimePicker } from './components/DateTimePicker';
import { Fieldset } from './components/Fieldset';
import { Select } from './components/Select';
import { SelectOption } from './components/SelectOption';
import { RadioGroup } from './components/RadioGroup';
import { RadioGroupOption } from './components/RadioGroupOption';
import { Autocomplete } from './components/Autocomplete';
import { AutocompleteOption } from './components/AutocompleteOption';
import { ExclusiveToggle } from './components/ExclusiveToggle';
import { ExclusiveToggleOption } from './components/ExclusiveToggleOption';
import { List } from './components/List';
import { ListItem } from './components/ListItem';
import { AddButton } from './components/AddButton';
import { FormModal } from './components/FormModal';
import { MuiFormWrap } from './components/MuiFormWrap';
import { Submit } from './components/Submit';

const muiComponents = {
  Output,
  Calculated,
  TextInput,
  Textarea,
  Checkbox,
  Switch,
  NumberInput,
  DatePicker,
  TimePicker,
  DateTimePicker,
  Fieldset,
  Select,
  SelectOption,
  RadioGroup,
  RadioGroupOption,
  Autocomplete,
  AutocompleteOption,
  ExclusiveToggle,
  ExclusiveToggleOption,
  List,
  ListItem,
  AddButton,
  FormModal,
  FormWrap: MuiFormWrap,
  Submit,
} satisfies Partial<EnformaComponentRegistry>;

export default muiComponents;

export {
  Output,
  Calculated,
  TextInput,
  Textarea,
  Checkbox,
  Switch,
  NumberInput,
  DatePicker,
  TimePicker,
  DateTimePicker,
  Fieldset,
  Select,
  SelectOption,
  RadioGroup,
  RadioGroupOption,
  Autocomplete,
  AutocompleteOption,
  ExclusiveToggle,
  ExclusiveToggleOption,
  List,
  ListItem,
  AddButton,
  FormModal,
  MuiFormWrap,
  Submit,
};
export type { MuiVariant } from './context/MuiVariantContext';
