import { describe, it, expect, beforeEach } from 'vitest';
import { registerComponents, getComponent, clearRegistry } from './registry';
import type { TextInputProps } from './types';
import React from 'react';

const FakeA: React.ComponentType<TextInputProps> = () => React.createElement('div', null, 'A');
const FakeB: React.ComponentType<TextInputProps> = () => React.createElement('div', null, 'B');

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
