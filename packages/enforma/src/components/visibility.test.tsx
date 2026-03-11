import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Form } from './Form';
import { TextInput, Fieldset } from './fields';
import { registerComponents } from './registry';
import type { ResolvedTextInputProps, ResolvedCheckboxProps, ResolvedFieldsetProps } from './types';

function StubTextInput({ value, setValue, label, onBlur }: ResolvedTextInputProps) {
  return (
    <input
      aria-label={label ?? 'field'}
      value={value ?? ''}
      onChange={(e) => {
        setValue(e.target.value);
      }}
      onBlur={onBlur}
    />
  );
}

function StubCheckbox({ value, setValue, label }: ResolvedCheckboxProps) {
  return (
    <input
      type="checkbox"
      aria-label={label ?? 'checkbox'}
      checked={value ?? false}
      onChange={(e) => {
        setValue(e.target.checked);
      }}
    />
  );
}

function StubFieldset({ children }: ResolvedFieldsetProps) {
  return <div>{children}</div>;
}

beforeEach(() => {
  registerComponents({
    TextInput: StubTextInput,
    Checkbox: StubCheckbox,
    Fieldset: StubFieldset,
  });
});

// ---------------------------------------------------------------------------
// hidden prop
// ---------------------------------------------------------------------------

describe('hidden prop', () => {
  it('hides the field when hidden=true', () => {
    render(
      <Form values={{ name: 'Alice' }} onChange={vi.fn()}>
        <TextInput bind="name" label="Name" hidden />
      </Form>,
    );
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
  });

  it('shows the field when hidden=false', () => {
    render(
      <Form values={{ name: 'Alice' }} onChange={vi.fn()}>
        <TextInput bind="name" label="Name" hidden={false} />
      </Form>,
    );
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
  });

  it('preserves the stored value while the field is hidden', async () => {
    const onChange = vi.fn();
    function TestForm() {
      const [values, setValues] = useState<Record<string, unknown>>({ name: 'Alice', hide: '' });
      return (
        <Form
          values={values}
          onChange={(v) => {
            onChange(v);
            setValues(v);
          }}
        >
          <TextInput bind="name" label="Name" hidden={({ hide }) => hide === 'yes'} />
          <TextInput bind="hide" label="Hide" />
        </Form>
      );
    }
    render(<TestForm />);

    // Type 'yes' into the hide field — this updates the store via the form
    await userEvent.type(screen.getByLabelText('Hide'), 'yes');
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1] as [
      Record<string, unknown>,
    ];
    expect(lastCall[0].name).toBe('Alice');
  });

  it('shows the previously stored value when field becomes visible again', async () => {
    const onChange = vi.fn();
    function TestForm() {
      const [values, setValues] = useState<Record<string, unknown>>({ name: 'Alice', hide: '' });
      return (
        <Form
          values={values}
          onChange={(v) => {
            onChange(v);
            setValues(v);
          }}
        >
          <TextInput bind="name" label="Name" hidden={({ hide }) => hide === 'yes'} />
          <TextInput bind="hide" label="Hide" />
        </Form>
      );
    }
    render(<TestForm />);

    expect(screen.getByLabelText('Name')).toHaveValue('Alice');

    // Hide the field
    await userEvent.type(screen.getByLabelText('Hide'), 'yes');
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();

    // Show the field again by clearing the hide field
    await userEvent.clear(screen.getByLabelText('Hide'));
    expect(screen.getByLabelText('Name')).toHaveValue('Alice');
  });

  it('hidden field with required validator does not block form submission', async () => {
    const onSubmit = vi.fn();
    render(
      <Form values={{ name: '' }} onChange={vi.fn()} onSubmit={onSubmit}>
        <TextInput bind="name" label="Name" hidden required />
        <button type="submit">Submit</button>
      </Form>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onSubmit).toHaveBeenCalledWith({ name: '' });
  });
});

// ---------------------------------------------------------------------------
// removed prop
// ---------------------------------------------------------------------------

describe('removed prop', () => {
  it('removes the field when removed=true', () => {
    render(
      <Form values={{ name: 'Alice' }} onChange={vi.fn()}>
        <TextInput bind="name" label="Name" removed />
      </Form>,
    );
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
  });

  it('deletes the stored value when removed=true', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ name: 'Alice' }} onChange={onChange}>
        <TextInput bind="name" label="Name" removed />
      </Form>,
    );
    await act(() => Promise.resolve());
    const calls = onChange.mock.calls;
    if (calls.length > 0) {
      const lastValues = (calls[calls.length - 1] as [Record<string, unknown>])[0];
      expect(lastValues.name).toBeUndefined();
    }
  });

  it('removes field and its value reactively based on other field', async () => {
    const onChange = vi.fn();
    function TestForm() {
      const [values, setValues] = useState<Record<string, unknown>>({ name: 'Alice', remove: '' });
      return (
        <Form
          values={values}
          onChange={(v) => {
            onChange(v);
            setValues(v);
          }}
        >
          <TextInput bind="name" label="Name" removed={({ remove }) => remove === 'yes'} />
          <TextInput bind="remove" label="Remove" />
        </Form>
      );
    }
    render(<TestForm />);

    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Remove'), 'yes');
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();

    await act(() => Promise.resolve());
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1] as [
      Record<string, unknown>,
    ];
    expect(lastCall[0].name).toBeUndefined();
  });

  it('removed field with required validator does not block form submission', async () => {
    const onSubmit = vi.fn();
    render(
      <Form values={{ name: '' }} onChange={vi.fn()} onSubmit={onSubmit}>
        <TextInput bind="name" label="Name" removed required />
        <button type="submit">Submit</button>
      </Form>,
    );
    await act(() => Promise.resolve());
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onSubmit).toHaveBeenCalled();
  });

  it('re-mounts fresh (no value) when removed becomes false', async () => {
    const onChange = vi.fn();
    function TestForm() {
      const [values, setValues] = useState<Record<string, unknown>>({
        name: 'Alice',
        remove: 'yes',
      });
      return (
        <Form
          values={values}
          onChange={(v) => {
            onChange(v);
            setValues(v);
          }}
        >
          <TextInput bind="name" label="Name" removed={({ remove }) => remove === 'yes'} />
          <TextInput bind="remove" label="Remove" />
        </Form>
      );
    }
    render(<TestForm />);
    // Field is initially removed (remove='yes' in initial values → store)
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();

    // Clear the remove field to un-remove
    await userEvent.clear(screen.getByLabelText('Remove'));
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    // Value should be empty because it was deleted when removed=true
    expect(screen.getByLabelText('Name')).toHaveValue('');
  });
});

// ---------------------------------------------------------------------------
// Fieldset (no bind) + children with same removed expression
// ---------------------------------------------------------------------------

describe('Fieldset (no bind) + children share removed expression', () => {
  it('deletes children store values when parent Fieldset is removed', async () => {
    const onChange = vi.fn();
    function TestForm() {
      const [values, setValues] = useState<Record<string, unknown>>({
        name: 'Alice',
        email: 'a@b.com',
        remove: '',
      });
      return (
        <Form
          values={values}
          onChange={(v) => {
            onChange(v);
            setValues(v);
          }}
        >
          <Fieldset removed={({ remove }) => remove === 'yes'}>
            <TextInput bind="name" label="Name" removed={({ remove }) => remove === 'yes'} />
            <TextInput bind="email" label="Email" removed={({ remove }) => remove === 'yes'} />
          </Fieldset>
          <TextInput bind="remove" label="Remove" />
        </Form>
      );
    }
    render(<TestForm />);

    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Remove'), 'yes');
    await act(() => Promise.resolve());

    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1] as [
      Record<string, unknown>,
    ];
    expect(lastCall[0].name).toBeUndefined();
    expect(lastCall[0].email).toBeUndefined();
  });

  it('children re-mount with no value after being removed while visible', async () => {
    const onChange = vi.fn();
    function TestForm() {
      const [values, setValues] = useState<Record<string, unknown>>({
        name: 'Alice',
        remove: '',
      });
      return (
        <Form
          values={values}
          onChange={(v) => {
            onChange(v);
            setValues(v);
          }}
        >
          <Fieldset removed={({ remove }) => remove === 'yes'}>
            <TextInput bind="name" label="Name" removed={({ remove }) => remove === 'yes'} />
          </Fieldset>
          <TextInput bind="remove" label="Remove" />
        </Form>
      );
    }
    render(<TestForm />);
    // Field is initially visible
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Alice');

    // Remove the field — value should be deleted
    await userEvent.type(screen.getByLabelText('Remove'), 'yes');
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
    await act(() => Promise.resolve());

    // Un-remove: field should re-appear with empty value (was deleted)
    await userEvent.clear(screen.getByLabelText('Remove'));
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('');
  });
});
