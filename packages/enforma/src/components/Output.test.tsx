import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ElementType } from 'react';
import Enforma, { Form, registerComponents, clearRegistry } from '../index';
import { Output } from './fields';
import type { ResolvedOutputProps, ResolvedTextInputProps } from './types';

function MinimalOutput({ value, as: Tag }: ResolvedOutputProps) {
  const text =
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
      ? String(value)
      : '';
  const El = Tag as ElementType;
  return <El data-testid="output">{text}</El>;
}

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
  registerComponents({ Output: MinimalOutput });
});

describe('Output', () => {
  it('renders a static string value', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Output value="hello" />
      </Form>,
    );
    expect(screen.getByTestId('output')).toHaveTextContent('hello');
  });

  it('renders a reactive value from form state', () => {
    render(
      <Form values={{ name: 'Alice' }} onChange={() => undefined}>
        <Output value={({ name }: Record<string, unknown>) => (typeof name === 'string' ? name : '')} />
      </Form>,
    );
    expect(screen.getByTestId('output')).toHaveTextContent('Alice');
  });

  it('re-renders when form state changes', () => {
    registerComponents({ TextInput: MinimalInput });
    render(
      <Form values={{ name: 'Alice' }} onChange={() => undefined}>
        <Enforma.TextInput bind="name" label="Name" />
        <Output value={({ name }: Record<string, unknown>) => (typeof name === 'string' ? name : '')} />
      </Form>,
    );
    expect(screen.getByTestId('output')).toHaveTextContent('Alice');
    fireEvent.change(screen.getByTestId('input'), { target: { value: 'Bob' } });
    expect(screen.getByTestId('output')).toHaveTextContent('Bob');
  });

  it('renders with default as="span"', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Output value="text" />
      </Form>,
    );
    expect(screen.getByTestId('output').tagName.toLowerCase()).toBe('span');
  });

  it('renders with a custom as element', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Output value="text" as="strong" />
      </Form>,
    );
    expect(screen.getByTestId('output').tagName.toLowerCase()).toBe('strong');
  });
});
