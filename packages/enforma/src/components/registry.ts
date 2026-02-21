import { ComponentPropsMap } from './types';

export type EnformaComponentRegistry = {
  [K in keyof ComponentPropsMap]?: React.ComponentType<ComponentPropsMap[K]>;
};

let registry: Partial<EnformaComponentRegistry> = {};

export function registerComponents(components: Partial<EnformaComponentRegistry>) {
  registry = {
    ...registry,
    ...components,
  };
}

export function getComponent<K extends keyof ComponentPropsMap>(
  type: K,
): React.ComponentType<ComponentPropsMap[K]> | undefined {
  return registry[type];
}
