import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Enforma, { Form, registerComponents, clearRegistry } from 'enforma';
import { Checkbox } from './Checkbox';

beforeEach(() => {
  clearRegistry();
  registerComponents({ Checkbox });
});

describe('MUI Checkbox', () => {
  it('renders a checkbox accessible by role and label', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.Checkbox bind="agree" label="Agree" />
      </Form>,
    );
    expect(screen.getByRole('checkbox', { name: 'Agree' })).toBeInTheDocument();
  });

  it('is unchecked when form value is false', () => {
    render(
      <Form values={{ agree: false }} onChange={() => undefined}>
        <Enforma.Checkbox bind="agree" label="Agree" />
      </Form>,
    );
    expect(screen.getByRole('checkbox', { name: 'Agree' })).not.toBeChecked();
  });

  it('is checked when form value is true', () => {
    render(
      <Form values={{ agree: true }} onChange={() => undefined}>
        <Enforma.Checkbox bind="agree" label="Agree" />
      </Form>,
    );
    expect(screen.getByRole('checkbox', { name: 'Agree' })).toBeChecked();
  });

  it('calls onChange with true when user checks the box', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ agree: false }} onChange={onChange}>
        <Enforma.Checkbox bind="agree" label="Agree" />
      </Form>,
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'Agree' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ agree: true }),
      expect.anything(),
    );
  });

  it('calls onChange with false when user unchecks the box', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ agree: true }} onChange={onChange}>
        <Enforma.Checkbox bind="agree" label="Agree" />
      </Form>,
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'Agree' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ agree: false }),
      expect.anything(),
    );
  });

  it('is disabled when disabled prop is true', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.Checkbox bind="agree" label="Agree" disabled />
      </Form>,
    );
    expect(screen.getByRole('checkbox', { name: 'Agree' })).toBeDisabled();
  });

  it('shows error message after blur when validate fails', async () => {
    render(
      <Form values={{ agree: false }} onChange={() => undefined}>
        <Enforma.Checkbox
          bind="agree"
          label="Agree"
          validate={(v) => (!v ? 'You must agree' : null)}
        />
      </Form>,
    );
    screen.getByRole('checkbox', { name: 'Agree' }).focus();
    await userEvent.tab();
    expect(await screen.findByText('You must agree')).toBeInTheDocument();
  });

  it('shows description when there is no error', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.Checkbox bind="agree" label="Agree" description="You must be 18+" />
      </Form>,
    );
    expect(screen.getByText('You must be 18+')).toBeInTheDocument();
  });

  it('renders without error when labelPlacement is set to start', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.Checkbox bind="agree" label="Agree" labelPlacement="start" />
      </Form>,
    );
    expect(screen.getByRole('checkbox', { name: 'Agree' })).toBeInTheDocument();
  });
});
