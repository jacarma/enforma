import { lazy, Suspense, useContext, useId, useRef } from 'react';
import { FormLabel, TextField } from '@mui/material';
import { getRegistryOptions } from 'enforma';
import type { ResolvedDatePickerProps } from 'enforma';
import { ComponentWrap } from './ComponentWrap';
import { MuiVariantContext } from '../context/MuiVariantContext';
import { toNativeDate } from '../utils/toNativeDate';

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

type UsePickerAdapter = () => { date: (v: string) => object };

const LazyDatePicker = lazy(() =>
  import('@mui/x-date-pickers')
    .then((mod) => {
      const { DatePicker: MuiDatePicker } = mod;
      const { usePickerAdapter } = mod as unknown as { usePickerAdapter: UsePickerAdapter };
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
        const adapter = usePickerAdapter();
        const rawInputRef = useRef('');
        const nativeDate = value instanceof Date ? value : null;
        // v8 requires the value in the adapter's native format (Dayjs, DateTime, Moment…)
        const adapterValue = nativeDate !== null ? adapter.date(nativeDate.toISOString()) : null;

        return (
          <ComponentWrap error={showError} disabled={disabled}>
            <MuiDatePicker
              value={adapterValue}
              label={label}
              disabled={disabled}
              {...(minDate !== undefined && { minDate })}
              {...(maxDate !== undefined && { maxDate })}
              {...(disableFuture !== undefined && { disableFuture })}
              {...(disablePast !== undefined && { disablePast })}
              onChange={(date) => {
                const jsDate = toNativeDate(date);
                if (jsDate !== null && !isNaN(jsDate.getTime())) {
                  setValue(jsDate);
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
