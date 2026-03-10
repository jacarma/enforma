// packages/enforma/src/store/FormStore.test.ts
import { describe, it, expect, vi } from 'vitest';
import { FormStore } from './FormStore';

describe('FormStore', () => {
  describe('getField', () => {
    it('gets a top-level field', () => {
      const store = new FormStore({ name: 'Alice' });
      expect(store.getField('name')).toBe('Alice');
    });

    it('gets a nested field via dot-path', () => {
      const store = new FormStore({ user: { name: 'Alice' } });
      expect(store.getField('user.name')).toBe('Alice');
    });

    it('returns undefined for a missing field', () => {
      const store = new FormStore({});
      expect(store.getField('missing')).toBeUndefined();
    });

    it('returns undefined for a missing nested field', () => {
      const store = new FormStore({ user: {} });
      expect(store.getField('user.missing')).toBeUndefined();
    });
  });

  describe('setField', () => {
    it('sets a top-level field', () => {
      const store = new FormStore({ name: '' });
      store.setField('name', 'Bob');
      expect(store.getField('name')).toBe('Bob');
    });

    it('sets a nested field via dot-path', () => {
      const store = new FormStore({ user: { name: '' } });
      store.setField('user.name', 'Bob');
      expect(store.getField('user.name')).toBe('Bob');
    });

    it('does not mutate other fields when setting', () => {
      const store = new FormStore({ name: 'Alice', email: 'a@b.com' });
      store.setField('name', 'Bob');
      expect(store.getField('email')).toBe('a@b.com');
    });

    it('notifies all subscribers after a set', () => {
      const store = new FormStore({ name: '' });
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      store.subscribe(cb1);
      store.subscribe(cb2);
      store.setField('name', 'Bob');
      expect(cb1).toHaveBeenCalledOnce();
      expect(cb2).toHaveBeenCalledOnce();
    });
  });

  describe('subscribe', () => {
    it('returns an unsubscribe function that stops notifications', () => {
      const store = new FormStore({ name: '' });
      const cb = vi.fn();
      const unsubscribe = store.subscribe(cb);
      unsubscribe();
      store.setField('name', 'Bob');
      expect(cb).not.toHaveBeenCalled();
    });
  });

  describe('getSnapshot', () => {
    it('returns the current values object', () => {
      const store = new FormStore({ name: 'Alice' });
      expect(store.getSnapshot()).toMatchObject({ name: 'Alice' });
    });

    it('returns a new object reference after setField', () => {
      const store = new FormStore({ name: '' });
      const before = store.getSnapshot();
      store.setField('name', 'Bob');
      const after = store.getSnapshot();
      expect(before).not.toBe(after);
    });
  });

  describe('registerValidator', () => {
    it('initializes the error immediately on registration', () => {
      const store = new FormStore({ name: '' });
      store.registerValidator('name', () => 'required');
      expect(store.getError('name')).toBe('required');
    });

    it('initializes null when the validator passes', () => {
      const store = new FormStore({ name: 'Alice' });
      store.registerValidator('name', () => null);
      expect(store.getError('name')).toBeNull();
    });

    it('returns an unregister function that removes the validator and error', () => {
      const store = new FormStore({ name: '' });
      const unregister = store.registerValidator('name', () => 'required');
      unregister();
      expect(store.getError('name')).toBeNull();
    });

    it('notifies subscribers after registration', () => {
      const store = new FormStore({ name: '' });
      const cb = vi.fn();
      store.subscribe(cb);
      store.registerValidator('name', () => 'required');
      expect(cb).toHaveBeenCalledOnce();
    });
  });

  describe('touchField', () => {
    it('marks the field as touched', () => {
      const store = new FormStore({ name: '' });
      expect(store.isTouched('name')).toBe(false);
      store.touchField('name');
      expect(store.isTouched('name')).toBe(true);
    });

    it('notifies subscribers', () => {
      const store = new FormStore({ name: '' });
      const cb = vi.fn();
      store.subscribe(cb);
      store.touchField('name');
      expect(cb).toHaveBeenCalledOnce();
    });
  });

  describe('setSubmitted', () => {
    it('marks the form as submitted', () => {
      const store = new FormStore({});
      expect(store.isSubmitted()).toBe(false);
      store.setSubmitted();
      expect(store.isSubmitted()).toBe(true);
    });

    it('re-runs all validators and updates errors', () => {
      const store = new FormStore({ name: '' });
      store.registerValidator('name', () => (store.getField('name') === '' ? 'required' : null));
      store.setSubmitted();
      expect(store.getError('name')).toBe('required');
    });

    it('notifies subscribers', () => {
      const store = new FormStore({});
      const cb = vi.fn();
      store.subscribe(cb);
      store.setSubmitted();
      expect(cb).toHaveBeenCalledOnce();
    });
  });

  describe('isValid', () => {
    it('returns true when no validators are registered', () => {
      const store = new FormStore({});
      expect(store.isValid()).toBe(true);
    });

    it('returns true when all validators pass', () => {
      const store = new FormStore({ name: 'Alice' });
      store.registerValidator('name', () => null);
      expect(store.isValid()).toBe(true);
    });

    it('returns false when any validator has an error', () => {
      const store = new FormStore({ name: '' });
      store.registerValidator('name', () => 'required');
      expect(store.isValid()).toBe(false);
    });
  });

  describe('getErrors', () => {
    it('returns all current errors as a plain object', () => {
      const store = new FormStore({ name: '', email: 'a@b.com' });
      store.registerValidator('name', () => 'required');
      store.registerValidator('email', () => null);
      expect(store.getErrors()).toEqual({ name: 'required', email: null });
    });
  });

  describe('setField re-runs validators', () => {
    it('re-runs all validators after a field change', () => {
      const store = new FormStore({ name: '' });
      store.registerValidator('name', () => (store.getField('name') === '' ? 'required' : null));
      expect(store.getError('name')).toBe('required');
      store.setField('name', 'Alice');
      expect(store.getError('name')).toBeNull();
    });
  });

  describe('deleteField', () => {
    it('deletes a top-level key', () => {
      const store = new FormStore({ name: 'Alice', email: 'a@b.com' });
      store.deleteField('name');
      expect(store.getField('name')).toBeUndefined();
      expect(store.getField('email')).toBe('a@b.com');
    });

    it('deletes a nested key via dot-path', () => {
      const store = new FormStore({ address: { city: 'NY', zip: '10001' } });
      store.deleteField('address.city');
      expect(store.getField('address.city')).toBeUndefined();
      expect(store.getField('address.zip')).toBe('10001');
    });

    it('deletes a deeply nested object key', () => {
      const store = new FormStore({ a: { b: { c: 'deep' } } });
      store.deleteField('a.b');
      expect(store.getField('a.b')).toBeUndefined();
      expect(store.getField('a')).toEqual({});
    });

    it('is a no-op when the path does not exist', () => {
      const store = new FormStore({ name: 'Alice' });
      expect(() => {
        store.deleteField('missing');
      }).not.toThrow();
      expect(() => {
        store.deleteField('a.b.c');
      }).not.toThrow();
      expect(store.getField('name')).toBe('Alice');
    });

    it('notifies subscribers after deletion', () => {
      const store = new FormStore({ name: 'Alice' });
      const cb = vi.fn();
      store.subscribe(cb);
      store.deleteField('name');
      expect(cb).toHaveBeenCalledOnce();
    });

    it('does not notify subscribers when path does not exist (no-op)', () => {
      const store = new FormStore({ name: 'Alice' });
      const cb = vi.fn();
      store.subscribe(cb);
      store.deleteField('missing');
      expect(cb).not.toHaveBeenCalled();
    });

    it('removes the entire nested key, including all children', () => {
      const store = new FormStore({ address: { city: 'NY', zip: '10001' } });
      store.deleteField('address');
      expect(store.getField('address')).toBeUndefined();
      expect(store.getSnapshot()).toEqual({});
    });
  });
});
