// apps/docs/src/demos/FieldsetDemos.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { test, expect } from 'vitest';
import { BasicDemo, NestedDemo, ConditionalDemo } from './FieldsetDemos';

test('BasicDemo renders city and zip', () => {
  render(<BasicDemo />);
  expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/zip/i)).toBeInTheDocument();
});

test('NestedDemo renders city, line1, and line2', () => {
  render(<NestedDemo />);
  expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/street line 1/i)).toBeInTheDocument();
});

test('ConditionalDemo: billing fields hidden by default', () => {
  render(<ConditionalDemo />);
  expect(screen.queryByLabelText(/billing street/i)).not.toBeInTheDocument();
});

test('ConditionalDemo: billing fields appear when checkbox checked', async () => {
  const user = userEvent.setup();
  render(<ConditionalDemo />);
  await user.click(screen.getByLabelText(/different billing/i));
  expect(screen.getByLabelText(/billing street/i)).toBeInTheDocument();
});
