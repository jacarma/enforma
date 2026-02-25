// packages/enforma/src/components/SelectOption.tsx
import type { FormValues } from '../store/FormStore';

export type SelectOptionProps<TItem = FormValues> = {
  label: string | ((item: TItem) => string);
  value: string | ((item: TItem) => unknown);
};

// Props are read externally by the adapter via React.Children — not used in the body.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function SelectOption(_: SelectOptionProps): null {
  return null;
}
