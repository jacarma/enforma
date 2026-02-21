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
} from './components/types';
export type { EnformaComponentRegistry } from './components/registry';
export { useFormValue, useReactiveProp, useComponentProps } from './context/ScopeContext';
export { useFieldValidation } from './context/ScopeContext';
export { registerComponents } from './components/registry';
