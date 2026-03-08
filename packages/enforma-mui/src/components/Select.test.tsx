import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import Enforma, { Form, registerComponents, clearRegistry, SelectOption } from 'enforma';
import { Select } from './Select';
import { SelectOption as SelectOptionMui } from './SelectOption';
import { TextInput } from './TextInput';

beforeEach(() => {
  clearRegistry();
  registerComponents({ Select, TextInput, SelectOption: SelectOptionMui });
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
    const neverResolvingDs = { query: (): Promise<never[]> => new Promise(() => undefined) };
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

describe('MUI Select — openChoice', () => {
  it('shows the text input when a pre-loaded value is not in the options list', () => {
    render(
      <Form values={{ color: 'tangerine' }} onChange={() => undefined}>
        <Enforma.Select bind="color" label="Color" openChoice>
          <SelectOption value="red" label="Red" />
          <SelectOption value="blue" label="Blue" />
        </Enforma.Select>
      </Form>,
    );
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('tangerine');
  });

  it('does not show the text input when the value matches a real option', () => {
    render(
      <Form values={{ color: 'red' }} onChange={() => undefined}>
        <Enforma.Select bind="color" label="Color" openChoice>
          <SelectOption value="red" label="Red" />
          <SelectOption value="blue" label="Blue" />
        </Enforma.Select>
      </Form>,
    );
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('does not show the text input when value is empty', () => {
    render(
      <Form values={{ color: '' }} onChange={() => undefined}>
        <Enforma.Select bind="color" label="Color" openChoice>
          <SelectOption value="red" label="Red" />
        </Enforma.Select>
      </Form>,
    );
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('typing in the text input updates the form value directly', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ color: 'tangerine' }} onChange={onChange}>
        <Enforma.Select bind="color" label="Color" openChoice>
          <SelectOption value="red" label="Red" />
        </Enforma.Select>
      </Form>,
    );
    const textbox = screen.getByRole('textbox');
    await userEvent.clear(textbox);
    await userEvent.type(textbox, 'mauve');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ color: 'mauve' }),
      expect.anything(),
    );
  });
});
