// packages/enforma/src/components/Form.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Form } from './Form'

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
})
