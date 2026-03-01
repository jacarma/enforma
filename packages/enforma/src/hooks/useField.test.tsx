import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { Form } from '../components/Form';
import { useFieldProps } from './useField';
import type { FieldResolved, ToComponentProps } from '../components/types';

type TestResolved = FieldResolved<string> & { highlight: string | undefined };
type TestProps = ToComponentProps<TestResolved>;

describe('useFieldProps — extra reactive props', () => {
  it('passes a static extra prop through to the resolved result', () => {
    const received: unknown[] = [];

    function CaptureField(props: TestProps) {
      const res = useFieldProps<TestResolved>(props);
      received.push((res as Record<string, unknown>).highlight);
      return null;
    }

    render(
      <Form values={{}} onChange={vi.fn()}>
        <CaptureField bind="x" highlight="blue" />
      </Form>,
    );

    expect(received[0]).toBe('blue');
  });

  it('resolves a reactive extra prop against form values', () => {
    const received: unknown[] = [];

    function CaptureField(props: TestProps) {
      const res = useFieldProps<TestResolved>(props);
      received.push((res as Record<string, unknown>).highlight);
      return null;
    }

    render(
      <Form values={{ mode: 'vip' }} onChange={vi.fn()}>
        <CaptureField bind="x" highlight={({ mode }) => (mode === 'vip' ? 'gold' : 'grey')} />
      </Form>,
    );

    expect(received[0]).toBe('gold');
  });
});
