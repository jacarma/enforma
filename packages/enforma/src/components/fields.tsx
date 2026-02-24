import { memo } from 'react';
import { getComponent } from './registry';
import {
  CheckboxProps,
  ComponentPropsMap,
  FieldsetProps,
  SelectProps,
  TextareaProps,
  TextInputProps,
} from './types';

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

export const TextInput = memo(
  (props: TextInputProps) => dispatchComponent('TextInput', props),
  stablePropsEqual,
);
export const Textarea = memo(
  (props: TextareaProps) => dispatchComponent('Textarea', props),
  stablePropsEqual,
);
export const Select = memo(
  (props: SelectProps) => dispatchComponent('Select', props),
  stablePropsEqual,
);
export const Checkbox = memo(
  (props: CheckboxProps) => dispatchComponent('Checkbox', props),
  stablePropsEqual,
);
export const Fieldset = memo(
  (props: FieldsetProps) => dispatchComponent('Fieldset', props),
  stablePropsEqual,
);
