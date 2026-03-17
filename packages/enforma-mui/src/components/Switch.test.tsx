import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Enforma, { Form, registerComponents, clearRegistry } from 'enforma';
import { Switch } from './Switch';

beforeEach(() => {
  clearRegistry();
  registerComponents({ Switch });
});

describe('MUI Switch', () => {
  it('renders a checkbox role accessible by label', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.Switch bind="enabled" label="Enable notifications" />
      </Form>,
    );
    expect(screen.getByRole('checkbox', { name: 'Enable notifications' })).toBeInTheDocument();
  });

  it('is unchecked when form value is false', () => {
    render(
      <Form values={{ enabled: false }} onChange={() => undefined}>
        <Enforma.Switch bind="enabled" label="Enable" />
      </Form>,
    );
    expect(screen.getByRole('checkbox', { name: 'Enable' })).not.toBeChecked();
  });

  it('is checked when form value is true', () => {
    render(
      <Form values={{ enabled: true }} onChange={() => undefined}>
        <Enforma.Switch bind="enabled" label="Enable" />
      </Form>,
    );
    expect(screen.getByRole('checkbox', { name: 'Enable' })).toBeChecked();
  });

  it('calls onChange with true when user toggles on', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ enabled: false }} onChange={onChange}>
        <Enforma.Switch bind="enabled" label="Enable" />
      </Form>,
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'Enable' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ values: { enabled: true } }));
  });

  it('calls onChange with false when user toggles off', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ enabled: true }} onChange={onChange}>
        <Enforma.Switch bind="enabled" label="Enable" />
      </Form>,
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'Enable' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ values: { enabled: false } }));
  });

  it('is disabled when disabled prop is true', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.Switch bind="enabled" label="Enable" disabled />
      </Form>,
    );
    expect(screen.getByRole('checkbox', { name: 'Enable' })).toBeDisabled();
  });

  it('shows error message after blur when validate fails', async () => {
    render(
      <Form values={{ enabled: false }} onChange={() => undefined}>
        <Enforma.Switch
          bind="enabled"
          label="Enable"
          validate={(v) => (!v ? 'Must be enabled' : null)}
        />
      </Form>,
    );
    screen.getByRole('checkbox', { name: 'Enable' }).focus();
    await userEvent.tab();
    expect(await screen.findByText('Must be enabled')).toBeInTheDocument();
  });

  it('shows description when there is no error', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.Switch bind="enabled" label="Enable" description="Enables email alerts" />
      </Form>,
    );
    expect(screen.getByText('Enables email alerts')).toBeInTheDocument();
  });

  it('renders without error when labelPlacement is set to start', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.Switch bind="enabled" label="Enable" labelPlacement="start" />
      </Form>,
    );
    expect(screen.getByRole('checkbox', { name: 'Enable' })).toBeInTheDocument();
  });
});
