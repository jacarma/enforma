// apps/docs/src/demos/RadioGroupDemos.test.tsx
import { render, screen } from '@testing-library/react';
import { test, expect } from 'vitest';
import { BasicDemo, HorizontalDataSourceDemo, OpenChoiceDemo } from './RadioGroupDemos';

test('BasicDemo renders size radio group', () => {
  render(<BasicDemo />);
  expect(screen.getByLabelText(/^size/i)).toBeInTheDocument();
});

test('HorizontalDataSourceDemo renders country radio group', () => {
  render(<HorizontalDataSourceDemo />);
  expect(screen.getByLabelText(/country/i)).toBeInTheDocument();
});

test('OpenChoiceDemo renders size radio group', () => {
  render(<OpenChoiceDemo />);
  expect(screen.getByLabelText(/^size/i)).toBeInTheDocument();
});
