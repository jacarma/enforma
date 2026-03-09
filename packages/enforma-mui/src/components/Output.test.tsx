import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Enforma, { Form, registerComponents, clearRegistry } from 'enforma';
import type { ResolvedTextInputProps } from 'enforma';
import { Output } from './Output';

function MinimalInput({ value, setValue }: ResolvedTextInputProps) {
  return (
    <input
      data-testid="input"
      value={value ?? ''}
      onChange={(e) => {
        setValue(e.target.value);
      }}
    />
  );
}

beforeEach(() => {
  clearRegistry();
  registerComponents({ Output });
});

describe('MUI Output', () => {
  it('renders a string value as text content', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.Output value="hello world" />
      </Form>,
    );
    expect(screen.getByText('hello world')).toBeInTheDocument();
  });

  it('converts non-string values to string', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.Output value={42} />
      </Form>,
    );
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders empty string for null value', () => {
    const { container } = render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.Output value={null} />
      </Form>,
    );
    expect(container.querySelector('span')).toBeInTheDocument();
  });

  it('renders with default as="span"', () => {
    const { container } = render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.Output value="text" />
      </Form>,
    );
    expect(container.querySelector('span')).toBeInTheDocument();
  });

  it('renders with a custom as element', () => {
    const { container } = render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.Output value="text" as="strong" />
      </Form>,
    );
    expect(container.querySelector('strong')).toBeInTheDocument();
  });

  it('updates text when form state changes', () => {
    registerComponents({ TextInput: MinimalInput });
    render(
      <Form values={{ name: 'Alice' }} onChange={() => undefined}>
        <Enforma.TextInput bind="name" label="Name" />
        <Enforma.Output
          value={({ name }: Record<string, unknown>) => (typeof name === 'string' ? name : '')}
        />
      </Form>,
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('input'), { target: { value: 'Bob' } });
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });
});
