// apps/docs/src/demos/NumberInputDemos.test.tsx
import { render, screen } from '@testing-library/react';
import { test, expect } from 'vitest';
import { BasicDemo, IntegerDemo, PercentageDemo } from './NumberInputDemos';

test('BasicDemo renders price input', () => {
  render(<BasicDemo />);
  expect(screen.getByLabelText(/price/i)).toBeInTheDocument();
});

test('IntegerDemo renders quantity input', () => {
  render(<IntegerDemo />);
  expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument();
});

test('PercentageDemo renders rate input', () => {
  render(<PercentageDemo />);
  expect(screen.getByLabelText(/rate/i)).toBeInTheDocument();
});
