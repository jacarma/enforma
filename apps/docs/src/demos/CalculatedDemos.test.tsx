// apps/docs/src/demos/CalculatedDemos.test.tsx
import { render, screen } from '@testing-library/react';
import { test, expect } from 'vitest';
import { BasicDemo, ReactiveDescriptionDemo } from './CalculatedDemos';

test('BasicDemo renders Q1, Q2 and Total', () => {
  render(<BasicDemo />);
  expect(screen.getByLabelText(/^q1/i)).toBeInTheDocument();
  expect(screen.getAllByLabelText(/total/i).length).toBeGreaterThan(0);
});

test('ReactiveDescriptionDemo renders Q1 and Total score', () => {
  render(<ReactiveDescriptionDemo />);
  expect(screen.getByLabelText(/^q1/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/total score/i)).toBeInTheDocument();
});
