// packages/enforma/src/index.ts
import { Form } from './components/Form';
import * as components from './components/component-wrap';
import { Scope } from './components/Scope';
import { List } from './components/List';

const Enforma = { Form, ...components, Scope, List } as const;

export default Enforma;
export { Form };
export type { FormValues } from './store/FormStore';
export type {
  Reactive,
  CommonProps,
  TextInputProps,
  TextareaProps,
  SelectProps,
  CheckboxProps,
  ComponentPropsMap,
  ComponentProps,
  FieldsetProps,
  FormWrapProps,
} from './components/types';
export type { EnformaComponentRegistry } from './components/registry';
export {
  useFormValue,
  useReactiveProp,
  useComponentProps,
  useFieldValidation,
  ScopeContext,
  extendPrefix,
  type ScopeValue,
} from './context/ScopeContext';
export { registerComponents, getComponent, clearRegistry } from './components/registry';
export { useListState } from './hooks/useListState';
