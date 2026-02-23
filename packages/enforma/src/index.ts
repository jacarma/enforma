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
export {
  useFormValue,
  useReactiveProp,
  useComponentProps,
  useFieldValidation,
  ScopeContext,
  childScope,
  type ScopeValue,
} from './context/ScopeContext';
export { registerComponents, clearRegistry } from './components/registry';
export { useListState } from './hooks/useListState';
