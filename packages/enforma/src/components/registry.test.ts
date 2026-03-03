import { describe, it, expect, beforeEach } from 'vitest';
import { registerComponents, getComponent, clearRegistry, getRegistryOptions } from './registry';
import type { ResolvedTextInputProps } from './types';
import React from 'react';

const FakeA: React.ComponentType<ResolvedTextInputProps> = () =>
  React.createElement('div', null, 'A');
const FakeB: React.ComponentType<ResolvedTextInputProps> = () =>
  React.createElement('div', null, 'B');

describe('registry', () => {
  beforeEach(() => {
    clearRegistry();
  });

  it('returns undefined when nothing is registered', () => {
    expect(getComponent('TextInput')).toBeUndefined();
  });

  it('returns the registered component', () => {
    registerComponents({ TextInput: FakeA });
    expect(getComponent('TextInput')).toBe(FakeA);
  });

  it('clearRegistry removes all registered components', () => {
    registerComponents({ TextInput: FakeA });
    clearRegistry();
    expect(getComponent('TextInput')).toBeUndefined();
  });

  it('registerComponents last registration wins for the same key', () => {
    registerComponents({ TextInput: FakeA });
    registerComponents({ TextInput: FakeB });
    expect(getComponent('TextInput')).toBe(FakeB);
  });
});

describe('RegisterOptions', () => {
  beforeEach(() => {
    clearRegistry();
  });

  it('returns empty options when nothing is registered', () => {
    expect(getRegistryOptions()).toEqual({});
  });

  it('stores options passed to registerComponents', () => {
    registerComponents({}, { variant: 'classic' });
    expect(getRegistryOptions()).toEqual({ variant: 'classic' });
  });

  it('stores dateAdapter option', () => {
    registerComponents({}, { dateAdapter: 'dayjs' });
    expect(getRegistryOptions().dateAdapter).toBe('dayjs');
  });

  it('merges options across multiple registerComponents calls', () => {
    registerComponents({}, { variant: 'outlined' });
    registerComponents({}, { dateAdapter: 'dayjs' });
    expect(getRegistryOptions()).toEqual({ variant: 'outlined', dateAdapter: 'dayjs' });
  });

  it('clearRegistry resets options to empty', () => {
    registerComponents({}, { variant: 'classic' });
    clearRegistry();
    expect(getRegistryOptions()).toEqual({});
  });
});
