// apps/docs/src/demos/OutputDemos.test.tsx
import { render, screen } from '@testing-library/react';
import { test, expect } from 'vitest';
import { BasicDemo, StaticDemo } from './OutputDemos';

test('BasicDemo renders greeting and name input', () => {
  render(<BasicDemo />);
  expect(screen.getByText(/stranger/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
});

test('StaticDemo renders instruction text', () => {
  render(<StaticDemo />);
  expect(screen.getByText(/all fields marked with/i)).toBeInTheDocument();
});
