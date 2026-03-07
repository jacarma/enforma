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

  it('forwards typed text as search to the datasource query', async () => {
    const query = vi.fn().mockResolvedValue([]);
    render(
      <Form values={{ item: '' }} onChange={() => undefined} dataSources={{ items: { query } }}>
        <Enforma.Autocomplete bind="item" label="Item" dataSource="items" />
      </Form>,
    );
    // Wait for initial query (search='') and loading to finish
    const combobox = await screen.findByRole('combobox');
    await vi.waitFor(() => {
      expect(query).toHaveBeenCalledTimes(1);
    });
    query.mockClear();

    await userEvent.type(combobox, 'bul');

    await vi.waitFor(() => {
      expect(query).toHaveBeenCalledWith(expect.objectContaining({ search: 'bul' }));
    });
  });

  it('resolves pre-selected value label via datasource resolve', async () => {
    const query = vi.fn().mockResolvedValue([]);
    const resolve = vi.fn().mockResolvedValue({ value: 'au', label: 'Australia' });
    render(
      <Form
        values={{ country: 'au' }}
        onChange={() => undefined}
        dataSources={{ countries: { query, resolve } }}
      >
        <Enforma.Autocomplete bind="country" label="Country" dataSource="countries" />
      </Form>,
    );
    await vi.waitFor(() => {
      expect(screen.getByRole('combobox')).toHaveValue('Australia');
    });
  });

  it('does not call resolve when value is already in query results', async () => {
    const query = vi.fn().mockResolvedValue([{ value: 'au', label: 'Australia' }]);
    const resolve = vi.fn();
    render(
      <Form
        values={{ country: 'au' }}
        onChange={() => undefined}
        dataSources={{ countries: { query, resolve } }}
      >
        <Enforma.Autocomplete bind="country" label="Country" dataSource="countries" />
      </Form>,
    );
    await vi.waitFor(() => {
      expect(query).toHaveBeenCalledTimes(1);
    });
    // Give resolve a chance to be called if it's going to be
    await new Promise((r) => setTimeout(r, 50));
    expect(resolve).not.toHaveBeenCalled();
  });

  it('filters inline options client-side when not using a query datasource', async () => {
    render(
      <Form values={{ country: '' }} onChange={() => undefined}>
        <Enforma.Autocomplete bind="country" label="Country">
          <AutocompleteOption value="au" label="Australia" />
          <AutocompleteOption value="nz" label="New Zealand" />
        </Enforma.Autocomplete>
      </Form>,
    );
    const combobox = screen.getByRole('combobox');
    await userEvent.click(combobox);
    await userEvent.type(combobox, 'xyz');
    // MUI client-side filter → no options match 'xyz'
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('does not filter query datasource options client-side', async () => {
    const query = vi.fn().mockResolvedValue([
      { value: 'au', label: 'Australia' },
      { value: 'nz', label: 'New Zealand' },
    ]);
    render(
      <Form
        values={{ country: '' }}
        onChange={() => undefined}
        dataSources={{ countries: { query } }}
      >
        <Enforma.Autocomplete bind="country" label="Country" dataSource="countries" />
      </Form>,
    );
    const combobox = await screen.findByRole('combobox');
    await vi.waitFor(() => {
      expect(query).toHaveBeenCalledTimes(1);
    });

    await userEvent.type(combobox, 'xyz');

    // Wait for query with search:'xyz' to complete
    await vi.waitFor(() => {
      expect(query).toHaveBeenCalledWith(expect.objectContaining({ search: 'xyz' }));
    });

    // disableClientFilter → MUI passes all datasource results through
    await vi.waitFor(() => {
      expect(screen.queryAllByRole('option')).toHaveLength(2);
    });
  });

  it('does not fire a query when inputValue is shorter than minSearchLength', async () => {
    const query = vi.fn().mockResolvedValue([]);
    render(
      <Form values={{ item: '' }} onChange={() => undefined} dataSources={{ items: { query } }}>
        <Enforma.Autocomplete bind="item" label="Item" dataSource="items" minSearchLength={2} />
      </Form>,
    );
    // inputValue='' < minSearchLength=2 → no query on mount
    await new Promise((r) => setTimeout(r, 50));
    expect(query).not.toHaveBeenCalled();

    // Type 1 character — still below threshold
    const combobox = screen.getByRole('combobox');
    await userEvent.type(combobox, 'a');
    await new Promise((r) => setTimeout(r, 50));
    expect(query).not.toHaveBeenCalled();

    // Type a 2nd character — now at threshold, query fires
    await userEvent.type(combobox, 'b');
    await vi.waitFor(() => {
      expect(query).toHaveBeenCalledWith(expect.objectContaining({ search: 'ab' }));
    });
  });

  it('shows "type at least N characters" when input is below minSearchLength', async () => {
    const query = vi.fn().mockResolvedValue([]);
    render(
      <Form values={{ item: '' }} onChange={() => undefined} dataSources={{ items: { query } }}>
        <Enforma.Autocomplete bind="item" label="Item" dataSource="items" minSearchLength={3} />
      </Form>,
    );
    const combobox = screen.getByRole('combobox');
    await userEvent.click(combobox);
    await userEvent.type(combobox, 'ab');
    // Below minSearchLength — should show helpful message, not "No options"
    expect(await screen.findByText('Type at least 3 characters')).toBeInTheDocument();
    expect(screen.queryByText('No options')).not.toBeInTheDocument();
  });

  it('does not show resolved pre-selected item as a dropdown option', async () => {
    const query = vi.fn().mockResolvedValue([]);
    const resolve = vi.fn().mockResolvedValue({ value: 'au', label: 'Australia' });
    render(
      <Form
        values={{ country: 'au' }}
        onChange={() => undefined}
        dataSources={{ countries: { query, resolve } }}
      >
        <Enforma.Autocomplete bind="country" label="Country" dataSource="countries" />
      </Form>,
    );
    // Wait for resolve to populate the input
    await vi.waitFor(() => {
      expect(screen.getByRole('combobox')).toHaveValue('Australia');
    });
    // Open the dropdown — the resolved item should NOT appear as a selectable option
    await userEvent.click(screen.getByRole('combobox'));
    expect(screen.queryAllByRole('option', { name: 'Australia' })).toHaveLength(0);
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
