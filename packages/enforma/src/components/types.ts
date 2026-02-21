import type { FormValues } from '../store/FormStore';

export type Reactive<T> = T | ((scopeValues: FormValues, allValues: FormValues) => T);

export type CommonProps = {
  bind: string;
  label?: Reactive<string>;
  disabled?: Reactive<boolean>;
  placeholder?: Reactive<string>;
  id?: string;
  description?: Reactive<string>;
  validate?: (value: unknown, scopeValues: FormValues, allValues: FormValues) => string | null;
  messages?: Partial<Record<string, string>>;
};

export type TextInputProps = CommonProps;
export type TextareaProps = CommonProps;
export type SelectProps = CommonProps;
export type CheckboxProps = CommonProps;

export type ComponentPropsMap = {
  TextInput: TextInputProps;
  Textarea: TextareaProps;
  Select: SelectProps;
  Checkbox: CheckboxProps;
};

export type ComponentProps = ComponentPropsMap[keyof ComponentPropsMap];
