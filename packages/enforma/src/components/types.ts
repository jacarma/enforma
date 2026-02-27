import type { FormValues } from '../store/FormStore';
import type { ReactNode } from 'react';
import type { DataSourceProp } from '../datasource/types';

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
export type SelectProps = CommonProps & {
  dataSource?: DataSourceProp<unknown>;
  children?: ReactNode;
};
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
  TextInput: ResolvedTextInputProps;
  Textarea: ResolvedTextareaProps;
  Select: ResolvedSelectProps;
  SelectOption: ResolvedSelectOptionProps;
  Checkbox: ResolvedCheckboxProps;
  Fieldset: ResolvedFieldsetProps;
  FormWrap: FormWrapProps;
  List: ResolvedListProps;
  ListItem: ResolvedListItemProps;
  FormModal: ResolvedFormModalProps;
  AddButton: ResolvedAddButtonProps;
};

export type ValidationState = {
  isValid: boolean;
  errors: Record<string, string | null>;
};

// Resolved types — what registered adapter components receive.
// Core dispatch calls hooks and passes these; adapters have no enforma imports.

export type ResolvedCommonProps = {
  value: unknown;
  setValue: (value: unknown) => void;
  label: string | undefined;
  disabled: boolean | undefined;
  placeholder: string | undefined;
  description: string | undefined;
  error: string | null;
  showError: boolean;
  onBlur: () => void;
};

export type ResolvedTextInputProps = Omit<ResolvedCommonProps, 'value' | 'setValue'> & {
  value: string | undefined;
  setValue: (value: string) => void;
};

export type ResolvedTextareaProps = ResolvedTextInputProps;

export type ResolvedCheckboxProps = Omit<ResolvedCommonProps, 'value' | 'setValue'> & {
  value: boolean | undefined;
  setValue: (value: boolean) => void;
};

export type ResolvedSelectProps = ResolvedCommonProps & {
  value: unknown;
  setValue: (value: unknown) => void;
  children: ReactNode;
  isLoading: boolean;
  dataSourceError: Error | null;
};

export type ResolvedSelectOptionProps = {
  value: unknown;
  label: string;
};

export type ResolvedFieldsetProps = {
  children: ReactNode;
  title?: string;
};

export type ResolvedListProps = {
  items: ReactNode[];
  addButton: ReactNode;
  modal: ReactNode;
  isEmpty: boolean;
  disabled: boolean;
};

export type ResolvedListItemProps = {
  item: FormValues;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  disabled: boolean;
  title: string;
  subtitle?: string;
  avatar?: string;
  showDeleteButton: boolean;
};

export type ResolvedFormModalProps = {
  open: boolean;
  mode: 'CREATE' | 'UPDATE' | 'DISPLAY';
  title: string;
  children: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  onDelete?: () => void;
};

export type ResolvedAddButtonProps = {
  onClick: () => void;
  disabled: boolean;
};
