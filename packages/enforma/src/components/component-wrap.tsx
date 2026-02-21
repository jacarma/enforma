// core/components/TextInput.tsx
import { getComponent } from './registry';
import {
  CheckboxProps,
  ComponentProps,
  ComponentPropsMap,
  SelectProps,
  TextareaProps,
  TextInputProps,
} from './types';

function InputWrapper(componentType: keyof ComponentPropsMap, props: ComponentProps) {
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
