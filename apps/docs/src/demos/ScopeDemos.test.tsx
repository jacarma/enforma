// apps/docs/src/demos/ScopeDemos.test.tsx
import { render, screen } from '@testing-library/react';
import { test, expect } from 'vitest';
import { BasicDemo, NestedAddressDemo } from './ScopeDemos';

test('BasicDemo renders city and zip', () => {
  render(<BasicDemo />);
  expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/^zip/i)).toBeInTheDocument();
});

test('NestedAddressDemo renders street, city, zip', () => {
  render(<NestedAddressDemo />);
  expect(screen.getByLabelText(/street/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/^zip/i)).toBeInTheDocument();
});
