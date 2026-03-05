// packages/enforma/src/components/AutocompleteOption.tsx
import type { FormValues } from '../store/FormStore';

export type AutocompleteOptionProps<TItem = FormValues> = {
  label: string | ((item: TItem) => string);
  value: string | ((item: TItem) => unknown);
};

// Props are read externally by the adapter via React.Children — not used in the body.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function AutocompleteOption(_: AutocompleteOptionProps): null {
  return null;
}
