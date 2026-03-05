import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Enforma, { Form, registerComponents, clearRegistry, ExclusiveToggleOption } from 'enforma';
import { ExclusiveToggle } from './ExclusiveToggle';
import { ExclusiveToggleOption as ExclusiveToggleOptionMui } from './ExclusiveToggleOption';

beforeEach(() => {
  clearRegistry();
  registerComponents({ ExclusiveToggle, ExclusiveToggleOption: ExclusiveToggleOptionMui });
});

describe('MUI ExclusiveToggle', () => {
  it('renders options as buttons', () => {
    render(
      <Form values={{ size: '' }} onChange={() => undefined}>
        <Enforma.ExclusiveToggle bind="size" label="Size">
          <ExclusiveToggleOption value="s" label="S" />
          <ExclusiveToggleOption value="m" label="M" />
          <ExclusiveToggleOption value="l" label="L" />
        </Enforma.ExclusiveToggle>
      </Form>,
    );
    expect(screen.getByRole('button', { name: 'S' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'M' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'L' })).toBeInTheDocument();
  });

  it('renders options from a static array datasource', () => {
    const options = [
      { value: 's', label: 'S' },
      { value: 'm', label: 'M' },
    ];
    render(
      <Form values={{ size: '' }} onChange={() => undefined}>
        <Enforma.ExclusiveToggle bind="size" label="Size" dataSource={options} />
      </Form>,
    );
    expect(screen.getByRole('button', { name: 'S' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'M' })).toBeInTheDocument();
  });

  it('marks the current value button as pressed', () => {
    render(
      <Form values={{ size: 'm' }} onChange={() => undefined}>
        <Enforma.ExclusiveToggle bind="size" label="Size">
          <ExclusiveToggleOption value="s" label="S" />
          <ExclusiveToggleOption value="m" label="M" />
        </Enforma.ExclusiveToggle>
      </Form>,
    );
    expect(screen.getByRole('button', { name: 'M' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'S' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onChange with selected value when user clicks a button', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ size: '' }} onChange={onChange}>
        <Enforma.ExclusiveToggle bind="size" label="Size">
          <ExclusiveToggleOption value="s" label="S" />
          <ExclusiveToggleOption value="m" label="M" />
        </Enforma.ExclusiveToggle>
      </Form>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'S' }));
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
        <Enforma.ExclusiveToggle bind="size" label="Size" dataSource="sizes" />
      </Form>,
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows error message after blur with failed validation', async () => {
    render(
      <Form values={{ size: '' }} onChange={() => undefined}>
        <Enforma.ExclusiveToggle
          bind="size"
          label="Size"
          validate={(v) => (!v ? 'Required' : null)}
        >
          <ExclusiveToggleOption value="s" label="S" />
        </Enforma.ExclusiveToggle>
      </Form>,
    );
    screen.getByRole('button', { name: 'S' }).focus();
    await userEvent.tab();
    expect(await screen.findByText('Required')).toBeInTheDocument();
  });

  it('disables all buttons when disabled prop is true', () => {
    render(
      <Form values={{ size: '' }} onChange={() => undefined}>
        <Enforma.ExclusiveToggle bind="size" label="Size" disabled>
          <ExclusiveToggleOption value="s" label="S" />
          <ExclusiveToggleOption value="m" label="M" />
        </Enforma.ExclusiveToggle>
      </Form>,
    );
    expect(screen.getByRole('button', { name: 'S' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'M' })).toBeDisabled();
  });
});
