import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Enforma, { Form, registerComponents, clearRegistry } from 'enforma';
import { TimePicker } from './TimePicker';

vi.mock('@mui/x-date-pickers', () => ({
  usePickerAdapter: () => ({ date: (v: string) => new Date(v) }),
  TimePicker: ({
    onChange,
    value,
    disabled,
    slotProps,
  }: {
    onChange: (date: Date | null) => void;
    value: Date | null;
    disabled?: boolean;
    slotProps?: {
      textField?: {
        onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
        onBlur?: () => void;
        helperText?: React.ReactNode;
        error?: boolean;
      };
    };
  }) => {
    const [raw, setRaw] = React.useState(
      value instanceof Date
        ? `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`
        : '',
    );
    return (
      <div>
        <input
          data-testid="time-picker-input"
          disabled={disabled}
          value={raw}
          onChange={(e) => {
            const newRaw = e.target.value;
            setRaw(newRaw);
            slotProps?.textField?.onChange?.(e);
            if (newRaw === '') {
              onChange(null);
            } else if (/^\d{1,2}:\d{2}$/.test(newRaw)) {
              const parts = newRaw.split(':');
              const d = new Date();
              d.setHours(Number(parts[0]), Number(parts[1]), 0, 0);
              onChange(isNaN(d.getTime()) ? null : d);
            } else {
              onChange(null);
            }
          }}
          onBlur={slotProps?.textField?.onBlur}
        />
        {slotProps?.textField?.helperText}
      </div>
    );
  },
}));

beforeEach(() => {
  clearRegistry();
  registerComponents({ TimePicker }, { dateAdapter: 'dayjs' });
});

describe('MUI TimePicker', () => {
  it('renders an input', async () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.TimePicker bind="time" label="Time" />
      </Form>,
    );
    expect(await screen.findByTestId('time-picker-input')).toBeInTheDocument();
  });

  it('displays empty string when value is undefined', async () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.TimePicker bind="time" label="Time" />
      </Form>,
    );
    expect(await screen.findByTestId('time-picker-input')).toHaveValue('');
  });

  it('displays HH:mm when value is a valid time string', async () => {
    render(
      <Form values={{ time: '14:30' }} onChange={() => undefined}>
        <Enforma.TimePicker bind="time" label="Time" />
      </Form>,
    );
    expect(await screen.findByTestId('time-picker-input')).toHaveValue('14:30');
  });

  it('calls onChange with HH:mm string when user enters valid time', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ time: undefined }} onChange={onChange}>
        <Enforma.TimePicker bind="time" label="Time" />
      </Form>,
    );
    const input = await screen.findByTestId('time-picker-input');
    await userEvent.type(input, '09:00');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ values: { time: '09:00' } }),
    );
  });

  it('calls onChange with undefined when user clears the field', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ time: '14:30' }} onChange={onChange}>
        <Enforma.TimePicker bind="time" label="Time" />
      </Form>,
    );
    const input = await screen.findByTestId('time-picker-input');
    await userEvent.clear(input);
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ values: { time: undefined } }),
    );
  });

  it('calls onChange with a partial string when user enters incomplete time', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ time: undefined }} onChange={onChange}>
        <Enforma.TimePicker bind="time" label="Time" />
      </Form>,
    );
    const input = await screen.findByTestId('time-picker-input');
    await userEvent.type(input, '14:');
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ values: { time: '14:' } }));
  });

  it('is disabled when disabled prop is true', async () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.TimePicker bind="time" label="Time" disabled />
      </Form>,
    );
    expect(await screen.findByTestId('time-picker-input')).toBeDisabled();
  });

  it('shows validate() error after blur', async () => {
    render(
      <Form values={{ time: undefined }} onChange={() => undefined}>
        <Enforma.TimePicker
          bind="time"
          label="Time"
          validate={(v) => (v === undefined ? 'Time is required' : null)}
        />
      </Form>,
    );
    const input = await screen.findByTestId('time-picker-input');
    input.focus();
    await userEvent.tab();
    expect(await screen.findByText('Time is required')).toBeInTheDocument();
  });
});
