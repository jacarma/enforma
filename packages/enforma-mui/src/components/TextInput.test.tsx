import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
