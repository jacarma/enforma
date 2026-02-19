import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Form } from './Form'
import { TextInput } from './TextInput'

describe('Form', () => {
  it('renders a <form> element', () => {
    render(<Form values={{}} onChange={() => undefined}>{null}</Form>)
    expect(screen.getByRole('form')).toBeInTheDocument()
  })

  it('renders children inside the form', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <span>child</span>
      </Form>,
    )
    expect(screen.getByText('child')).toBeInTheDocument()
  })

  describe('onSubmit', () => {
    it('calls onSubmit with current values when the form is valid', async () => {
      const onSubmit = vi.fn()
      render(
        <Form values={{ name: 'Alice' }} onChange={vi.fn()} onSubmit={onSubmit}>
          <button type="submit">Submit</button>
        </Form>,
      )
      await userEvent.click(screen.getByRole('button', { name: 'Submit' }))
      expect(onSubmit).toHaveBeenCalledWith({ name: 'Alice' })
    })

    it('does not call onSubmit when a field has a validation error', async () => {
      const onSubmit = vi.fn()
      render(
        <Form values={{ name: '' }} onChange={vi.fn()} onSubmit={onSubmit}>
          <TextInput
            bind="name"
            label="Name"
            validate={(v) => (v === '' ? 'required' : null)}
          />
          <button type="submit">Submit</button>
        </Form>,
      )
      await userEvent.click(screen.getByRole('button', { name: 'Submit' }))
      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('reveals all validation errors after a failed submit', async () => {
      render(
        <Form values={{ name: '' }} onChange={vi.fn()}>
          <TextInput
            bind="name"
            label="Name"
            validate={(v) => (v === '' ? 'Name is required' : null)}
          />
          <button type="submit">Submit</button>
        </Form>,
      )
      await userEvent.click(screen.getByRole('button', { name: 'Submit' }))
      expect(screen.getByText('Name is required')).toBeInTheDocument()
    })
  })

  describe('onChange with validation state', () => {
    it('passes isValid and errors as second argument', async () => {
      const onChange = vi.fn()
      render(
        <Form values={{ name: '' }} onChange={onChange}>
          <TextInput
            bind="name"
            label="Name"
            validate={(v) => (v === '' ? 'required' : null)}
          />
        </Form>,
      )
      await userEvent.type(screen.getByLabelText('Name'), 'A')
      expect(onChange).toHaveBeenLastCalledWith(
        { name: 'A' },
        { isValid: true, errors: { name: null } },
      )
    })
  })

  describe('showErrors', () => {
    it('shows field errors immediately when showErrors is true', () => {
      render(
        <Form values={{ name: '' }} onChange={vi.fn()} showErrors>
          <TextInput
            bind="name"
            label="Name"
            validate={(v) => (v === '' ? 'Name is required' : null)}
          />
        </Form>,
      )
      expect(screen.getByText('Name is required')).toBeInTheDocument()
    })
  })
})
