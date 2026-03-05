// packages/enforma/src/components/ExclusiveToggleOption.tsx
import type { FormValues } from '../store/FormStore';

export type ExclusiveToggleOptionProps<TItem = FormValues> = {
  label: string | ((item: TItem) => string);
  value: string | ((item: TItem) => unknown);
};

// Props are read externally by the adapter via React.Children — not used in the body.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ExclusiveToggleOption(_: ExclusiveToggleOptionProps): null {
  return null;
}
