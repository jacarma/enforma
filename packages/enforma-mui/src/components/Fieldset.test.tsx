import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Enforma, { Form, registerComponents, clearRegistry } from 'enforma';
import { TextInput } from './TextInput';
import { Fieldset } from './Fieldset';

beforeEach(() => {
  clearRegistry();
  registerComponents({ TextInput, Fieldset });
});

describe('MUI Fieldset', () => {
  it('renders children without a bind', () => {
    render(
      <Form values={{ name: 'Alice' }} onChange={() => undefined}>
        <Enforma.Fieldset>
          <Enforma.TextInput bind="name" label="Name" />
        </Enforma.Fieldset>
      </Form>,
    );
    expect(screen.getByLabelText('Name')).toHaveValue('Alice');
  });

  it('scopes children to the given bind', () => {
    render(
      <Form values={{ address: { city: 'Paris' } }} onChange={() => undefined}>
        <Enforma.Fieldset bind="address" title="Address">
          <Enforma.TextInput bind="city" label="City" />
        </Enforma.Fieldset>
      </Form>,
    );
    expect(screen.getByLabelText('City')).toHaveValue('Paris');
  });

  it('renders the title', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.Fieldset title="Personal Info">
          <Enforma.TextInput bind="name" label="Name" />
        </Enforma.Fieldset>
      </Form>,
    );
    expect(screen.getByText('Personal Info')).toBeInTheDocument();
  });
});
