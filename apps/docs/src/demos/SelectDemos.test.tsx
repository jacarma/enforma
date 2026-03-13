// apps/docs/src/demos/SelectDemos.test.tsx
import { render, screen } from '@testing-library/react';
import { test, expect } from 'vitest';
import { BasicDemo, DataSourceDemo, CascadingDemo, OpenChoiceDemo } from './SelectDemos';

test('BasicDemo renders country select', () => {
  render(<BasicDemo />);
  expect(screen.getByLabelText(/country/i)).toBeInTheDocument();
});

test('DataSourceDemo renders country select', () => {
  render(<DataSourceDemo />);
  expect(screen.getByLabelText(/country/i)).toBeInTheDocument();
});

test('CascadingDemo renders country and city selects', () => {
  render(<CascadingDemo />);
  expect(screen.getByLabelText(/country/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
});

test('OpenChoiceDemo renders colour select', () => {
  render(<OpenChoiceDemo />);
  expect(screen.getByLabelText(/favourite colour/i)).toBeInTheDocument();
});
