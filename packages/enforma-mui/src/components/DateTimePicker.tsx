import { lazy, Suspense, useContext, useId, useRef } from 'react';
import { FormLabel, TextField } from '@mui/material';
import { getRegistryOptions } from 'enforma';
import type { ResolvedDateTimePickerProps } from 'enforma';
import { ComponentWrap } from './ComponentWrap';
import { MuiVariantContext } from '../context/MuiVariantContext';
import { toNativeDate } from '../utils/toNativeDate';

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

type UseLocalizationContext = () => { utils: { date: (v: string) => object } };

const LazyDateTimePicker = lazy(() =>
  import('@mui/x-date-pickers')
    .then((mod) => {
      const { DateTimePicker: MuiDateTimePicker } = mod;
      // useLocalizationContext is in the bundle at runtime but absent from types
      const { useLocalizationContext } = mod as unknown as {
        useLocalizationContext: UseLocalizationContext;
      };
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
        if (!getRegistryOptions().dateAdapter) {
          throw new Error(
            "enforma-mui: DateTimePicker requires a date adapter. Pass { dateAdapter: 'dayjs'|'date-fns'|'luxon'|'moment' } to " +
              'registerComponents() and install the adapter:\n' +
              '  pnpm add @mui/x-date-pickers dayjs|date-fns|luxon|moment',
          );
        }
        const { utils } = useLocalizationContext();
        const rawInputRef = useRef('');
        const nativeDate = value instanceof Date ? value : null;
        // v8 requires the value in the adapter's native format (Dayjs, DateTime, Moment…)
        const adapterValue = nativeDate !== null ? utils.date(nativeDate.toISOString()) : null;

        return (
          <ComponentWrap error={showError} disabled={disabled}>
            <MuiDateTimePicker
              value={adapterValue}
              label={label}
              disabled={disabled}
              {...(minDate !== undefined && { minDate })}
              {...(maxDate !== undefined && { maxDate })}
              {...(disableFuture !== undefined && { disableFuture })}
              {...(disablePast !== undefined && { disablePast })}
              {...(ampm !== undefined && { ampm })}
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
      DateTimePickerImpl.displayName = 'DateTimePicker';
      return { default: DateTimePickerImpl };
    })
    .catch(() => {
      throw new Error(
        'enforma-mui: DateTimePicker requires `@mui/x-date-pickers`. Run: pnpm add @mui/x-date-pickers dayjs|date-fns|luxon|moment',
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
