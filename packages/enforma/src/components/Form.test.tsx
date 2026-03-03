import { describe, it, expect, vi } from 'vitest';
import { render, screen, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { memo, useState } from 'react';
import { Form } from './Form';
import { TextInput } from './fields';
import { registerComponents } from './registry';
import { useFieldProps } from '../hooks/useField';
import type { FieldResolved, ResolvedTextInputProps } from './types';
import type { ReactNode } from 'react';
import { useDataSources } from '../context/DataSourceContext';

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
      const { value, setValue } = useFieldProps<FieldResolved<string>>({ bind: 'email' });
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
      TextInput: function TrackedTextInput({ value, setValue, label }: ResolvedTextInputProps) {
        const key = (label?.toLowerCase() ?? '') as keyof typeof adapterRenders;
        if (key in adapterRenders) adapterRenders[key]++;
        return (
          <input
            aria-label={label}
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

describe('TextInput mask prop', () => {
  it('passes resolved mask to the adapter', () => {
    const received: (string | RegExp | undefined)[] = [];

    registerComponents({
      TextInput: (props: ResolvedTextInputProps) => {
        received.push(props.mask);
        return <input aria-label={props.label ?? ''} />;
      },
    });

    render(
      <Form values={{}} onChange={vi.fn()}>
        <TextInput bind="x" label="X" mask="000-000" />
      </Form>,
    );

    expect(received[0]).toBe('000-000');
  });

  it('resolves a reactive mask function', () => {
    const received: (string | RegExp | undefined)[] = [];

    registerComponents({
      TextInput: (props: ResolvedTextInputProps) => {
        received.push(props.mask);
        return <input aria-label={props.label ?? ''} />;
      },
    });

    render(
      <Form values={{ type: 'phone' }} onChange={vi.fn()}>
        <TextInput
          bind="x"
          label="X"
          mask={({ type }) => (type === 'phone' ? '000-000-0000' : /\d+/)}
        />
      </Form>,
    );

    expect(received[0]).toBe('000-000-0000');
  });
});

describe('typeValidator', () => {
  it('shows the message key as error after blur when typeValidator fails', async () => {
    function TypedField({ bind }: { bind: string }) {
      const { error, showError, onBlur } = useFieldProps<FieldResolved<number>>(
        { bind },
        { typeValidator: (v) => (typeof v === 'number' || v === undefined ? null : 'badType') },
      );
      return (
        <div>
          <button aria-label={bind} onBlur={onBlur} />
          {showError && <span>{error}</span>}
        </div>
      );
    }

    render(
      <Form values={{ qty: 'not-a-number' }} onChange={vi.fn()}>
        <TypedField bind="qty" />
      </Form>,
    );

    screen.getByRole('button', { name: 'qty' }).focus();
    await userEvent.tab();
    expect(await screen.findByText('badType')).toBeInTheDocument();
  });

  it('resolves the message key through the messages prop', async () => {
    function TypedField({ bind }: { bind: string }) {
      const { error, showError, onBlur } = useFieldProps<FieldResolved<number>>(
        { bind, messages: { badType: 'Not a valid number' } },
        { typeValidator: (v) => (typeof v === 'number' || v === undefined ? null : 'badType') },
      );
      return (
        <div>
          <button aria-label={bind} onBlur={onBlur} />
          {showError && <span>{error}</span>}
        </div>
      );
    }

    render(
      <Form values={{ qty: 'bad' }} onChange={vi.fn()}>
        <TypedField bind="qty" />
      </Form>,
    );

    screen.getByRole('button', { name: 'qty' }).focus();
    await userEvent.tab();
    expect(await screen.findByText('Not a valid number')).toBeInTheDocument();
  });

  it('reports isValid=false in onChange when typeValidator fails', () => {
    const onChange = vi.fn();

    function TypedField({ bind }: { bind: string }) {
      const { onBlur, setValue } = useFieldProps<FieldResolved<number>>(
        { bind },
        { typeValidator: (v) => (typeof v === 'number' || v === undefined ? null : 'badType') },
      );
      return (
        <input
          aria-label={bind}
          onChange={(e) => {
            setValue(e.target.value as unknown as number);
          }}
          onBlur={onBlur}
        />
      );
    }

    render(
      <Form values={{ qty: 'bad' }} onChange={onChange}>
        <TypedField bind="qty" />
      </Form>,
    );

    // onChange fires on mount for initial value — check it reports invalid
    expect(onChange).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ isValid: false }),
    );
  });
});

describe('Form dataSources', () => {
  it('makes named DataSources available to descendants via useDataSources', () => {
    const countries = [{ code: 'us', name: 'United States' }];

    const { result } = renderHook(() => useDataSources(), {
      wrapper: ({ children }) => (
        <Form values={{}} onChange={vi.fn()} dataSources={{ countries }}>
          {children}
        </Form>
      ),
    });

    expect(result.current).toEqual({ countries });
  });

  it('provides an empty map when dataSources prop is omitted', () => {
    const { result } = renderHook(() => useDataSources(), {
      wrapper: ({ children }) => (
        <Form values={{}} onChange={vi.fn()}>
          {children}
        </Form>
      ),
    });

    expect(result.current).toEqual({});
  });
});

describe('DatePicker typeValidator', () => {
  it('shows no error when value is undefined', () => {
    function Field({ bind }: { bind: string }) {
      const { showError } = useFieldProps<FieldResolved<Date | string>>(
        { bind },
        { typeValidator: (v) => (v === undefined || v instanceof Date ? null : 'invalidDate') },
      );
      return <div>{showError && <span>error</span>}</div>;
    }

    render(
      <Form values={{ d: undefined }} onChange={vi.fn()} showErrors>
        <Field bind="d" />
      </Form>,
    );
    expect(screen.queryByText('error')).not.toBeInTheDocument();
  });

  it('shows no error when value is a Date', () => {
    function Field({ bind }: { bind: string }) {
      const { showError } = useFieldProps<FieldResolved<Date | string>>(
        { bind },
        { typeValidator: (v) => (v === undefined || v instanceof Date ? null : 'invalidDate') },
      );
      return <div>{showError && <span>error</span>}</div>;
    }

    render(
      <Form values={{ d: new Date() }} onChange={vi.fn()} showErrors>
        <Field bind="d" />
      </Form>,
    );
    expect(screen.queryByText('error')).not.toBeInTheDocument();
  });

  it('shows invalidDate error when value is a string', async () => {
    function Field({ bind }: { bind: string }) {
      const { error, showError, onBlur } = useFieldProps<FieldResolved<Date | string>>(
        { bind },
        { typeValidator: (v) => (v === undefined || v instanceof Date ? null : 'invalidDate') },
      );
      return (
        <div>
          <button aria-label={bind} onBlur={onBlur} />
          {showError && <span>{error}</span>}
        </div>
      );
    }

    render(
      <Form values={{ d: '03/03/' }} onChange={vi.fn()}>
        <Field bind="d" />
      </Form>,
    );

    screen.getByRole('button', { name: 'd' }).focus();
    await userEvent.tab();
    expect(await screen.findByText('invalidDate')).toBeInTheDocument();
  });

  it('reports isValid=false in onChange when value is a string', () => {
    const onChange = vi.fn();

    function Field({ bind }: { bind: string }) {
      useFieldProps<FieldResolved<Date | string>>(
        { bind },
        { typeValidator: (v) => (v === undefined || v instanceof Date ? null : 'invalidDate') },
      );
      return null;
    }

    render(
      <Form values={{ d: '03/03/' }} onChange={onChange}>
        <Field bind="d" />
      </Form>,
    );

    expect(onChange).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ isValid: false }),
    );
  });
});

describe('TimePicker typeValidator', () => {
  const timeValidator = (v: unknown): string | null => {
    if (v === undefined) return null;
    if (typeof v === 'string' && /^\d{2}:\d{2}$/.test(v)) return null;
    return 'invalidTime';
  };

  it('shows no error when value is undefined', () => {
    function Field({ bind }: { bind: string }) {
      const { showError } = useFieldProps<FieldResolved<string>>(
        { bind },
        { typeValidator: timeValidator },
      );
      return <div>{showError && <span>error</span>}</div>;
    }
    render(
      <Form values={{ t: undefined }} onChange={vi.fn()} showErrors>
        <Field bind="t" />
      </Form>,
    );
    expect(screen.queryByText('error')).not.toBeInTheDocument();
  });

  it('shows no error when value is a valid HH:mm string', () => {
    function Field({ bind }: { bind: string }) {
      const { showError } = useFieldProps<FieldResolved<string>>(
        { bind },
        { typeValidator: timeValidator },
      );
      return <div>{showError && <span>error</span>}</div>;
    }
    render(
      <Form values={{ t: '14:30' }} onChange={vi.fn()} showErrors>
        <Field bind="t" />
      </Form>,
    );
    expect(screen.queryByText('error')).not.toBeInTheDocument();
  });

  it('shows invalidTime error when value is a partial time string', async () => {
    function Field({ bind }: { bind: string }) {
      const { error, showError, onBlur } = useFieldProps<FieldResolved<string>>(
        { bind },
        { typeValidator: timeValidator },
      );
      return (
        <div>
          <button aria-label={bind} onBlur={onBlur} />
          {showError && <span>{error}</span>}
        </div>
      );
    }
    render(
      <Form values={{ t: '14:' }} onChange={vi.fn()}>
        <Field bind="t" />
      </Form>,
    );
    screen.getByRole('button', { name: 't' }).focus();
    await userEvent.tab();
    expect(await screen.findByText('invalidTime')).toBeInTheDocument();
  });
});
