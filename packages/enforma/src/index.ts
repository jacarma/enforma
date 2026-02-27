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
  ComponentPropsMap,
  FieldsetProps,
  FormWrapProps,
  ValidationState,
} from './components/types';
export type { EnformaComponentRegistry } from './components/registry';
export type { FormSettings } from './context/FormSettingsContext';
export { ScopeContext, childScope, useScope, type ScopeValue } from './context/ScopeContext';
export { useFormValue, useReactiveProp, useFieldProps, useFieldValidation } from './hooks/useField';
export { registerComponents, clearRegistry } from './components/registry';
export { useListState } from './hooks/useListState';
export { useDataSource } from './hooks/useDataSource';
export { SelectOption } from './components/SelectOption';
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
  ResolvedSelectProps,
  ResolvedSelectOptionProps,
  ResolvedFieldsetProps,
  ResolvedListProps,
  ResolvedListItemProps,
  ResolvedFormModalProps,
  ResolvedAddButtonProps,
} from './components/types';
