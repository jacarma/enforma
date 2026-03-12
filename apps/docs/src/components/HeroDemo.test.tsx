// apps/docs/src/components/HeroDemo.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { test, expect } from 'vitest';
import { HeroDemo } from './HeroDemo';

test('renders name and email fields', () => {
  render(<HeroDemo />);
  expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
});

test('email field is disabled until name is entered', async () => {
  const user = userEvent.setup();
  render(<HeroDemo />);
  const email = screen.getByLabelText(/email/i);
  expect(email).toBeDisabled();
  await user.type(screen.getByLabelText(/name/i), 'Alice');
  expect(email).toBeEnabled();
});
