// packages/enforma/src/components/SelectOption.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Select, SelectOption } from './fields';

describe('SelectOption', () => {
  it('renders null', () => {
    const { container } = render(<SelectOption label="name" value="code" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('Select.Option', () => {
  it('Select.Option is the SelectOption component', () => {
    expect(Select.Option).toBe(SelectOption);
  });
});
