// packages/enforma/src/components/TextInput.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSyncExternalStore, useId } from 'react'
import { Form } from './Form'
import { TextInput } from './TextInput'
import { useFormStore } from '../context/FormContext'

function renderWithForm(
  initialValues: Record<string, unknown>,
  onChange = vi.fn(),
) {
  return render(
    <Form values={initialValues} onChange={onChange}>
      <TextInput bind="name" label="Name" />
    </Form>,
  )
}

describe('TextInput', () => {
  it('renders an input with a label', () => {
    renderWithForm({ name: '' })
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
  })

  it('displays the initial value from the form state', () => {
    renderWithForm({ name: 'Alice' })
    expect(screen.getByLabelText('Name')).toHaveValue('Alice')
  })

  it('calls onChange with updated values when the user types', async () => {
    const onChange = vi.fn()
    renderWithForm({ name: '' }, onChange)
    await userEvent.type(screen.getByLabelText('Name'), 'Bob')
    expect(onChange).toHaveBeenLastCalledWith({ name: 'Bob' })
  })

  it('renders a placeholder when provided', () => {
    render(
      <Form values={{ name: '' }} onChange={vi.fn()}>
        <TextInput bind="name" label="Name" placeholder="Enter name" />
      </Form>,
    )
    expect(screen.getByPlaceholderText('Enter name')).toBeInTheDocument()
  })

  it('disables the input when disabled prop is a function returning true', () => {
    render(
      <Form values={{ name: '', email: '' }} onChange={vi.fn()}>
        <TextInput bind="email" label="Email" disabled={(_, all) => all.name === ''} />
      </Form>,
    )
    expect(screen.getByLabelText('Email')).toBeDisabled()
  })

  it('re-enables the input when the reactive disabled function returns false', async () => {
    render(
      <Form values={{ name: '', email: '' }} onChange={vi.fn()}>
        <TextInput bind="name" label="Name" />
        <TextInput bind="email" label="Email" disabled={(_, all) => all.name === ''} />
      </Form>,
    )
    expect(screen.getByLabelText('Email')).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Name'), 'Alice')
    expect(screen.getByLabelText('Email')).not.toBeDisabled()
  })

  it('renders a reactive label based on form values', async () => {
    render(
      <Form values={{ type: 'personal', email: '' }} onChange={vi.fn()}>
        <TextInput bind="type" label="Type" />
        <TextInput
          bind="email"
          label={(_, all) => all.type === 'work' ? 'Work Email' : 'Personal Email'}
        />
      </Form>,
    )
    expect(screen.getByLabelText('Personal Email')).toBeInTheDocument()
    await userEvent.clear(screen.getByLabelText('Type'))
    await userEvent.type(screen.getByLabelText('Type'), 'work')
    expect(screen.getByLabelText('Work Email')).toBeInTheDocument()
  })

  it('renders a reactive placeholder based on form values', async () => {
    render(
      <Form values={{ name: '', email: '' }} onChange={vi.fn()}>
        <TextInput bind="name" label="Name" />
        <TextInput
          bind="email"
          label="Email"
          placeholder={(_, all) =>
            all.name === '' ? 'Enter your email' : `Enter email for ${String(all.name)}`
          }
        />
      </Form>,
    )
    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Name'), 'Alice')
    expect(screen.getByPlaceholderText('Enter email for Alice')).toBeInTheDocument()
  })

  it('only re-renders when its own bound field changes', async () => {
    let nameRenderCount = 0
    let emailRenderCount = 0

    // Components that subscribe directly via useSyncExternalStore so they
    // re-render only when their own field's snapshot value changes.
    function CountingNameInput() {
      const store = useFormStore()
      const id = useId()
      nameRenderCount++
      const value = useSyncExternalStore(
        (cb) => store.subscribe(cb),
        () => {
          const v = store.getField('name')
          return typeof v === 'string' ? v : ''
        },
      )
      return (
        <>
          <label htmlFor={id}>Name</label>
          <input id={id} type="text" value={value} onChange={(e) => { store.setField('name', e.target.value) }} />
        </>
      )
    }

    function CountingEmailInput() {
      const store = useFormStore()
      const id = useId()
      emailRenderCount++
      const value = useSyncExternalStore(
        (cb) => store.subscribe(cb),
        () => {
          const v = store.getField('email')
          return typeof v === 'string' ? v : ''
        },
      )
      return (
        <>
          <label htmlFor={id}>Email</label>
          <input id={id} type="text" value={value} onChange={(e) => { store.setField('email', e.target.value) }} />
        </>
      )
    }

    render(
      <Form values={{ name: '', email: '' }} onChange={vi.fn()}>
        <CountingNameInput />
        <CountingEmailInput />
      </Form>,
    )

    const initialNameRenders = nameRenderCount
    const initialEmailRenders = emailRenderCount

    await userEvent.type(screen.getByLabelText('Name'), 'A')

    // Name input re-rendered, email did not
    expect(nameRenderCount).toBeGreaterThan(initialNameRenders)
    expect(emailRenderCount).toBe(initialEmailRenders)
  })
})
