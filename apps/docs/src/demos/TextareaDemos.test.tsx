// apps/docs/src/demos/TextareaDemos.test.tsx
import { render, screen } from '@testing-library/react';
import { test, expect } from 'vitest';
import { BasicDemo, ValidationDemo, ConditionalDemo } from './TextareaDemos';

test('BasicDemo renders bio textarea', () => {
  render(<BasicDemo />);
  expect(screen.getByLabelText(/bio/i)).toBeInTheDocument();
});

test('ValidationDemo renders checkbox and comment textarea', () => {
  render(<ValidationDemo />);
  expect(screen.getByLabelText(/add a comment/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/^comment/i)).toBeInTheDocument();
});

test('ConditionalDemo renders feedback type select', () => {
  render(<ConditionalDemo />);
  expect(screen.getByLabelText(/feedback type/i)).toBeInTheDocument();
});
