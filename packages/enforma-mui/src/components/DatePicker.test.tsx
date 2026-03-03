import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Enforma, { Form, registerComponents, clearRegistry } from 'enforma';
import { DatePicker } from './DatePicker';

vi.mock('@mui/x-date-pickers', () => ({
  DatePicker: ({
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
      value instanceof Date ? value.toISOString().slice(0, 10) : '',
    );
    return (
      <div>
        <input
          data-testid="date-picker-input"
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
  registerComponents({ DatePicker });
});

describe('MUI DatePicker', () => {
  it('renders an input', async () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.DatePicker bind="date" label="Date" />
      </Form>,
    );
    expect(await screen.findByTestId('date-picker-input')).toBeInTheDocument();
  });

  it('displays empty string when form value is undefined', async () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.DatePicker bind="date" label="Date" />
      </Form>,
    );
    expect(await screen.findByTestId('date-picker-input')).toHaveValue('');
  });

  it('displays the date when form value is a Date', async () => {
    const d = new Date('2026-03-03');
    render(
      <Form values={{ date: d }} onChange={() => undefined}>
        <Enforma.DatePicker bind="date" label="Date" />
      </Form>,
    );
    expect(await screen.findByTestId('date-picker-input')).toHaveValue('2026-03-03');
  });

  it('calls onChange with a Date when user enters a valid date', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ date: undefined }} onChange={onChange}>
        <Enforma.DatePicker bind="date" label="Date" />
      </Form>,
    );
    const input = await screen.findByTestId('date-picker-input');
    await userEvent.type(input, '2026-03-03');
    expect(onChange).toHaveBeenLastCalledWith(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expect.objectContaining({ date: expect.any(Date) }),
      expect.anything(),
    );
  });

  it('calls onChange with undefined when user clears the field', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ date: new Date('2026-03-03') }} onChange={onChange}>
        <Enforma.DatePicker bind="date" label="Date" />
      </Form>,
    );
    const input = await screen.findByTestId('date-picker-input');
    await userEvent.clear(input);
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ date: undefined }),
      expect.anything(),
    );
  });

  it('calls onChange with a string when user enters invalid text', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ date: undefined }} onChange={onChange}>
        <Enforma.DatePicker bind="date" label="Date" />
      </Form>,
    );
    const input = await screen.findByTestId('date-picker-input');
    await userEvent.type(input, 'bad');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ date: 'bad' }),
      expect.anything(),
    );
  });

  it('is disabled when disabled prop is true', async () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.DatePicker bind="date" label="Date" disabled />
      </Form>,
    );
    expect(await screen.findByTestId('date-picker-input')).toBeDisabled();
  });

  it('shows validate() error after blur', async () => {
    render(
      <Form values={{ date: undefined }} onChange={() => undefined}>
        <Enforma.DatePicker
          bind="date"
          label="Date"
          validate={(v) => (v === undefined ? 'Date is required' : null)}
        />
      </Form>,
    );
    const input = await screen.findByTestId('date-picker-input');
    input.focus();
    await userEvent.tab();
    expect(await screen.findByText('Date is required')).toBeInTheDocument();
  });

  it('does not show error before blur', async () => {
    render(
      <Form values={{ date: undefined }} onChange={() => undefined}>
        <Enforma.DatePicker
          bind="date"
          label="Date"
          validate={(v) => (v === undefined ? 'Date is required' : null)}
        />
      </Form>,
    );
    await screen.findByTestId('date-picker-input');
    expect(screen.queryByText('Date is required')).not.toBeInTheDocument();
  });

  it('reveals errors on submit', async () => {
    render(
      <Form values={{ date: undefined }} onChange={() => undefined}>
        <Enforma.DatePicker
          bind="date"
          label="Date"
          validate={(v) => (v === undefined ? 'Date is required' : null)}
        />
        <button type="submit">Submit</button>
      </Form>,
    );
    await screen.findByTestId('date-picker-input');
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByText('Date is required')).toBeInTheDocument();
  });

  it('reports isValid=false when value is a string', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ date: '03/03/' }} onChange={onChange}>
        <Enforma.DatePicker bind="date" label="Date" />
      </Form>,
    );
    await screen.findByTestId('date-picker-input');
    expect(onChange).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ isValid: false }),
    );
  });

  it('throws a clear error when @mui/x-date-pickers is not installed', async () => {
    vi.resetModules();
    vi.doMock('@mui/x-date-pickers', () => {
      throw new Error("Cannot find module '@mui/x-date-pickers'");
    });

    const { DatePicker: FreshDatePicker } = await import('./DatePicker');

    const errors: Error[] = [];
    class ErrorBoundary extends React.Component<
      { children: React.ReactNode },
      { error: Error | null }
    > {
      state = { error: null as Error | null };
      static getDerivedStateFromError(error: Error) {
        return { error };
      }
      componentDidCatch(error: Error) {
        errors.push(error);
      }
      render() {
        if (this.state.error !== null) return null;
        return this.props.children;
      }
    }

    render(
      <ErrorBoundary>
        <FreshDatePicker
          value={undefined}
          setValue={() => undefined}
          label="Date"
          disabled={false}
          placeholder={undefined}
          description={undefined}
          error={null}
          showError={false}
          onBlur={() => undefined}
        />
      </ErrorBoundary>,
    );

    await waitFor(() => {
      expect(errors[0]?.message).toMatch('@mui/x-date-pickers');
    });
  });
});
