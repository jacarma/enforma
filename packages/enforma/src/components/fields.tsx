import { memo } from 'react';
import React from 'react';
import { getComponent } from './registry';
import { SelectOption } from './SelectOption';
import type { SelectOptionProps } from './SelectOption';
import {
  CheckboxProps,
  ComponentPropsMap,
  FieldsetProps,
  SelectProps,
  TextareaProps,
  TextInputProps,
} from './types';
import { useFieldProps } from '../hooks/useField';
import { useDataSource } from '../hooks/useDataSource';
import { Scope } from './Scope';

function isEmptyRef(v: unknown): boolean {
  if (Array.isArray(v)) return v.length === 0;
  if (v !== null && typeof v === 'object') return Object.keys(v).length === 0;
  return false;
}

function stablePropsEqual<P extends object>(prev: P, next: P): boolean {
  const prevKeys = Object.keys(prev);
  const nextKeys = Object.keys(next);
  if (prevKeys.length !== nextKeys.length) return false;
  for (const key of nextKeys) {
    const p = prev[key as keyof P];
    const n = next[key as keyof P];
    if (typeof p === 'function' && typeof n === 'function') continue;
    if (isEmptyRef(p) && isEmptyRef(n) && Array.isArray(p) === Array.isArray(n)) continue;
    if (!Object.is(p, n)) return false;
  }
  return true;
}

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

function TextInputDispatch(props: TextInputProps) {
  const resolved = useFieldProps<string>(props);
  return dispatchComponent('TextInput', resolved);
}

function TextareaDispatch(props: TextareaProps) {
  const resolved = useFieldProps<string>(props);
  return dispatchComponent('Textarea', resolved);
}

function CheckboxDispatch(props: CheckboxProps) {
  const resolved = useFieldProps<boolean>(props);
  return dispatchComponent('Checkbox', resolved);
}

function FieldsetDispatch({ bind, children, title }: FieldsetProps) {
  const content = bind !== undefined ? <Scope bind={bind}>{children}</Scope> : children;
  return dispatchComponent('Fieldset', {
    children: content,
    ...(title !== undefined && { title }),
  });
}

function buildSelectOptions(
  items: unknown[],
  children: React.ReactNode,
): { value: unknown; label: string }[] {
  const childOptions: { value: unknown; label: unknown }[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    const props = child.props as SelectOptionProps;
    childOptions.push({ value: props.value, label: props.label });
  });

  // Single SelectOption with string fields + datasource items → field-name mapping template
  if (items.length > 0 && childOptions.length === 1) {
    const template = childOptions[0];
    if (
      template !== undefined &&
      typeof template.label === 'string' &&
      typeof template.value === 'string'
    ) {
      const labelKey = template.label;
      const valueKey = template.value;
      return items.map((item) => {
        if (typeof item === 'object' && item !== null) {
          const obj = item as Record<string, unknown>;
          const lv = obj[labelKey];
          const label =
            typeof lv === 'string' || typeof lv === 'number' || typeof lv === 'boolean'
              ? String(lv)
              : '';
          return { value: obj[valueKey], label };
        }
        return { value: item, label: String(item) };
      });
    }
  }

  // Inline literal children
  if (childOptions.length > 0) {
    return childOptions.map((opt) => ({ value: opt.value, label: String(opt.label) }));
  }

  // No children: map items directly, expecting { value, label } shape
  return items.map((item) => {
    if (typeof item === 'object' && item !== null && 'value' in item && 'label' in item) {
      return {
        value: (item as { value: unknown }).value,
        label: String((item as { label: unknown }).label),
      };
    }
    return { value: item, label: String(item) };
  });
}

function SelectDispatch(props: SelectProps) {
  const resolved = useFieldProps<unknown>(props);
  const {
    items,
    isLoading,
    error: dataSourceError,
  } = useDataSource(props.dataSource, {
    bind: props.bind,
  });
  const options = buildSelectOptions(items, props.children);
  const SelectOptionImpl = getComponent('SelectOption');
  if (!SelectOptionImpl) {
    throw new Error('Enforma: component "SelectOption" is not registered.');
  }
  const renderedOptions = options.map((opt) => (
    <SelectOptionImpl key={String(opt.value)} value={opt.value} label={opt.label} />
  ));
  return dispatchComponent('Select', {
    ...resolved,
    children: renderedOptions,
    isLoading,
    dataSourceError: dataSourceError ?? null,
  });
}

export const TextInput = memo(TextInputDispatch, stablePropsEqual);
export const Textarea = memo(TextareaDispatch, stablePropsEqual);
export const Checkbox = memo(CheckboxDispatch, stablePropsEqual);
export const Fieldset = memo(FieldsetDispatch, stablePropsEqual);
export const Select = Object.assign(memo(SelectDispatch, stablePropsEqual), {
  Option: SelectOption,
});

export { SelectOption };
