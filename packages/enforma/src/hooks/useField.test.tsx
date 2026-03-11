import { describe, it, expect, vi } from 'vitest';
import { render, renderHook, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { Form } from '../components/Form';
import { TextInput } from '../components/fields';
import { useFieldProps, useVisibility } from './useField';
import type { FieldResolved, ToComponentProps } from '../components/types';
import { FormContext } from '../context/FormContext';
import { ScopeContext } from '../context/ScopeContext';
import { FormStore } from '../store/FormStore';

function makeWrapper(store: FormStore) {
  return ({ children }: { children: ReactNode }) => (
    <FormContext.Provider value={store}>
      <ScopeContext.Provider value={{ store, prefix: '' }}>{children}</ScopeContext.Provider>
    </FormContext.Provider>
  );
}

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

describe('useVisibility', () => {
  it('returns false for both when no props given', () => {
    const store = new FormStore({});
    const { result } = renderHook(() => useVisibility(undefined, undefined, undefined), {
      wrapper: makeWrapper(store),
    });
    expect(result.current.isHidden).toBe(false);
    expect(result.current.isRemoved).toBe(false);
  });

  it('resolves static hidden=true', () => {
    const store = new FormStore({});
    const { result } = renderHook(() => useVisibility('name', true, undefined), {
      wrapper: makeWrapper(store),
    });
    expect(result.current.isHidden).toBe(true);
    expect(result.current.isRemoved).toBe(false);
  });

  it('resolves reactive hidden from store values', () => {
    const store = new FormStore({ flag: false });
    const { result } = renderHook(() => useVisibility('name', (v) => v.flag === true, undefined), {
      wrapper: makeWrapper(store),
    });
    expect(result.current.isHidden).toBe(false);
    act(() => {
      store.setField('flag', true);
    });
    expect(result.current.isHidden).toBe(true);
  });

  it('deletes from store when removed becomes true', () => {
    const store = new FormStore({ flag: false, name: 'Alice' });
    renderHook(() => useVisibility('name', undefined, (v) => v.flag === true), {
      wrapper: makeWrapper(store),
    });
    expect(store.getField('name')).toBe('Alice');
    act(() => {
      store.setField('flag', true);
    });
    expect(store.getField('name')).toBeUndefined();
  });

  it('does not delete from store when only hidden', () => {
    const store = new FormStore({ flag: false, name: 'Alice' });
    renderHook(() => useVisibility('name', (v) => v.flag === true, undefined), {
      wrapper: makeWrapper(store),
    });
    act(() => {
      store.setField('flag', true);
    });
    expect(store.getField('name')).toBe('Alice');
  });

  it('deletes from store on unmount when removed is true at unmount time', () => {
    const store = new FormStore({ flag: true, name: 'Alice' });
    const { unmount } = renderHook(() => useVisibility('name', undefined, (v) => v.flag === true), {
      wrapper: makeWrapper(store),
    });
    // Immediately unmount (simulates parent-first removal)
    unmount();
    expect(store.getField('name')).toBeUndefined();
  });

  it('removed=true takes precedence over hidden=true', () => {
    const store = new FormStore({ name: 'Alice' });
    const { result } = renderHook(() => useVisibility('name', true, true), {
      wrapper: makeWrapper(store),
    });
    expect(result.current.isRemoved).toBe(true);
    expect(result.current.isHidden).toBe(false);
  });

  it('does not attempt store deletion when bind is undefined', () => {
    const store = new FormStore({ name: 'Alice' });
    expect(() => {
      renderHook(() => useVisibility(undefined, undefined, true), { wrapper: makeWrapper(store) });
    }).not.toThrow();
    expect(store.getField('name')).toBe('Alice');
  });
});

describe('useFieldValidation skip (via useFieldProps)', () => {
  it('does not register validator when field is hidden', async () => {
    const onSubmit = vi.fn();
    render(
      <Form values={{ name: '' }} onChange={vi.fn()} onSubmit={onSubmit} showErrors>
        <TextInput bind="name" label="Name" hidden validate={() => 'always-error'} />
        <button type="submit">Submit</button>
      </Form>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onSubmit).toHaveBeenCalled();
  });

  it('does not register validator when field is removed', async () => {
    const onSubmit = vi.fn();
    render(
      <Form values={{ name: '' }} onChange={vi.fn()} onSubmit={onSubmit} showErrors>
        <TextInput bind="name" label="Name" removed validate={() => 'always-error'} />
        <button type="submit">Submit</button>
      </Form>,
    );
    await act(() => Promise.resolve());
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onSubmit).toHaveBeenCalled();
  });
});
