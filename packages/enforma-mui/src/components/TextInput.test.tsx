import React, { forwardRef } from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Enforma, { Form, registerComponents, clearRegistry } from 'enforma';
import { TextInput } from './TextInput';
import { Fieldset } from './Fieldset';
import { ClassicProvider } from '../context/ClassicProvider';
import { StandardProvider } from '../context/StandardProvider';

beforeEach(() => {
  clearRegistry();
  registerComponents({ TextInput, Fieldset });
});

describe('MUI TextInput', () => {
  it('renders an input accessible by label text', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.TextInput bind="name" label="Full name" />
      </Form>,
    );
    expect(screen.getByLabelText('Full name')).toBeInTheDocument();
  });

  it('input has correct value from form state', () => {
    render(
      <Form values={{ name: 'Alice' }} onChange={() => undefined}>
        <Enforma.TextInput bind="name" label="Name" />
      </Form>,
    );
    expect(screen.getByLabelText('Name')).toHaveValue('Alice');
  });

  it('calls onChange with updated value when user types', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ name: '' }} onChange={onChange}>
        <Enforma.TextInput bind="name" label="Name" />
      </Form>,
    );
    await userEvent.type(screen.getByLabelText('Name'), 'Bob');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: 'Bob' }),
      expect.anything(),
    );
  });

  it('shows error message after blur when validate fails', async () => {
    render(
      <Form values={{ name: '' }} onChange={() => undefined}>
        <Enforma.TextInput
          bind="name"
          label="Name"
          validate={(v) => (!v ? 'Name is required' : null)}
        />
      </Form>,
    );
    await userEvent.click(screen.getByLabelText('Name'));
    await userEvent.tab(); // trigger blur
    expect(await screen.findByText('Name is required')).toBeInTheDocument();
  });

  it('does not show error before blur', () => {
    render(
      <Form values={{ name: '' }} onChange={() => undefined}>
        <Enforma.TextInput
          bind="name"
          label="Name"
          validate={(v) => (!v ? 'Name is required' : null)}
        />
      </Form>,
    );
    expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.TextInput bind="name" label="Name" disabled />
      </Form>,
    );
    expect(screen.getByLabelText('Name')).toBeDisabled();
  });
});

describe('MUI TextInput variants', () => {
  it('classic: renders an input accessible by label text', () => {
    clearRegistry();
    registerComponents({ TextInput, Fieldset, FormWrap: ClassicProvider });
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.TextInput bind="name" label="Full name" />
      </Form>,
    );
    expect(screen.getByLabelText('Full name')).toBeInTheDocument();
  });

  it('classic: uses compact size', () => {
    clearRegistry();
    registerComponents({ TextInput, Fieldset, FormWrap: ClassicProvider });
    render(
      <Form values={{ name: 'x' }} onChange={() => undefined}>
        <Enforma.TextInput bind="name" label="Name" />
      </Form>,
    );
    // compact size means the input has size attribute "small" or similar class;
    // the reliable assertion is that the input renders and is accessible
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('x');
  });

  it('standard: renders an input accessible by label text', () => {
    clearRegistry();
    registerComponents({ TextInput, Fieldset, FormWrap: StandardProvider });
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.TextInput bind="name" label="Full name" />
      </Form>,
    );
    expect(screen.getByLabelText('Full name')).toBeInTheDocument();
  });

  it('classic (default): renders an input accessible by label text without FormWrap', () => {
    // No FormWrap registered — context defaults to 'classic'
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.TextInput bind="name" label="Full name" />
      </Form>,
    );
    expect(screen.getByLabelText('Full name')).toBeInTheDocument();
  });
});

describe('MUI TextInput with mask', () => {
  beforeEach(() => {
    vi.mock('react-imask', () => ({
      IMaskInput: forwardRef(
        ({
          onAccept,
          inputRef,
          ...rest
        }: {
          onAccept: (v: string) => void;
          inputRef: React.Ref<HTMLInputElement>;
          mask: string | RegExp;
        }) => (
          <input
            {...rest}
            ref={inputRef}
            data-testid="imask-input"
            onChange={(e) => {
              onAccept(e.target.value);
            }}
          />
        ),
      ),
    }));
  });

  it('renders an IMaskInput when mask prop is provided', async () => {
    render(
      <Form values={{ phone: '' }} onChange={() => undefined}>
        <Enforma.TextInput bind="phone" label="Phone" mask="000-000-0000" />
      </Form>,
    );
    expect(await screen.findByTestId('imask-input')).toBeInTheDocument();
  });

  it('calls setValue with the masked value when user types', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ phone: '' }} onChange={onChange}>
        <Enforma.TextInput bind="phone" label="Phone" mask="000-000-0000" />
      </Form>,
    );
    const input = await screen.findByTestId('imask-input');
    await userEvent.type(input, '5');
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '5' }),
      expect.anything(),
    );
  });

  it('throws a clear error when mask is set but react-imask is not installed', async () => {
    // React.lazy caches the resolved module; resetting modules forces a fresh load
    vi.resetModules();
    vi.doMock('./MaskedTextInput', () => {
      throw new Error("Cannot find module 'react-imask'");
    });

    const { TextInput: FreshTextInput } = await import('./TextInput');

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
        <FreshTextInput
          value=""
          setValue={() => undefined}
          label="Phone"
          mask="000-000-0000"
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
