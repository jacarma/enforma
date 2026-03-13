// apps/docs/src/demos/FormDemos.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { test, expect } from 'vitest';
import { BasicDemo, SubmitDemo, DataSourcesDemo, ValidityDemo } from './FormDemos';

test('BasicDemo renders a name input', () => {
  render(<BasicDemo />);
  expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
});

test('SubmitDemo shows Submitted! after clicking submit with a name', async () => {
  const user = userEvent.setup();
  render(<SubmitDemo />);
  await user.type(screen.getByLabelText(/name/i), 'Alice');
  await user.click(screen.getByRole('button', { name: /submit/i }));
  expect(screen.getByText(/submitted!/i)).toBeInTheDocument();
});

test('DataSourcesDemo renders a country select', () => {
  render(<DataSourcesDemo />);
  expect(screen.getByLabelText(/country/i)).toBeInTheDocument();
});

test('ValidityDemo shows validity state', () => {
  render(<ValidityDemo />);
  expect(screen.getByText(/form valid/i)).toBeInTheDocument();
});
