import type React from 'react';
import { ComponentPropsMap } from './types';

export type EnformaComponentRegistry = {
  [K in keyof ComponentPropsMap]?: React.ComponentType<ComponentPropsMap[K]>;
};

export type RegisterOptions = {
  variant?: 'classic' | 'outlined' | 'standard';
  dateAdapter?: 'dayjs' | 'date-fns' | 'luxon' | 'moment';
};

let registry: Partial<EnformaComponentRegistry> = {};
let options: RegisterOptions = {};

export function registerComponents(
  components: Partial<EnformaComponentRegistry>,
  opts?: RegisterOptions,
) {
  registry = { ...registry, ...components };
  if (opts !== undefined) {
    options = { ...options, ...opts };
  }
}

export function getComponent<K extends keyof ComponentPropsMap>(
  type: K,
): React.ComponentType<ComponentPropsMap[K]> | undefined {
  return registry[type];
}

export function getRegistryOptions(): RegisterOptions {
  return options;
}

export function clearRegistry() {
  registry = {};
  options = {};
}
