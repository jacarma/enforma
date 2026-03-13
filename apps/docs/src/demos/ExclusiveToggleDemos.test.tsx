// apps/docs/src/demos/ExclusiveToggleDemos.test.tsx
import { render, screen } from '@testing-library/react';
import { test, expect } from 'vitest';
import { BasicDemo, OpenChoiceDemo } from './ExclusiveToggleDemos';

test('BasicDemo renders size toggle', () => {
  render(<BasicDemo />);
  expect(screen.getByLabelText(/^size/i)).toBeInTheDocument();
});

test('OpenChoiceDemo renders format toggle', () => {
  render(<OpenChoiceDemo />);
  expect(screen.getByLabelText(/format/i)).toBeInTheDocument();
});
