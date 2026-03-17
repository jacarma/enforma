// apps/docs/src/demos/ValidationDemos.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { test, expect } from 'vitest';
import { ValidateDemo, CrossFieldValidationDemo, ConstraintsDemo } from './ValidationDemos';

test('ValidateDemo: shows error for missing email on submit', async () => {
  const user = userEvent.setup();
  render(<ValidateDemo />);
  await user.click(screen.getByRole('button', { name: /submit/i }));
  expect(screen.getByText(/email is required/i)).toBeInTheDocument();
});

test('ValidateDemo: shows error for invalid email', async () => {
  const user = userEvent.setup();
  render(<ValidateDemo />);
  await user.type(screen.getByLabelText(/email/i), 'notanemail');
  await user.tab();
  expect(screen.getByText(/enter a valid email/i)).toBeInTheDocument();
});

test('CrossFieldValidationDemo: shows error when passwords do not match', async () => {
  const user = userEvent.setup();
  render(<CrossFieldValidationDemo />);
  await user.type(screen.getByLabelText(/^password/i), 'secret');
  await user.type(screen.getByLabelText(/confirm password/i), 'wrong');
  await user.tab();
  expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
});

test('ConstraintsDemo: renders username input', () => {
  render(<ConstraintsDemo />);
  expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
});
