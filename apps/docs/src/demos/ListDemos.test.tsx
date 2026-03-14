// apps/docs/src/demos/ListDemos.test.tsx
import { render, screen } from '@testing-library/react';
import { test, expect } from 'vitest';
import { BasicDemo, MinMaxDemo } from './ListDemos';

test('BasicDemo renders an Add button', () => {
  render(<BasicDemo />);
  expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
});

test('MinMaxDemo renders an Add button', () => {
  render(<MinMaxDemo />);
  expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
});
