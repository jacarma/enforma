import { getComponent } from './registry';
import {
  CheckboxProps,
  ComponentPropsMap,
  FieldsetProps,
  SelectProps,
  TextareaProps,
  TextInputProps,
} from './types';

function InputWrapper<K extends keyof ComponentPropsMap>(
  componentType: K,
  props: ComponentPropsMap[K],
) {
  const Impl = getComponent(componentType);
  if (!Impl) {
    throw new Error(`Enforma: component "${componentType}" is not registered.`);
  }
  return <Impl {...props} />;
}

export const TextInput = (props: TextInputProps) => InputWrapper('TextInput', props);
export const Textarea = (props: TextareaProps) => InputWrapper('Textarea', props);
export const Select = (props: SelectProps) => InputWrapper('Select', props);
export const Checkbox = (props: CheckboxProps) => InputWrapper('Checkbox', props);
export const Fieldset = (props: FieldsetProps) => InputWrapper('Fieldset', props);
