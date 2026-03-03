import type { FormValues } from '../store/FormStore';
import type { ReactNode } from 'react';
import type { DataSourceProp } from '../datasource/types';

export type Reactive<T> = T | ((scopeValues: FormValues, allValues: FormValues) => T);

// Maps a resolved type back to its component props type.
// Extra keys (beyond ResolvedCommonProps) become optional Reactive<...> props.
// Used to constrain and type-check useFieldProps<R> call sites.
export type ToComponentProps<R extends { value: unknown; setValue: (v: never) => void }> =
  CommonProps & {
    [K in Exclude<keyof R, keyof ResolvedCommonProps>]?: Reactive<NonNullable<R[K]>>;
  };

// Convenience type for custom component authors who want a typed value
// without defining a full resolved type. Replaces the old useFieldProps<T> pattern.
// Usage: useFieldProps<FieldResolved<number>>(props)
export type FieldResolved<T> = Omit<ResolvedCommonProps, 'value' | 'setValue'> & {
  value: T | undefined;
  setValue: (value: T) => void;
};

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

export type TextInputProps = CommonProps & {
  mask?: Reactive<string | RegExp>;
};
export type TextareaProps = CommonProps;
export type SelectProps = CommonProps & {
  dataSource?: DataSourceProp<unknown>;
  children?: ReactNode;
};
export type CheckboxProps = CommonProps & {
  labelPlacement?: Reactive<'end' | 'start' | 'top' | 'bottom'>;
};
export type SwitchProps = CheckboxProps;

export type NumberInputProps = CommonProps & {
  decimalScale?: Reactive<number>;
  decimalSeparator?: Reactive<'intl' | (string & Record<never, never>)>;
  thousandSeparator?: Reactive<false | 'intl' | (string & Record<never, never>)>;
  allowNegative?: Reactive<boolean>;
  min?: Reactive<number>;
  max?: Reactive<number>;
};

export type DatePickerProps = CommonProps & {
  minDate?: Reactive<Date>;
  maxDate?: Reactive<Date>;
  disableFuture?: Reactive<boolean>;
  disablePast?: Reactive<boolean>;
};

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
  Switch: ResolvedSwitchProps;
  NumberInput: ResolvedNumberInputProps;
  Fieldset: ResolvedFieldsetProps;
  FormWrap: FormWrapProps;
  List: ResolvedListProps;
  ListItem: ResolvedListItemProps;
  FormModal: ResolvedFormModalProps;
  AddButton: ResolvedAddButtonProps;
  DatePicker: ResolvedDatePickerProps;
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
  mask?: string | RegExp;
};

export type ResolvedTextareaProps = ResolvedTextInputProps;

export type ResolvedCheckboxProps = Omit<ResolvedCommonProps, 'value' | 'setValue'> & {
  value: boolean | undefined;
  setValue: (value: boolean) => void;
  labelPlacement?: 'end' | 'start' | 'top' | 'bottom';
};
export type ResolvedSwitchProps = ResolvedCheckboxProps;

export type ResolvedNumberInputProps = Omit<ResolvedCommonProps, 'value' | 'setValue'> & {
  value: number | undefined;
  setValue: (value: number | undefined) => void;
  decimalScale?: number;
  decimalSeparator?: 'intl' | (string & Record<never, never>);
  thousandSeparator?: false | 'intl' | (string & Record<never, never>);
  allowNegative?: boolean;
  min?: number;
  max?: number;
};

export type ResolvedDatePickerProps = Omit<ResolvedCommonProps, 'value' | 'setValue'> & {
  value: Date | string | undefined;
  setValue: (value: Date | string | undefined) => void;
  minDate?: Date;
  maxDate?: Date;
  disableFuture?: boolean;
  disablePast?: boolean;
};

export type ResolvedSelectProps = ResolvedCommonProps & {
  value: unknown;
  setValue: (value: unknown) => void;
  children: ReactNode;
  displayValue: string;
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
