import { lazy, Suspense, useContext, useId, useRef } from 'react';
import { FormLabel, TextField } from '@mui/material';
import type { ResolvedDateTimePickerProps } from 'enforma';
import { ComponentWrap } from './ComponentWrap';
import { MuiVariantContext } from '../context/MuiVariantContext';

function DateTimePickerSkeleton({
  label,
  disabled = false,
  description,
  error,
  showError,
  onBlur,
  value,
}: ResolvedDateTimePickerProps) {
  const variant = useContext(MuiVariantContext);
  const id = useId();
  const displayValue =
    value instanceof Date ? value.toLocaleString() : typeof value === 'string' ? value : '';

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

const LazyDateTimePicker = lazy(() =>
  import('@mui/x-date-pickers')
    .then(({ DateTimePicker: MuiDateTimePicker }) => {
      function DateTimePickerImpl({
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
        ampm,
      }: ResolvedDateTimePickerProps) {
        const rawInputRef = useRef('');
        const dateValue = value instanceof Date ? value : null;

        return (
          <ComponentWrap error={showError} disabled={disabled}>
            <MuiDateTimePicker
              value={dateValue}
              label={label}
              disabled={disabled}
              {...(minDate !== undefined && { minDate })}
              {...(maxDate !== undefined && { maxDate })}
              {...(disableFuture !== undefined && { disableFuture })}
              {...(disablePast !== undefined && { disablePast })}
              {...(ampm !== undefined && { ampm })}
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
      DateTimePickerImpl.displayName = 'DateTimePicker';
      return { default: DateTimePickerImpl };
    })
    .catch(() => {
      throw new Error(
        'enforma-mui: DateTimePicker requires `@mui/x-date-pickers`. Run: pnpm add @mui/x-date-pickers dayjs',
      );
    }),
);

export function DateTimePicker(props: ResolvedDateTimePickerProps) {
  return (
    <Suspense fallback={<DateTimePickerSkeleton {...props} />}>
      <LazyDateTimePicker {...props} />
    </Suspense>
  );
}
