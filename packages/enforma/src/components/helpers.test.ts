import { describe, it, expect } from 'vitest';
import { submitDisabled } from './helpers';
import type { SubmitDisabledFn } from './types';

describe('submitDisabled', () => {
  it('returns the same function unchanged', () => {
    const fn: SubmitDisabledFn = (_, { formValid }) => !formValid;
    expect(submitDisabled(fn)).toBe(fn);
  });

  it('infers parameter types without explicit annotation', () => {
    // This must compile without importing SubmitDisabledFn.
    // If TypeScript errors here, the helper is not working.
    const fn = submitDisabled((_, { formValid }) => !formValid);
    expect(typeof fn).toBe('function');
  });
});
