// packages/enforma/src/index.ts
import { Form } from './components/Form';
import * as fields from './components/fields';
import { Scope } from './components/Scope';
import { List } from './components/List';

const Enforma = { Form, ...fields, Scope, List } as const;

export default Enforma;
export { Form, Scope, List };
export type { FormValues } from './store/FormStore';
export type {
  Reactive,
  CommonProps,
  TextInputProps,
  TextareaProps,
  SelectProps,
  CheckboxProps,
  SwitchProps,
  NumberInputProps,
  DatePickerProps,
  TimePickerProps,
  DateTimePickerProps,
  ComponentPropsMap,
  FieldsetProps,
  FormWrapProps,
  ValidationState,
  ToComponentProps,
  FieldResolved,
} from './components/types';
export type { EnformaComponentRegistry, RegisterOptions } from './components/registry';
export type { FormSettings } from './context/FormSettingsContext';
export { ScopeContext, childScope, useScope, type ScopeValue } from './context/ScopeContext';
export { useFormValue, useReactiveProp, useFieldProps, useFieldValidation } from './hooks/useField';
export { registerComponents, clearRegistry, getRegistryOptions } from './components/registry';
export { useListState } from './hooks/useListState';
export { useDataSource } from './hooks/useDataSource';
export { SelectOption } from './components/SelectOption';
export { RadioGroupOption } from './components/RadioGroupOption';
export type { RadioGroupOptionProps } from './components/RadioGroupOption';
export { AutocompleteOption } from './components/AutocompleteOption';
export type { AutocompleteOptionProps } from './components/AutocompleteOption';
export { ExclusiveToggleOption } from './components/ExclusiveToggleOption';
export type { ExclusiveToggleOptionProps } from './components/ExclusiveToggleOption';
export { ListItemSlot } from './components/ListItemSlot';
export type { ListItemSlotProps } from './components/ListItemSlot';
export { ListFormSlot } from './components/ListFormSlot';
export type { ListFormSlotProps, ListFormSlotMode } from './components/ListFormSlot';
export type {
  DataSourceDefinition,
  DataSourceParams,
  DataSourceProp,
  DataSourceResult,
} from './datasource/types';
export type { SelectOptionProps } from './components/SelectOption';
export type {
  ResolvedCommonProps,
  ResolvedTextInputProps,
  ResolvedTextareaProps,
  ResolvedCheckboxProps,
  ResolvedSwitchProps,
  ResolvedNumberInputProps,
  ResolvedDatePickerProps,
  ResolvedTimePickerProps,
  ResolvedDateTimePickerProps,
  ResolvedSelectProps,
  ResolvedSelectOptionProps,
  ResolvedFieldsetProps,
  ResolvedListProps,
  ResolvedListItemProps,
  ResolvedFormModalProps,
  ResolvedAddButtonProps,
  RadioGroupProps,
  ResolvedRadioGroupProps,
  ResolvedRadioGroupOptionProps,
  AutocompleteProps,
  ResolvedAutocompleteProps,
  ResolvedAutocompleteOptionProps,
  ExclusiveToggleProps,
  ResolvedExclusiveToggleProps,
  ResolvedExclusiveToggleOptionProps,
  CalculatedProps,
  ResolvedCalculatedProps,
  OutputProps,
  ResolvedOutputProps,
} from './components/types';
