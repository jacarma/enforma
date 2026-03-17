// apps/docs/src/demos/ReactivePropsDemo.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { test, expect } from 'vitest';
import {
  ReactiveDisabledDemo,
  ReactiveLabelDemo,
  ReactivePlaceholderDemo,
  ReactiveValidationDemo,
} from './ReactivePropsDemo';

test('ReactiveDisabledDemo: email disabled until name entered', async () => {
  const user = userEvent.setup();
  render(<ReactiveDisabledDemo />);
  expect(screen.getByLabelText(/email/i)).toBeDisabled();
  await user.type(screen.getByLabelText(/name/i), 'Alice');
  expect(screen.getByLabelText(/email/i)).toBeEnabled();
});

test('ReactiveLabelDemo: label changes based on contact type', async () => {
  const user = userEvent.setup();
  render(<ReactiveLabelDemo />);
  expect(screen.getByLabelText(/personal email/i)).toBeInTheDocument();
  await user.click(screen.getByRole('combobox'));
  await user.click(screen.getByRole('option', { name: /work/i }));
  expect(screen.getByLabelText(/work email/i)).toBeInTheDocument();
});

test('ReactivePlaceholderDemo: renders handle input', () => {
  render(<ReactivePlaceholderDemo />);
  expect(screen.getByLabelText(/handle/i)).toBeInTheDocument();
});

test('ReactiveValidationDemo: shows error when delivery selected without address', async () => {
  const user = userEvent.setup();
  render(<ReactiveValidationDemo />);
  await user.click(screen.getByRole('combobox'));
  await user.click(screen.getByRole('option', { name: /delivery/i }));
  await user.click(screen.getByRole('button', { name: /submit/i }));
  expect(screen.getByText(/address is required for delivery/i)).toBeInTheDocument();
});
