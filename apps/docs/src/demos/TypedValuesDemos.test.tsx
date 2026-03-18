// apps/docs/src/demos/TypedValuesDemos.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Enforma, { type OnChangeArg } from 'enforma';
import { OnChangeArgDemo } from './TypedValuesDemos';

describe('OnChangeArgDemo', () => {
  it('renders the form', () => {
    render(<OnChangeArgDemo />);
    expect(screen.getByRole('form')).toBeInTheDocument();
  });

  it('calls onChange with OnChangeArg when typing', async () => {
    const onChange = vi.fn<(arg: OnChangeArg<{ name: string; email: string }>) => void>();
    render(
      <Enforma.Form<{ name: string; email: string }>
        values={{ name: '', email: '' }}
        onChange={onChange}
      >
        <Enforma.TextInput bind="name" label="Name" />
      </Enforma.Form>,
    );
    const inputs = screen.getAllByRole('textbox');
    await userEvent.type(inputs[0], 'A');
    const lastArg = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0];
    expect(lastArg).toBeDefined();
    expect(lastArg).toHaveProperty('isValid');
    expect(lastArg).toHaveProperty('values');
    expect(lastArg).toHaveProperty('errors');
  });
});
