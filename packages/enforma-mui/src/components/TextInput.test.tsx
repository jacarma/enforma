import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Form, registerComponents, clearRegistry } from 'enforma';
import { TextInput } from './TextInput';
import { Fieldset } from './Fieldset';

beforeEach(() => {
  clearRegistry();
  registerComponents({ TextInput, Fieldset });
});

describe('MUI TextInput', () => {
  it('renders an input accessible by label text', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <TextInput bind="name" label="Full name" />
      </Form>,
    );
    expect(screen.getByLabelText('Full name')).toBeInTheDocument();
  });

  it('input has correct value from form state', () => {
    render(
      <Form values={{ name: 'Alice' }} onChange={() => undefined}>
        <TextInput bind="name" label="Name" />
      </Form>,
    );
    expect(screen.getByLabelText('Name')).toHaveValue('Alice');
  });

  it('calls onChange with updated value when user types', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ name: '' }} onChange={onChange}>
        <TextInput bind="name" label="Name" />
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
        <TextInput bind="name" label="Name" validate={(v) => (!v ? 'Name is required' : null)} />
      </Form>,
    );
    await userEvent.click(screen.getByLabelText('Name'));
    await userEvent.tab(); // trigger blur
    expect(await screen.findByText('Name is required')).toBeInTheDocument();
  });

  it('does not show error before blur', () => {
    render(
      <Form values={{ name: '' }} onChange={() => undefined}>
        <TextInput bind="name" label="Name" validate={(v) => (!v ? 'Name is required' : null)} />
      </Form>,
    );
    expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <TextInput bind="name" label="Name" disabled />
      </Form>,
    );
    expect(screen.getByLabelText('Name')).toBeDisabled();
  });
});
