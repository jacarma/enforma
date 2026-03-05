import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Enforma, { Form, registerComponents, clearRegistry, AutocompleteOption } from 'enforma';
import { Autocomplete } from './Autocomplete';
import { AutocompleteOption as AutocompleteOptionMui } from './AutocompleteOption';

beforeEach(() => {
  clearRegistry();
  registerComponents({ Autocomplete, AutocompleteOption: AutocompleteOptionMui });
});

describe('MUI Autocomplete', () => {
  it('renders a combobox accessible by label', () => {
    render(
      <Form values={{ country: '' }} onChange={() => undefined}>
        <Enforma.Autocomplete bind="country" label="Country">
          <AutocompleteOption value="au" label="Australia" />
          <AutocompleteOption value="nz" label="New Zealand" />
        </Enforma.Autocomplete>
      </Form>,
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByLabelText('Country')).toBeInTheDocument();
  });

  it('displays the label for the current form value', () => {
    render(
      <Form values={{ country: 'au' }} onChange={() => undefined}>
        <Enforma.Autocomplete bind="country" label="Country">
          <AutocompleteOption value="au" label="Australia" />
          <AutocompleteOption value="nz" label="New Zealand" />
        </Enforma.Autocomplete>
      </Form>,
    );
    expect(screen.getByRole('combobox')).toHaveValue('Australia');
  });

  it('calls onChange with selected value when user picks an option', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ country: '' }} onChange={onChange}>
        <Enforma.Autocomplete bind="country" label="Country">
          <AutocompleteOption value="au" label="Australia" />
          <AutocompleteOption value="nz" label="New Zealand" />
        </Enforma.Autocomplete>
      </Form>,
    );
    await userEvent.type(screen.getByRole('combobox'), 'Aus');
    await userEvent.click(await screen.findByRole('option', { name: 'Australia' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ country: 'au' }),
      expect.anything(),
    );
  });

  it('renders with a static array datasource', () => {
    const options = [
      { value: 'au', label: 'Australia' },
      { value: 'nz', label: 'New Zealand' },
    ];
    render(
      <Form values={{ country: '' }} onChange={() => undefined}>
        <Enforma.Autocomplete bind="country" label="Country" dataSource={options} />
      </Form>,
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('shows loading spinner when datasource is loading', () => {
    const neverResolvingDs = { query: (): Promise<never[]> => new Promise(() => undefined) };
    render(
      <Form
        values={{ country: '' }}
        onChange={() => undefined}
        dataSources={{ countries: neverResolvingDs }}
      >
        <Enforma.Autocomplete bind="country" label="Country" dataSource="countries" />
      </Form>,
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows error message after blur with failed validation', async () => {
    render(
      <Form values={{ country: '' }} onChange={() => undefined}>
        <Enforma.Autocomplete
          bind="country"
          label="Country"
          validate={(v) => (!v ? 'Required' : null)}
        >
          <AutocompleteOption value="au" label="Australia" />
        </Enforma.Autocomplete>
      </Form>,
    );
    screen.getByRole('combobox').focus();
    await userEvent.tab();
    expect(await screen.findByText('Required')).toBeInTheDocument();
  });
});
