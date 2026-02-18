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
})
