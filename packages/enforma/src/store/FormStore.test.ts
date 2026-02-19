// packages/enforma/src/store/FormStore.test.ts
import { describe, it, expect, vi } from 'vitest'
import { FormStore } from './FormStore'

describe('FormStore', () => {
  describe('getField', () => {
    it('gets a top-level field', () => {
      const store = new FormStore({ name: 'Alice' })
      expect(store.getField('name')).toBe('Alice')
    })

    it('gets a nested field via dot-path', () => {
      const store = new FormStore({ user: { name: 'Alice' } })
      expect(store.getField('user.name')).toBe('Alice')
    })

    it('returns undefined for a missing field', () => {
      const store = new FormStore({})
      expect(store.getField('missing')).toBeUndefined()
    })

    it('returns undefined for a missing nested field', () => {
      const store = new FormStore({ user: {} })
      expect(store.getField('user.missing')).toBeUndefined()
    })
  })

  describe('setField', () => {
    it('sets a top-level field', () => {
      const store = new FormStore({ name: '' })
      store.setField('name', 'Bob')
      expect(store.getField('name')).toBe('Bob')
    })

    it('sets a nested field via dot-path', () => {
      const store = new FormStore({ user: { name: '' } })
      store.setField('user.name', 'Bob')
      expect(store.getField('user.name')).toBe('Bob')
    })

    it('does not mutate other fields when setting', () => {
      const store = new FormStore({ name: 'Alice', email: 'a@b.com' })
      store.setField('name', 'Bob')
      expect(store.getField('email')).toBe('a@b.com')
    })

    it('notifies all subscribers after a set', () => {
      const store = new FormStore({ name: '' })
      const cb1 = vi.fn()
      const cb2 = vi.fn()
      store.subscribe(cb1)
      store.subscribe(cb2)
      store.setField('name', 'Bob')
      expect(cb1).toHaveBeenCalledOnce()
      expect(cb2).toHaveBeenCalledOnce()
    })
  })

  describe('subscribe', () => {
    it('returns an unsubscribe function that stops notifications', () => {
      const store = new FormStore({ name: '' })
      const cb = vi.fn()
      const unsubscribe = store.subscribe(cb)
      unsubscribe()
      store.setField('name', 'Bob')
      expect(cb).not.toHaveBeenCalled()
    })
  })

  describe('getSnapshot', () => {
    it('returns the current values object', () => {
      const store = new FormStore({ name: 'Alice' })
      expect(store.getSnapshot()).toMatchObject({ name: 'Alice' })
    })

    it('returns a new object reference after setField', () => {
      const store = new FormStore({ name: '' })
      const before = store.getSnapshot()
      store.setField('name', 'Bob')
      const after = store.getSnapshot()
      expect(before).not.toBe(after)
    })
  })

  describe('registerValidator', () => {
    it('initializes the error immediately on registration', () => {
      const store = new FormStore({ name: '' })
      store.registerValidator('name', () => 'required')
      expect(store.getError('name')).toBe('required')
    })

    it('initializes null when the validator passes', () => {
      const store = new FormStore({ name: 'Alice' })
      store.registerValidator('name', () => null)
      expect(store.getError('name')).toBeNull()
    })

    it('returns an unregister function that removes the validator and error', () => {
      const store = new FormStore({ name: '' })
      const unregister = store.registerValidator('name', () => 'required')
      unregister()
      expect(store.getError('name')).toBeNull()
    })

    it('notifies subscribers after registration', () => {
      const store = new FormStore({ name: '' })
      const cb = vi.fn()
      store.subscribe(cb)
      store.registerValidator('name', () => 'required')
      expect(cb).toHaveBeenCalledOnce()
    })
  })

  describe('touchField', () => {
    it('marks the field as touched', () => {
      const store = new FormStore({ name: '' })
      expect(store.isTouched('name')).toBe(false)
      store.touchField('name')
      expect(store.isTouched('name')).toBe(true)
    })

    it('notifies subscribers', () => {
      const store = new FormStore({ name: '' })
      const cb = vi.fn()
      store.subscribe(cb)
      store.touchField('name')
      expect(cb).toHaveBeenCalledOnce()
    })
  })

  describe('setSubmitted', () => {
    it('marks the form as submitted', () => {
      const store = new FormStore({})
      expect(store.isSubmitted()).toBe(false)
      store.setSubmitted()
      expect(store.isSubmitted()).toBe(true)
    })

    it('re-runs all validators and updates errors', () => {
      const store = new FormStore({ name: '' })
      store.registerValidator('name', () =>
        store.getField('name') === '' ? 'required' : null,
      )
      store.setSubmitted()
      expect(store.getError('name')).toBe('required')
    })

    it('notifies subscribers', () => {
      const store = new FormStore({})
      const cb = vi.fn()
      store.subscribe(cb)
      store.setSubmitted()
      expect(cb).toHaveBeenCalledOnce()
    })
  })

  describe('isValid', () => {
    it('returns true when no validators are registered', () => {
      const store = new FormStore({})
      expect(store.isValid()).toBe(true)
    })

    it('returns true when all validators pass', () => {
      const store = new FormStore({ name: 'Alice' })
      store.registerValidator('name', () => null)
      expect(store.isValid()).toBe(true)
    })

    it('returns false when any validator has an error', () => {
      const store = new FormStore({ name: '' })
      store.registerValidator('name', () => 'required')
      expect(store.isValid()).toBe(false)
    })
  })

  describe('getErrors', () => {
    it('returns all current errors as a plain object', () => {
      const store = new FormStore({ name: '', email: 'a@b.com' })
      store.registerValidator('name', () => 'required')
      store.registerValidator('email', () => null)
      expect(store.getErrors()).toEqual({ name: 'required', email: null })
    })
  })

  describe('setField re-runs validators', () => {
    it('re-runs all validators after a field change', () => {
      const store = new FormStore({ name: '' })
      store.registerValidator('name', () =>
        store.getField('name') === '' ? 'required' : null,
      )
      expect(store.getError('name')).toBe('required')
      store.setField('name', 'Alice')
      expect(store.getError('name')).toBeNull()
    })
  })

  describe('appendItem', () => {
    it('appends a value to an existing array', () => {
      const store = new FormStore({ items: [{ name: 'Alice' }] })
      store.appendItem('items', { name: 'Bob' })
      expect(store.getField('items')).toEqual([{ name: 'Alice' }, { name: 'Bob' }])
    })

    it('creates the array when none exists at path', () => {
      const store = new FormStore({})
      store.appendItem('items', { name: 'Alice' })
      expect(store.getField('items')).toEqual([{ name: 'Alice' }])
    })

    it('notifies subscribers', () => {
      const store = new FormStore({ items: [] })
      const cb = vi.fn()
      store.subscribe(cb)
      store.appendItem('items', { name: 'Alice' })
      expect(cb).toHaveBeenCalledOnce()
    })
  })

  describe('removeItem', () => {
    it('removes the item at the given index', () => {
      const store = new FormStore({ items: [{ name: 'Alice' }, { name: 'Bob' }] })
      store.removeItem('items', 0)
      expect(store.getField('items')).toEqual([{ name: 'Bob' }])
    })

    it('notifies subscribers', () => {
      const store = new FormStore({ items: [{ name: 'Alice' }] })
      const cb = vi.fn()
      store.subscribe(cb)
      store.removeItem('items', 0)
      expect(cb).toHaveBeenCalledOnce()
    })

    it('does nothing when path is not an array', () => {
      const store = new FormStore({ name: 'Alice' })
      store.removeItem('name', 0)
      expect(store.getField('name')).toBe('Alice')
    })
  })
})
