// packages/enforma-mui/src/components/Autocomplete.tsx
import { CircularProgress, Autocomplete as MuiAutocomplete, TextField } from '@mui/material';
import { type ResolvedAutocompleteProps } from 'enforma';

type OptionItem = { value: unknown; label: string };

export function Autocomplete({
  value,
  setValue,
  label,
  disabled = false,
  error,
  showError,
  onBlur,
  options,
  isLoading,
  dataSourceError,
}: ResolvedAutocompleteProps) {
  const currentOption = options.find((opt) => opt.value === value) ?? null;

  if (isLoading) {
    return <CircularProgress size={20} />;
  }

  return (
    <MuiAutocomplete<OptionItem>
      options={options as OptionItem[]}
      value={currentOption}
      onChange={(_, selected) => {
        setValue(selected?.value ?? undefined);
      }}
      getOptionLabel={(opt) => opt.label}
      isOptionEqualToValue={(opt, val) => opt.value === val.value}
      disabled={disabled}
      onBlur={onBlur}
      fullWidth
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          error={showError}
          helperText={showError ? (dataSourceError?.message ?? error) : undefined}
          margin="dense"
        />
      )}
    />
  );
}
