import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Enforma, { Form, registerComponents, clearRegistry } from 'enforma';
import { NumberInput } from './NumberInput';

// ── Mock react-imask ──────────────────────────────────────────────────────────
// Simulates IMask's Number mask via the useIMask hook interface.
vi.mock('react-imask', () => ({
  useIMask(
    _maskOptions: unknown,
    { onAccept }: { onAccept?: (v: string, mask: { typedValue: number | null }) => void } = {},
  ) {
    const ref = React.useRef<HTMLInputElement | null>(null);
    const onAcceptRef = React.useRef(onAccept);
    React.useEffect(() => {
      onAcceptRef.current = onAccept;
    }, [onAccept]);

    const setValue = React.useCallback((v: string) => {
      if (ref.current) ref.current.value = v;
    }, []);

    React.useEffect(() => {
      const el = ref.current;
      if (!el) return;
      const handler = (e: Event) => {
        const raw = (e.target as HTMLInputElement).value;
        const parsed = parseFloat(raw);
        onAcceptRef.current?.(raw, { typedValue: isNaN(parsed) ? null : parsed });
      };
      el.addEventListener('input', handler);
      return () => {
        el.removeEventListener('input', handler);
      };
    });

    return { ref, setValue };
  },
}));

beforeEach(() => {
  clearRegistry();
  registerComponents({ NumberInput });
});

describe('MUI NumberInput', () => {
  it('renders an input accessible by label', async () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.NumberInput bind="price" label="Price" />
      </Form>,
    );
    expect(await screen.findByLabelText('Price')).toBeInTheDocument();
  });

  it('displays empty string when form value is undefined', async () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.NumberInput bind="price" label="Price" />
      </Form>,
    );
    expect(await screen.findByLabelText('Price')).toHaveValue('');
  });

  it('displays stringified value when form value is a number', async () => {
    render(
      <Form values={{ price: 42 }} onChange={() => undefined}>
        <Enforma.NumberInput bind="price" label="Price" />
      </Form>,
    );
    expect(await screen.findByLabelText('Price')).toHaveValue('42');
  });

  it('calls onChange with a number when user types', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ price: undefined }} onChange={onChange}>
        <Enforma.NumberInput bind="price" label="Price" />
      </Form>,
    );
    const input = await screen.findByLabelText('Price');
    await userEvent.type(input, '9');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ price: 9 }),
      expect.anything(),
    );
  });

  it('calls onChange with undefined when user clears the field', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ price: 5 }} onChange={onChange}>
        <Enforma.NumberInput bind="price" label="Price" />
      </Form>,
    );
    const input = await screen.findByLabelText('Price');
    await userEvent.clear(input);
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ price: undefined }),
      expect.anything(),
    );
  });

  it('is disabled when disabled prop is true', async () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.NumberInput bind="price" label="Price" disabled />
      </Form>,
    );
    expect(await screen.findByLabelText('Price')).toBeDisabled();
  });

  it('shows description when there is no error', async () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.NumberInput bind="price" label="Price" description="Enter amount in USD" />
      </Form>,
    );
    await screen.findByLabelText('Price');
    expect(screen.getByText('Enter amount in USD')).toBeInTheDocument();
  });

  it('shows user validate() error after blur', async () => {
    render(
      <Form values={{ price: undefined }} onChange={() => undefined}>
        <Enforma.NumberInput
          bind="price"
          label="Price"
          validate={(v) => (v === undefined ? 'Price is required' : null)}
        />
      </Form>,
    );
    const input = await screen.findByLabelText('Price');
    input.focus();
    await userEvent.tab();
    expect(await screen.findByText('Price is required')).toBeInTheDocument();
  });

  it('does not show error before blur', async () => {
    render(
      <Form values={{ price: undefined }} onChange={() => undefined}>
        <Enforma.NumberInput
          bind="price"
          label="Price"
          validate={(v) => (v === undefined ? 'Price is required' : null)}
        />
      </Form>,
    );
    await screen.findByLabelText('Price');
    expect(screen.queryByText('Price is required')).not.toBeInTheDocument();
  });

  it('reveals all errors on submit', async () => {
    render(
      <Form values={{ price: undefined }} onChange={() => undefined}>
        <Enforma.NumberInput
          bind="price"
          label="Price"
          validate={(v) => (v === undefined ? 'Price is required' : null)}
        />
        <button type="submit">Submit</button>
      </Form>,
    );
    await screen.findByLabelText('Price');
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByText('Price is required')).toBeInTheDocument();
  });

  it('reports isValid=false in onChange when field has an error', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ price: undefined }} onChange={onChange}>
        <Enforma.NumberInput
          bind="price"
          label="Price"
          validate={(v) => (v === undefined ? 'required' : null)}
        />
      </Form>,
    );
    await screen.findByLabelText('Price');
    expect(onChange).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ isValid: false }),
    );
  });
});

describe('MUI NumberInput — missing react-imask', () => {
  it('throws a clear error when react-imask is not installed', async () => {
    vi.resetModules();
    vi.doMock('react-imask', () => {
      throw new Error("Cannot find module 'react-imask'");
    });

    const { NumberInput: FreshNumberInput } = await import('./NumberInput');

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
        <FreshNumberInput
          value={undefined}
          setValue={() => undefined}
          label="Price"
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
      expect(errors[0]?.message).toMatch('pnpm add react-imask imask');
    });
  });
});
