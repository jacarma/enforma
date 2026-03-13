// apps/docs/src/demos/TextInputDemos.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { test, expect } from 'vitest';
import {
  BasicDemo,
  ValidationDemo,
  ReactiveLabelDemo,
  MaskDemo,
  LengthDemo,
} from './TextInputDemos';

test('BasicDemo renders name input', () => {
  render(<BasicDemo />);
  expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
});

test('ValidationDemo renders email input', () => {
  render(<ValidationDemo />);
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
});

test('ReactiveLabelDemo: email disabled until name entered', async () => {
  const user = userEvent.setup();
  render(<ReactiveLabelDemo />);
  expect(screen.getByLabelText(/email for you/i)).toBeDisabled();
  await user.type(screen.getByLabelText(/^name/i), 'Alice');
  expect(screen.getByLabelText(/email for alice/i)).toBeEnabled();
});

test('MaskDemo renders phone and dob inputs', () => {
  render(<MaskDemo />);
  expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/date of birth/i)).toBeInTheDocument();
});

test('LengthDemo renders username input', () => {
  render(<LengthDemo />);
  expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
});
