import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Enforma, { Form, registerComponents, clearRegistry } from 'enforma';
import { DateTimePicker } from './DateTimePicker';

vi.mock('@mui/x-date-pickers', () => ({
  usePickerAdapter: () => ({ date: (v: string) => new Date(v) }),
  DateTimePicker: ({
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
      value instanceof Date ? value.toISOString().slice(0, 16) : '',
    );
    return (
      <div>
        <input
          data-testid="datetime-picker-input"
          disabled={disabled}
          value={raw}
          onChange={(e) => {
            const newRaw = e.target.value;
            setRaw(newRaw);
            slotProps?.textField?.onChange?.(e);
            if (newRaw === '') {
              onChange(null);
            } else {
              const d = new Date(newRaw);
              onChange(isNaN(d.getTime()) ? null : d);
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
  registerComponents({ DateTimePicker }, { dateAdapter: 'dayjs' });
});

describe('MUI DateTimePicker', () => {
  it('renders an input', async () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.DateTimePicker bind="dt" label="Date & Time" />
      </Form>,
    );
    expect(await screen.findByTestId('datetime-picker-input')).toBeInTheDocument();
  });

  it('displays empty string when value is undefined', async () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.DateTimePicker bind="dt" label="Date & Time" />
      </Form>,
    );
    expect(await screen.findByTestId('datetime-picker-input')).toHaveValue('');
  });

  it('calls onChange with a Date when user enters valid datetime', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ dt: undefined }} onChange={onChange}>
        <Enforma.DateTimePicker bind="dt" label="Date & Time" />
      </Form>,
    );
    const input = await screen.findByTestId('datetime-picker-input');
    await userEvent.type(input, '2026-03-03T14:30');
    expect(onChange).toHaveBeenLastCalledWith(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expect.objectContaining({ dt: expect.any(Date) }),
      expect.anything(),
    );
  });

  it('calls onChange with undefined when cleared', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ dt: new Date('2026-03-03T14:30') }} onChange={onChange}>
        <Enforma.DateTimePicker bind="dt" label="Date & Time" />
      </Form>,
    );
    const input = await screen.findByTestId('datetime-picker-input');
    await userEvent.clear(input);
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ dt: undefined }),
      expect.anything(),
    );
  });

  it('calls onChange with string when user enters partial text', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ dt: undefined }} onChange={onChange}>
        <Enforma.DateTimePicker bind="dt" label="Date & Time" />
      </Form>,
    );
    const input = await screen.findByTestId('datetime-picker-input');
    await userEvent.type(input, 'bad');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ dt: 'bad' }),
      expect.anything(),
    );
  });

  it('shows validate() error after blur', async () => {
    render(
      <Form values={{ dt: undefined }} onChange={() => undefined}>
        <Enforma.DateTimePicker
          bind="dt"
          label="Date & Time"
          validate={(v) => (v === undefined ? 'Required' : null)}
        />
      </Form>,
    );
    const input = await screen.findByTestId('datetime-picker-input');
    input.focus();
    await userEvent.tab();
    expect(await screen.findByText('Required')).toBeInTheDocument();
  });
});
