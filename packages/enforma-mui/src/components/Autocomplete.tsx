// packages/enforma-mui/src/components/Autocomplete.tsx
import {
  CircularProgress,
  Autocomplete as MuiAutocomplete,
  TextField,
  type AutocompleteRenderInputParams,
  type TextFieldProps,
} from '@mui/material';
import { type ResolvedAutocompleteProps } from 'enforma';

type OptionItem = { value: unknown; label: string };

function renderTextField(
  params: AutocompleteRenderInputParams,
  label: string | undefined,
  showError: boolean,
  error: string | null,
  dataSourceError: Error | null,
  isLoading: boolean,
) {
  const { InputProps, ...restParams } = params;
  return (
    <TextField
      {...(restParams as TextFieldProps)}
      label={label}
      error={showError}
      helperText={showError ? (dataSourceError?.message ?? error) : undefined}
      margin="dense"
      slotProps={{
        input: {
          ...InputProps,
          endAdornment: (
            <>
              {isLoading && <CircularProgress size={20} />}
              {InputProps.endAdornment}
            </>
          ),
        },
      }}
    />
  );
}

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
  onInputChange,
  disableClientFilter,
}: ResolvedAutocompleteProps) {
  const currentOption = options.find((opt) => opt.value === value) ?? null;

  return (
    <MuiAutocomplete<OptionItem>
      options={options as OptionItem[]}
      value={currentOption}
      onChange={(_, selected) => {
        setValue(selected?.value ?? undefined);
      }}
      onInputChange={(_, newValue, reason) => {
        // 'reset' fires after a selection — ignore it so inputValue only tracks user typing.
        // If we let 'reset' through, selecting an option triggers a query with the option
        // label as search text, which can change filtersKey and incorrectly auto-clear the field.
        if (reason !== 'reset') onInputChange(newValue);
      }}
      {...(disableClientFilter && { filterOptions: (x) => x })}
      getOptionLabel={(opt) => opt.label}
      isOptionEqualToValue={(opt, val) => opt.value === val.value}
      disabled={disabled}
      onBlur={onBlur}
      fullWidth
      renderInput={(params) =>
        renderTextField(params, label, showError, error, dataSourceError, isLoading)
      }
    />
  );
}
