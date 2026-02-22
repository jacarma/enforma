import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Form, registerComponents, clearRegistry } from 'enforma';
import { TextInput } from './TextInput';
import { Fieldset } from './Fieldset';

beforeEach(() => {
  clearRegistry();
  registerComponents({ TextInput, Fieldset });
});

describe('MUI Fieldset', () => {
  it('renders children without a path', () => {
    render(
      <Form values={{ name: 'Alice' }} onChange={() => undefined}>
        <Fieldset>
          <TextInput bind="name" label="Name" />
        </Fieldset>
      </Form>,
    );
    expect(screen.getByLabelText('Name')).toHaveValue('Alice');
  });

  it('scopes children to the given path', () => {
    render(
      <Form values={{ address: { city: 'Paris' } }} onChange={() => undefined}>
        <Fieldset path="address" title="Address">
          <TextInput bind="city" label="City" />
        </Fieldset>
      </Form>,
    );
    expect(screen.getByLabelText('City')).toHaveValue('Paris');
  });

  it('renders the title', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Fieldset title="Personal Info">
          <TextInput bind="name" label="Name" />
        </Fieldset>
      </Form>,
    );
    expect(screen.getByText('Personal Info')).toBeInTheDocument();
  });
});
