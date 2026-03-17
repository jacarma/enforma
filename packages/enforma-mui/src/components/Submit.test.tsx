import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Enforma, { Form, registerComponents, clearRegistry } from 'enforma';
import type { ResolvedTextInputProps } from 'enforma';
import { Submit } from './Submit';

function MinimalInput({ value, setValue }: ResolvedTextInputProps) {
  return (
    <input
      data-testid="name-input"
      value={value ?? ''}
      onChange={(e) => {
        setValue(e.target.value);
      }}
    />
  );
}

beforeEach(() => {
  clearRegistry();
  registerComponents({ Submit });
});

describe('MUI Submit', () => {
  it('renders a button with default label "Submit"', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.Submit />
      </Form>,
    );
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });

  it('renders a button with custom children', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.Submit>Save changes</Enforma.Submit>
      </Form>,
    );
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });

  it('is disabled when disabled={true}', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.Submit disabled={true} />
      </Form>,
    );
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
  });

  it('is not disabled when disabled={false}', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.Submit disabled={false} />
      </Form>,
    );
    expect(screen.getByRole('button', { name: 'Submit' })).not.toBeDisabled();
  });

  it('disabled fn receives formValid=false when form has validation errors', () => {
    registerComponents({ TextInput: MinimalInput, Submit });
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.TextInput bind="name" label="Name" required />
        <Enforma.Submit disabled={(_, { formValid }) => !formValid} />
      </Form>,
    );
    // Empty required field → formValid=false → disabled=true
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
  });

  it('disabled fn receives formValid=true when form is valid', () => {
    registerComponents({ TextInput: MinimalInput, Submit });
    render(
      <Form values={{ name: 'Alice' }} onChange={() => undefined}>
        <Enforma.TextInput bind="name" label="Name" required />
        <Enforma.Submit disabled={(_, { formValid }) => !formValid} />
      </Form>,
    );
    // Filled required field → formValid=true → disabled=false
    expect(screen.getByRole('button', { name: 'Submit' })).not.toBeDisabled();
  });

  it('re-evaluates disabled fn when form validity changes', () => {
    registerComponents({ TextInput: MinimalInput, Submit });
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.TextInput bind="name" label="Name" required />
        <Enforma.Submit disabled={(_, { formValid }) => !formValid} />
      </Form>,
    );

    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();

    fireEvent.change(screen.getByTestId('name-input'), { target: { value: 'Alice' } });

    expect(screen.getByRole('button', { name: 'Submit' })).not.toBeDisabled();
  });

  it('renders as type="submit"', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.Submit />
      </Form>,
    );
    expect(screen.getByRole('button', { name: 'Submit' })).toHaveAttribute('type', 'submit');
  });
});
