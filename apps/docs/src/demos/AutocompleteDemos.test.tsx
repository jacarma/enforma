// apps/docs/src/demos/AutocompleteDemos.test.tsx
import { render, screen } from '@testing-library/react';
import { test, expect } from 'vitest';
import { BasicDemo, AsyncSourceDemo } from './AutocompleteDemos';

test('BasicDemo renders country autocomplete', () => {
  render(<BasicDemo />);
  expect(screen.getByLabelText(/country/i)).toBeInTheDocument();
});

test('AsyncSourceDemo renders book autocomplete', () => {
  render(<AsyncSourceDemo />);
  expect(screen.getByLabelText(/book/i)).toBeInTheDocument();
});
