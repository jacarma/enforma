// apps/docs/src/test/mocks/mui-x-date-pickers.tsx
// Stub for @mui/x-date-pickers used in vitest to avoid ESM resolution issues
import React from 'react';

export const LocalizationProvider = ({
  children,
}: {
  children: React.ReactNode;
  dateAdapter?: unknown;
}) => <>{children}</>;

export const DatePicker = ({
  label,
  slotProps,
}: {
  label?: string;
  value?: unknown;
  onChange?: (v: unknown) => void;
  disabled?: boolean;
  disableFuture?: boolean;
  disablePast?: boolean;
  minDate?: unknown;
  maxDate?: unknown;
  slotProps?: { textField?: { id?: string; label?: string } };
}) => {
  const id = slotProps?.textField?.id ?? 'date-picker';
  const resolvedLabel = label ?? slotProps?.textField?.label ?? '';
  return (
    <div>
      <label htmlFor={id}>{resolvedLabel}</label>
      <input id={id} type="text" aria-label={resolvedLabel} defaultValue="" />
    </div>
  );
};

export const TimePicker = ({
  label,
  slotProps,
}: {
  label?: string;
  value?: unknown;
  onChange?: (v: unknown) => void;
  disabled?: boolean;
  ampm?: boolean;
  minTime?: unknown;
  maxTime?: unknown;
  slotProps?: { textField?: { id?: string; label?: string } };
}) => {
  const id = slotProps?.textField?.id ?? 'time-picker';
  const resolvedLabel = label ?? slotProps?.textField?.label ?? '';
  return (
    <div>
      <label htmlFor={id}>{resolvedLabel}</label>
      <input id={id} type="text" aria-label={resolvedLabel} defaultValue="" />
    </div>
  );
};

export const DateTimePicker = ({
  label,
  slotProps,
}: {
  label?: string;
  value?: unknown;
  onChange?: (v: unknown) => void;
  disabled?: boolean;
  disableFuture?: boolean;
  disablePast?: boolean;
  ampm?: boolean;
  minDate?: unknown;
  maxDate?: unknown;
  minTime?: unknown;
  maxTime?: unknown;
  slotProps?: { textField?: { id?: string; label?: string } };
}) => {
  const id = slotProps?.textField?.id ?? 'datetime-picker';
  const resolvedLabel = label ?? slotProps?.textField?.label ?? '';
  return (
    <div>
      <label htmlFor={id}>{resolvedLabel}</label>
      <input id={id} type="text" aria-label={resolvedLabel} defaultValue="" />
    </div>
  );
};

export const usePickerAdapter = () => ({ date: (v: string) => new Date(v) });
