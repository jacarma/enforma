// apps/docs/src/demos/DateTimeDemos.test.tsx
import { render, screen } from '@testing-library/react';
import { test, expect } from 'vitest';
import { BasicDemo, PastOnlyDemo, TwentyFourHourDemo } from './DateTimeDemos';

test('BasicDemo renders all three pickers', () => {
  render(<BasicDemo />);
  expect(screen.getByLabelText(/birthday/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/meeting time/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/deadline/i)).toBeInTheDocument();
});

test('PastOnlyDemo renders birthday date picker', () => {
  render(<PastOnlyDemo />);
  expect(screen.getByLabelText(/birthday/i)).toBeInTheDocument();
});

test('TwentyFourHourDemo renders start time picker', () => {
  render(<TwentyFourHourDemo />);
  expect(screen.getByLabelText(/start time/i)).toBeInTheDocument();
});
