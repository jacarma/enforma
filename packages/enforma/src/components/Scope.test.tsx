// packages/enforma/src/components/Scope.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Form } from './Form'
import { TextInput } from './TextInput'
import { Scope } from './Scope'

describe('Scope', () => {
  it('prefixes bind paths for child inputs', async () => {
    const onChange = vi.fn()
    render(
      <Form values={{ address: { city: '' } }} onChange={onChange}>
        <Scope path="address">
          <TextInput bind="city" label="City" />
        </Scope>
      </Form>,
    )
    await userEvent.type(screen.getByLabelText('City'), 'London')
    expect(onChange).toHaveBeenLastCalledWith({ address: { city: 'London' } })
  })

  it('displays the initial value from the scoped path', () => {
    render(
      <Form values={{ address: { city: 'Paris' } }} onChange={vi.fn()}>
        <Scope path="address">
          <TextInput bind="city" label="City" />
        </Scope>
      </Form>,
    )
    expect(screen.getByLabelText('City')).toHaveValue('Paris')
  })

  it('supports nested Scopes', async () => {
    const onChange = vi.fn()
    render(
      <Form values={{ address: { street: { line1: '' } } }} onChange={onChange}>
        <Scope path="address">
          <Scope path="street">
            <TextInput bind="line1" label="Line 1" />
          </Scope>
        </Scope>
      </Form>,
    )
    await userEvent.type(screen.getByLabelText('Line 1'), 'Baker St')
    expect(onChange).toHaveBeenLastCalledWith({
      address: { street: { line1: 'Baker St' } },
    })
  })

  it('does not affect sibling inputs outside the Scope', async () => {
    const onChange = vi.fn()
    render(
      <Form values={{ name: '', address: { city: '' } }} onChange={onChange}>
        <TextInput bind="name" label="Name" />
        <Scope path="address">
          <TextInput bind="city" label="City" />
        </Scope>
      </Form>,
    )
    await userEvent.type(screen.getByLabelText('Name'), 'Alice')
    expect(onChange).toHaveBeenLastCalledWith({ name: 'Alice', address: { city: '' } })
  })
})
