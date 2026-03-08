import { lazy, Suspense, useContext, useId, useRef } from 'react';
import { FormLabel, TextField } from '@mui/material';
import { getRegistryOptions } from 'enforma';
import type { ResolvedTimePickerProps } from 'enforma';
import { ComponentWrap } from './ComponentWrap';
import { MuiVariantContext } from '../context/MuiVariantContext';
import { toNativeDate } from '../utils/toNativeDate';

function timeToDate(hhmm: string): Date | null {
  const parts = hhmm.split(':');
  if (parts.length !== 2) return null;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (isNaN(h) || isNaN(m)) return null;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function dateToHHMM(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function TimePickerSkeleton({
  label,
  disabled = false,
  description,
  error,
  showError,
  onBlur,
  value,
}: ResolvedTimePickerProps) {
  const variant = useContext(MuiVariantContext);
  const id = useId();
  const displayValue = value ?? '';

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

const LazyTimePicker = lazy(() =>
  import('@mui/x-date-pickers')
    .then((mod) => {
      const { TimePicker: MuiTimePicker } = mod;
      const { usePickerAdapter } = mod as unknown as { usePickerAdapter: UsePickerAdapter };
      function TimePickerImpl({
        value,
        setValue,
        label,
        disabled = false,
        description,
        error,
        showError,
        onBlur,
        minTime,
        maxTime,
        ampm,
      }: ResolvedTimePickerProps) {
        if (!getRegistryOptions().dateAdapter) {
          throw new Error(
            "enforma-mui: TimePicker requires a date adapter. Pass { dateAdapter: 'dayjs'|'date-fns'|'luxon'|'moment' } to " +
              'registerComponents() and install the adapter:\n' +
              '  pnpm add @mui/x-date-pickers dayjs|date-fns|luxon|moment',
          );
        }
        const adapter = usePickerAdapter();
        const rawInputRef = useRef('');
        const nativeTime =
          typeof value === 'string' && /^\d{2}:\d{2}$/.test(value) ? timeToDate(value) : null;
        // v8 requires the value in the adapter's native format (Dayjs, DateTime, Moment…)
        const adapterValue = nativeTime !== null ? adapter.date(nativeTime.toISOString()) : null;

        return (
          <ComponentWrap error={showError} disabled={disabled}>
            <MuiTimePicker
              value={adapterValue}
              label={label}
              disabled={disabled}
              {...(minTime !== undefined && { minTime })}
              {...(maxTime !== undefined && { maxTime })}
              {...(ampm !== undefined && { ampm })}
              onChange={(date) => {
                const jsDate = toNativeDate(date);
                if (jsDate !== null && !isNaN(jsDate.getTime())) {
                  setValue(dateToHHMM(jsDate));
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
      TimePickerImpl.displayName = 'TimePicker';
      return { default: TimePickerImpl };
    })
    .catch(() => {
      throw new Error(
        'enforma-mui: TimePicker requires `@mui/x-date-pickers`. Run: pnpm add @mui/x-date-pickers dayjs|date-fns|luxon|moment',
      );
    }),
);

export function TimePicker(props: ResolvedTimePickerProps) {
  return (
    <Suspense fallback={<TimePickerSkeleton {...props} />}>
      <LazyTimePicker {...props} />
    </Suspense>
  );
}
