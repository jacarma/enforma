import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { memo, useState } from 'react';
import { Form } from './Form';
import { TextInput } from './fields';
import { registerComponents } from './registry';
import { useFieldProps } from '../hooks/useField';
import type { TextInputProps } from './types';
import type { ReactNode } from 'react';

describe('Form', () => {
  it('renders a <form> element', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        {null}
      </Form>,
    );
    expect(screen.getByRole('form')).toBeInTheDocument();
  });

  it('renders children inside the form', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <span>child</span>
      </Form>,
    );
    expect(screen.getByText('child')).toBeInTheDocument();
  });

  describe('onSubmit', () => {
    it('calls onSubmit with current values when the form is valid', async () => {
      const onSubmit = vi.fn();
      render(
        <Form values={{ name: 'Alice' }} onChange={vi.fn()} onSubmit={onSubmit}>
          <button type="submit">Submit</button>
        </Form>,
      );
      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
      expect(onSubmit).toHaveBeenCalledWith({ name: 'Alice' });
    });

    it('does not call onSubmit when a field has a validation error', async () => {
      const onSubmit = vi.fn();
      render(
        <Form values={{ name: '' }} onChange={vi.fn()} onSubmit={onSubmit}>
          <TextInput bind="name" label="Name" validate={(v) => (v === '' ? 'required' : null)} />
          <button type="submit">Submit</button>
        </Form>,
      );
      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('reveals all validation errors after a failed submit', async () => {
      render(
        <Form values={{ name: '' }} onChange={vi.fn()}>
          <TextInput
            bind="name"
            label="Name"
            validate={(v) => (v === '' ? 'Name is required' : null)}
          />
          <button type="submit">Submit</button>
        </Form>,
      );
      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });
  });

  describe('onChange with validation state', () => {
    it('passes isValid and errors as second argument', async () => {
      const onChange = vi.fn();
      render(
        <Form values={{ name: '' }} onChange={onChange}>
          <TextInput bind="name" label="Name" validate={(v) => (v === '' ? 'required' : null)} />
        </Form>,
      );
      await userEvent.type(screen.getByLabelText('Name'), 'A');
      expect(onChange).toHaveBeenLastCalledWith(
        { name: 'A' },
        { isValid: true, errors: { name: null } },
      );
    });
  });

  describe('showErrors', () => {
    it('shows field errors immediately when showErrors is true', () => {
      render(
        <Form values={{ name: '' }} onChange={vi.fn()} showErrors>
          <TextInput
            bind="name"
            label="Name"
            validate={(v) => (v === '' ? 'Name is required' : null)}
          />
        </Form>,
      );
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });
  });

  it('renders children directly when no FormWrap is registered', () => {
    render(
      <Form values={{}} onChange={vi.fn()}>
        <span>unwrapped</span>
      </Form>,
    );
    expect(screen.getByText('unwrapped')).toBeInTheDocument();
  });

  it('renders children inside FormWrap when one is registered', () => {
    const FormWrap = ({ children }: { children: ReactNode }) => (
      <div data-testid="adapter-wrap">{children}</div>
    );
    registerComponents({ FormWrap });
    render(
      <Form values={{}} onChange={vi.fn()}>
        <span>wrapped</span>
      </Form>,
    );
    expect(screen.getByTestId('adapter-wrap')).toBeInTheDocument();
    expect(screen.getByText('wrapped')).toBeInTheDocument();
  });
});

describe('render isolation', () => {
  it('typing in one field does not re-render sibling fields', async () => {
    const emailRenderSpy = vi.fn();

    // memo + no props = always bails out on parent re-renders.
    // Context changes (if any) would still bypass memo and cause re-renders,
    // which is exactly what this test guards against.
    const EmailField = memo(function EmailField() {
      emailRenderSpy();
      const { value, setValue } = useFieldProps<string>({ bind: 'email' });
      return (
        <input
          aria-label="email"
          value={value ?? ''}
          onChange={(e) => {
            setValue(e.target.value);
          }}
        />
      );
    });

    // Stateful parent that re-renders on every change, just like the demo app.
    function App() {
      const [values, setValues] = useState({});
      return (
        <Form values={values} onChange={setValues}>
          <TextInput bind="name" label="Name" />
          <EmailField />
        </Form>
      );
    }

    render(<App />);
    emailRenderSpy.mockClear();

    await userEvent.type(screen.getByLabelText('Name'), 'hello');

    expect(emailRenderSpy).not.toHaveBeenCalled();
  });

  it('typing in form 1 does not re-render fields in form 2 that have function props', async () => {
    // Track how many times each registered adapter renders, keyed by bind.
    const adapterRenders = { name: 0, email: 0 };

    registerComponents({
      TextInput: function TrackedTextInput(props: TextInputProps) {
        const { value, setValue } = useFieldProps<string>(props);
        adapterRenders[props.bind as keyof typeof adapterRenders]++;
        return (
          <input
            aria-label={typeof props.label === 'string' ? props.label : props.bind}
            value={value ?? ''}
            onChange={(e) => {
              setValue(e.target.value);
            }}
          />
        );
      },
    });

    function App() {
      const [values1, setValues1] = useState({});
      return (
        <>
          <Form values={values1} onChange={setValues1}>
            <TextInput bind="name" label="Name" />
          </Form>
          <Form values={{}} onChange={vi.fn()}>
            {/* validate is an inline arrow fn — new reference on every App render */}
            <TextInput bind="email" label="Email" validate={(v) => (!v ? 'required' : null)} />
          </Form>
        </>
      );
    }

    render(<App />);
    adapterRenders.name = 0;
    adapterRenders.email = 0;

    await userEvent.type(screen.getByLabelText('Name'), 'hello');

    expect(adapterRenders.name).toBeGreaterThan(0); // sanity: name field updated
    expect(adapterRenders.email).toBe(0); // email in form 2 must not re-render
  });
});
