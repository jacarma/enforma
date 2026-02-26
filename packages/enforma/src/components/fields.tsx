import { memo } from 'react';
import { getComponent } from './registry';
import { SelectOption } from './SelectOption';
import {
  CheckboxProps,
  ComponentPropsMap,
  FieldsetProps,
  SelectProps,
  TextareaProps,
  TextInputProps,
} from './types';
import { useFieldProps } from '../hooks/useField';
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
  return dispatchComponent('Fieldset', { children: content, ...(title !== undefined && { title }) });
}

export const TextInput = memo(TextInputDispatch, stablePropsEqual);
export const Textarea = memo(TextareaDispatch, stablePropsEqual);
export const Checkbox = memo(CheckboxDispatch, stablePropsEqual);
export const Fieldset = memo(FieldsetDispatch, stablePropsEqual);

// Select is a temporary stub — will be properly updated in Task 5
export const Select = Object.assign(
  memo((props: SelectProps) => dispatchComponent('Select', props as never), stablePropsEqual),
  { Option: SelectOption },
);

export { SelectOption };
