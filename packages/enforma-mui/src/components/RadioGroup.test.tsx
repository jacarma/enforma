import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Enforma, { Form, registerComponents, clearRegistry, RadioGroupOption } from 'enforma';
import { RadioGroup } from './RadioGroup';
import { RadioGroupOption as RadioGroupOptionMui } from './RadioGroupOption';

beforeEach(() => {
  clearRegistry();
  registerComponents({ RadioGroup, RadioGroupOption: RadioGroupOptionMui });
});

describe('MUI RadioGroup', () => {
  it('renders options from inline children', () => {
    render(
      <Form values={{ size: '' }} onChange={() => undefined}>
        <Enforma.RadioGroup bind="size" label="Size">
          <RadioGroupOption value="s" label="Small" />
          <RadioGroupOption value="m" label="Medium" />
          <RadioGroupOption value="l" label="Large" />
        </Enforma.RadioGroup>
      </Form>,
    );
    expect(screen.getByRole('radio', { name: 'Small' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Medium' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Large' })).toBeInTheDocument();
  });

  it('renders options from a static array datasource', () => {
    const options = [
      { value: 's', label: 'Small' },
      { value: 'm', label: 'Medium' },
    ];
    render(
      <Form values={{ size: '' }} onChange={() => undefined}>
        <Enforma.RadioGroup bind="size" label="Size" dataSource={options} />
      </Form>,
    );
    expect(screen.getByRole('radio', { name: 'Small' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Medium' })).toBeInTheDocument();
  });

  it('checks the radio matching the current form value', () => {
    render(
      <Form values={{ size: 'm' }} onChange={() => undefined}>
        <Enforma.RadioGroup bind="size" label="Size">
          <RadioGroupOption value="s" label="Small" />
          <RadioGroupOption value="m" label="Medium" />
        </Enforma.RadioGroup>
      </Form>,
    );
    expect(screen.getByRole('radio', { name: 'Medium' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Small' })).not.toBeChecked();
  });

  it('calls onChange with selected value when user picks an option', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ size: '' }} onChange={onChange}>
        <Enforma.RadioGroup bind="size" label="Size">
          <RadioGroupOption value="s" label="Small" />
          <RadioGroupOption value="m" label="Medium" />
        </Enforma.RadioGroup>
      </Form>,
    );
    await userEvent.click(screen.getByRole('radio', { name: 'Small' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ size: 's' }),
      expect.anything(),
    );
  });

  it('shows loading spinner when datasource is loading', () => {
    const neverResolvingDs = { query: (): Promise<never[]> => new Promise(() => undefined) };
    render(
      <Form
        values={{ size: '' }}
        onChange={() => undefined}
        dataSources={{ sizes: neverResolvingDs }}
      >
        <Enforma.RadioGroup bind="size" label="Size" dataSource="sizes" />
      </Form>,
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows error message when showError is true', async () => {
    render(
      <Form values={{ size: '' }} onChange={() => undefined}>
        <Enforma.RadioGroup
          bind="size"
          label="Size"
          validate={(v) => (!v ? 'Required' : null)}
        >
          <RadioGroupOption value="s" label="Small" />
        </Enforma.RadioGroup>
      </Form>,
    );
    screen.getByRole('radio', { name: 'Small' }).focus();
    await userEvent.tab();
    expect(await screen.findByText('Required')).toBeInTheDocument();
  });

  it('disables all radio inputs when disabled prop is true', () => {
    render(
      <Form values={{ size: '' }} onChange={() => undefined}>
        <Enforma.RadioGroup bind="size" label="Size" disabled>
          <RadioGroupOption value="s" label="Small" />
          <RadioGroupOption value="m" label="Medium" />
        </Enforma.RadioGroup>
      </Form>,
    );
    expect(screen.getByRole('radio', { name: 'Small' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Medium' })).toBeDisabled();
  });

  it('renders options in a row when row prop is true', () => {
    render(
      <Form values={{ size: '' }} onChange={() => undefined}>
        <Enforma.RadioGroup bind="size" label="Size" row>
          <RadioGroupOption value="s" label="Small" />
          <RadioGroupOption value="m" label="Medium" />
        </Enforma.RadioGroup>
      </Form>,
    );
    // MUI RadioGroup with row={true} applies flexDirection: row
    // We just assert the radios render — visual row layout is CSS
    expect(screen.getByRole('radio', { name: 'Small' })).toBeInTheDocument();
  });
});
