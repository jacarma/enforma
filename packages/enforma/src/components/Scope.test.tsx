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

  it('passes scoped values as first arg and all values as second arg to reactive props', () => {
    const receivedArgs: [unknown, unknown][] = []

    render(
      <Form
        values={{ name: 'Alice', address: { city: 'London' } }}
        onChange={vi.fn()}
      >
        <Scope path="address">
          <TextInput
            bind="city"
            label="City"
            placeholder={(scopeValues, allValues) => {
              receivedArgs.push([scopeValues, allValues])
              return 'placeholder'
            }}
          />
        </Scope>
      </Form>,
    )

    expect(receivedArgs.length).toBeGreaterThan(0)
    const [scopeValues, allValues] = receivedArgs[0]
    // scopeValues is the object at the 'address' prefix
    expect(scopeValues).toEqual({ city: 'London' })
    // allValues is the full form root
    expect(allValues).toEqual({ name: 'Alice', address: { city: 'London' } })
  })

  it('receives allValues equal to scopeValues at form root (no Scope)', () => {
    const receivedArgs: [unknown, unknown][] = []

    render(
      <Form values={{ name: 'Alice' }} onChange={vi.fn()}>
        <TextInput
          bind="name"
          label="Name"
          placeholder={(scopeValues, allValues) => {
            receivedArgs.push([scopeValues, allValues])
            return 'placeholder'
          }}
        />
      </Form>,
    )

    expect(receivedArgs.length).toBeGreaterThan(0)
    const [scopeValues, allValues] = receivedArgs[0]
    expect(scopeValues).toEqual(allValues)
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
