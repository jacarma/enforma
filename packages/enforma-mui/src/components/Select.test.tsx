import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Enforma, { Form, registerComponents, clearRegistry, SelectOption } from 'enforma';
import { Select } from './Select';
import { TextInput } from './TextInput';

beforeEach(() => {
  clearRegistry();
  registerComponents({ Select, TextInput });
});

describe('MUI Select', () => {
  it('renders a select accessible by label', () => {
    render(
      <Form values={{ country: '' }} onChange={() => undefined}>
        <Enforma.Select bind="country" label="Country">
          <SelectOption value="au" label="Australia" />
          <SelectOption value="nz" label="New Zealand" />
        </Enforma.Select>
      </Form>,
    );
    expect(screen.getByLabelText('Country')).toBeInTheDocument();
  });

  it('renders inline options', () => {
    render(
      <Form values={{ country: '' }} onChange={() => undefined}>
        <Enforma.Select bind="country" label="Country">
          <SelectOption value="au" label="Australia" />
          <SelectOption value="nz" label="New Zealand" />
        </Enforma.Select>
      </Form>,
    );
    // MUI Select options appear in DOM (may be hidden until opened)
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders with static array datasource', () => {
    const options = [
      { value: 'au', label: 'Australia' },
      { value: 'nz', label: 'New Zealand' },
    ];
    render(
      <Form values={{ country: '' }} onChange={() => undefined}>
        <Enforma.Select bind="country" label="Country" dataSource={options} />
      </Form>,
    );
    expect(screen.getByLabelText('Country')).toBeInTheDocument();
  });

  it('shows loading state when datasource is loading', () => {
    // Query datasources are registered on Form and referenced by name
    const neverResolvingDs = { query: () => new Promise(() => undefined) };
    render(
      <Form
        values={{ country: '' }}
        onChange={() => undefined}
        dataSources={{ countries: neverResolvingDs }}
      >
        <Enforma.Select bind="country" label="Country" dataSource="countries" />
      </Form>,
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
