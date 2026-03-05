// packages/enforma-mui/src/components/AutocompleteOption.tsx
import { type ResolvedAutocompleteOptionProps } from 'enforma';

// MUI Autocomplete uses the flat options array, not pre-rendered children.
// This component is registered so the dispatch can render without error;
// the MUI Autocomplete adapter ignores children.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function AutocompleteOption(_: ResolvedAutocompleteOptionProps): null {
  return null;
}
