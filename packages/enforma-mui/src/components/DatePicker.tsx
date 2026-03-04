import { lazy, Suspense, useContext, useId, useRef } from 'react';
import { FormLabel, TextField } from '@mui/material';
import { getRegistryOptions } from 'enforma';
import type { ResolvedDatePickerProps } from 'enforma';
import { ComponentWrap } from './ComponentWrap';
import { MuiVariantContext } from '../context/MuiVariantContext';

function DatePickerSkeleton({
  label,
  disabled = false,
  description,
  error,
  showError,
  onBlur,
  value,
}: ResolvedDatePickerProps) {
  const variant = useContext(MuiVariantContext);
  const id = useId();
  const displayValue =
    value instanceof Date ? value.toLocaleDateString() : typeof value === 'string' ? value : '';

  const commonProps = {
    value: displayValue,
    onChange: () => undefined,
    onBlur,
    disabled: true,
    fullWidth: true,
    error: showError,
    helperText: showError ? error : description,
  } as const;

  if (variant === 'classic') {
    return (
      <ComponentWrap error={showError} disabled={disabled}>
        {label !== undefined && <FormLabel htmlFor={id}>{label}</FormLabel>}
        <TextField
          {...commonProps}
          variant="outlined"
          size="small"
          slotProps={{ htmlInput: { id } }}
        />
      </ComponentWrap>
    );
  }
  return (
    <ComponentWrap error={showError} disabled={disabled}>
      <TextField {...commonProps} label={label} variant={variant} />
    </ComponentWrap>
  );
}

const LazyDatePicker = lazy(() =>
  import('@mui/x-date-pickers')
    .then(({ DatePicker: MuiDatePicker }) => {
      function DatePickerImpl({
        value,
        setValue,
        label,
        disabled = false,
        description,
        error,
        showError,
        onBlur,
        minDate,
        maxDate,
        disableFuture,
        disablePast,
      }: ResolvedDatePickerProps) {
        if (!getRegistryOptions().dateAdapter) {
          throw new Error(
            "enforma-mui: DatePicker requires a date adapter. Pass { dateAdapter: 'dayjs'|'date-fns'|'luxon'|'moment' } to " +
              'registerComponents() and install the adapter:\n' +
              '  pnpm add @mui/x-date-pickers dayjs|date-fns|luxon|moment',
          );
        }
        const rawInputRef = useRef('');
        const dateValue = value instanceof Date ? value : null;

        return (
          <ComponentWrap error={showError} disabled={disabled}>
            <MuiDatePicker
              value={dateValue}
              label={label}
              disabled={disabled}
              {...(minDate !== undefined && { minDate })}
              {...(maxDate !== undefined && { maxDate })}
              {...(disableFuture !== undefined && { disableFuture })}
              {...(disablePast !== undefined && { disablePast })}
              onChange={(date) => {
                if (date instanceof Date && !isNaN(date.getTime())) {
                  setValue(date);
                } else if (rawInputRef.current === '') {
                  setValue(undefined);
                } else {
                  setValue(rawInputRef.current);
                }
              }}
              slotProps={{
                textField: {
                  error: showError,
                  helperText: showError ? error : description,
                  fullWidth: true,
                  onBlur,
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                    rawInputRef.current = e.target.value;
                  },
                },
              }}
            />
          </ComponentWrap>
        );
      }
      DatePickerImpl.displayName = 'DatePicker';
      return { default: DatePickerImpl };
    })
    .catch(() => {
      throw new Error(
        'enforma-mui: DatePicker requires `@mui/x-date-pickers`. Run: pnpm add @mui/x-date-pickers dayjs|date-fns|luxon|moment',
      );
    }),
);

export function DatePicker(props: ResolvedDatePickerProps) {
  return (
    <Suspense fallback={<DatePickerSkeleton {...props} />}>
      <LazyDatePicker {...props} />
    </Suspense>
  );
}
