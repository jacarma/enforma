// apps/docs/src/components/Preview.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { test, expect } from 'vitest';
import { Preview } from './Preview';
import Enforma from 'enforma';

test('renders children inside a form', () => {
  render(
    <Preview>
      <Enforma.TextInput bind="name" label="Name" />
    </Preview>,
  );
  expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
});

test('wraps content in .preview-card', () => {
  const { container } = render(
    <Preview>
      <Enforma.TextInput bind="name" label="Name" />
    </Preview>,
  );
  expect(container.querySelector('.preview-card')).toBeInTheDocument();
});

test('manages form state internally', async () => {
  const user = userEvent.setup();
  render(
    <Preview>
      <Enforma.TextInput bind="name" label="Name" />
    </Preview>,
  );
  await user.type(screen.getByLabelText(/name/i), 'Alice');
  expect(screen.getByLabelText(/name/i)).toHaveValue('Alice');
});

test('accepts initialValues', () => {
  render(
    <Preview initialValues={{ name: 'Bob' }}>
      <Enforma.TextInput bind="name" label="Name" />
    </Preview>,
  );
  expect(screen.getByLabelText(/name/i)).toHaveValue('Bob');
});
