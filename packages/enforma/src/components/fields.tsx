import { getComponent } from './registry';
import {
  CheckboxProps,
  ComponentPropsMap,
  FieldsetProps,
  SelectProps,
  TextareaProps,
  TextInputProps,
} from './types';

function dispatchComponent<K extends keyof ComponentPropsMap>(
  componentType: K,
  props: ComponentPropsMap[K],
) {
  const Impl = getComponent(componentType);
  if (!Impl) {
    throw new Error(`Enforma: component "${componentType}" is not registered.`);
  }
  return <Impl {...props} />;
}

export const TextInput = (props: TextInputProps) => dispatchComponent('TextInput', props);
export const Textarea = (props: TextareaProps) => dispatchComponent('Textarea', props);
export const Select = (props: SelectProps) => dispatchComponent('Select', props);
export const Checkbox = (props: CheckboxProps) => dispatchComponent('Checkbox', props);
export const Fieldset = (props: FieldsetProps) => dispatchComponent('Fieldset', props);
