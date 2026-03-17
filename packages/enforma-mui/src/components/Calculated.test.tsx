import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Enforma, { Form, registerComponents, clearRegistry } from 'enforma';
import type { ResolvedTextInputProps } from 'enforma';
import { Calculated } from './Calculated';

beforeEach(() => {
  clearRegistry();
  registerComponents({ Calculated });
});

describe('MUI Calculated', () => {
  it('renders the computed value as text', () => {
    render(
      <Form values={{ a: 3, b: 4 }} onChange={() => undefined}>
        <Enforma.Calculated value={(v) => (v.a as number) + (v.b as number)} label="Total" />
      </Form>,
    );
    expect(screen.getByDisplayValue('7')).toBeInTheDocument();
  });

  it('renders the label', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.Calculated value={() => 42} label="Score" />
      </Form>,
    );
    expect(screen.getByLabelText('Score')).toBeInTheDocument();
  });

  it('is read-only (cannot be edited)', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.Calculated value={() => 42} label="Score" />
      </Form>,
    );
    expect(screen.getByLabelText<HTMLInputElement>('Score').readOnly).toBe(true);
  });

  it('syncs computed value into form state when bind is set', () => {
    const onChange = vi.fn();
    render(
      <Form values={{ a: 2, b: 3, total: 0 }} onChange={onChange}>
        <Enforma.Calculated<number>
          bind="total"
          value={(v) => (v.a as number) + (v.b as number)}
          label="Total"
        />
      </Form>,
    );
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ values: { a: 2, b: 3, total: 5 } }),
    );
  });

  it('updates displayed value when form state changes', () => {
    function MinimalInput({ value, setValue }: ResolvedTextInputProps) {
      return (
        <input
          data-testid="input-a"
          value={value ?? ''}
          onChange={(e) => {
            setValue(e.target.value);
          }}
        />
      );
    }
    registerComponents({ TextInput: MinimalInput });

    render(
      <Form values={{ a: '1', b: '2' }} onChange={() => undefined}>
        <Enforma.TextInput bind="a" label="A" />
        <Enforma.Calculated value={(v) => Number(v.a) + Number(v.b)} label="Total" />
      </Form>,
    );
    expect(screen.getByDisplayValue('3')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('input-a'), { target: { value: '10' } });
    expect(screen.getByDisplayValue('12')).toBeInTheDocument();
  });

  it('renders description as helper text', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.Calculated value={() => 0} label="Total" description="Sum of all items" />
      </Form>,
    );
    expect(screen.getByText('Sum of all items')).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.Calculated value={() => 0} label="Score" disabled />
      </Form>,
    );
    expect(screen.getByLabelText('Score')).toBeDisabled();
  });
});
