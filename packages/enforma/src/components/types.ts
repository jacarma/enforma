import type { FormValues } from '../store/FormStore';
import type { ReactNode } from 'react';

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

export type FieldsetProps = {
  bind?: string;
  children: ReactNode;
  title?: string;
};

export type FormWrapProps = {
  children: ReactNode;
};

export type ComponentPropsMap = {
  TextInput: TextInputProps;
  Textarea: TextareaProps;
  Select: SelectProps;
  Checkbox: CheckboxProps;
  Fieldset: FieldsetProps;
  FormWrap: FormWrapProps;
};

export type ValidationState = {
  isValid: boolean;
  errors: Record<string, string | null>;
};
