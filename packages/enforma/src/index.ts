// packages/enforma/src/index.ts
import { Form } from './components/Form';
import * as components from './components/component-wrap';
import { Scope } from './components/Scope';
import { List } from './components/List';

const Enforma = { Form, ...components, Scope, List } as const;

export default Enforma;
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
} from './components/types';
export type { EnformaComponentRegistry } from './components/registry';
export {
  useFormValue,
  useReactiveProp,
  useComponentProps,
  ScopeContext,
  extendPrefix,
  type ScopeValue,
} from './context/ScopeContext';
export { useFieldValidation } from './context/ScopeContext';
export { registerComponents } from './components/registry';
