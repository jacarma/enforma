// apps/docs/src/demos/CheckboxSwitchDemos.test.tsx
import { render, screen } from '@testing-library/react';
import { test, expect } from 'vitest';
import {
  BasicDemo,
  ReactiveDisabledDemo,
  SwitchLabelDemo,
  RequiredDemo,
} from './CheckboxSwitchDemos';

test('BasicDemo renders checkbox and switch', () => {
  render(<BasicDemo />);
  expect(screen.getByLabelText(/i agree/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/dark mode/i)).toBeInTheDocument();
});

test('ReactiveDisabledDemo: newsletter disabled until agree checked', () => {
  render(<ReactiveDisabledDemo />);
  expect(screen.getByLabelText(/subscribe/i)).toBeDisabled();
});

test('SwitchLabelDemo renders notifications switch', () => {
  render(<SwitchLabelDemo />);
  expect(screen.getByLabelText(/email notifications/i)).toBeInTheDocument();
});

test('RequiredDemo renders terms checkbox', () => {
  render(<RequiredDemo />);
  expect(screen.getByLabelText(/accept the terms/i)).toBeInTheDocument();
});
