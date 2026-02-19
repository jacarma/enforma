// apps/demo/src/App.tsx
import { useState } from 'react'
import Enforma, { type FormValues } from 'enforma'

const INITIAL_VALUES: FormValues = {
  name: '',
  email: '',
  address: {
    city: '',
    street: {
      line1: '',
    },
  },
}

const REACTIVE_INITIAL: FormValues = {
  name: '',
  contactType: 'personal',
  contact: '',
}

export function App() {
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES)
  const [reactiveValues, setReactiveValues] = useState<FormValues>(REACTIVE_INITIAL)

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Enforma Demo</h1>

      <Enforma.Form values={values} onChange={setValues} aria-label="demo form">
        <Enforma.TextInput bind="name" label="Name" placeholder="Your name" />
        <Enforma.TextInput bind="email" label="Email" placeholder="your@email.com" />

        <fieldset>
          <legend>Address</legend>
          <Enforma.Scope path="address">
            <Enforma.TextInput bind="city" label="City" placeholder="City" />
            <Enforma.Scope path="street">
              <Enforma.TextInput bind="line1" label="Street line 1" placeholder="123 Main St" />
            </Enforma.Scope>
          </Enforma.Scope>
        </fieldset>
      </Enforma.Form>

      <pre style={{ marginTop: '2rem', background: '#f4f4f4', padding: '1rem' }}>
        {JSON.stringify(values, null, 2)}
      </pre>

      <hr style={{ margin: '2rem 0' }} />

      <h2>Reactive Attributes</h2>
      <p style={{ color: '#555', marginBottom: '1rem' }}>
        Props can be functions <code>(scopeValues, allValues) =&gt; T</code> that re-evaluate live
        as form state changes.
      </p>

      <Enforma.Form values={reactiveValues} onChange={setReactiveValues} aria-label="reactive demo form">
        {/* Reactive disabled: email is locked until name is entered */}
        <Enforma.TextInput bind="name" label="Name" placeholder="Enter your name to unlock the next field" />
        <Enforma.TextInput
          bind="email"
          label={(_, all) => `Email${String(all.name) === '' ? ' (locked until name is entered)' : ''}`}
          placeholder={(_, all) =>
            String(all.name) === '' ? 'Fill in your name first' : `Email for ${String(all.name)}`
          }
          disabled={(_, all) => String(all.name) === ''}
        />

        {/* Reactive label driven by another field */}
        <Enforma.TextInput
          bind="contactType"
          label="Contact type (try: personal / work)"
        />
        <Enforma.TextInput
          bind="contact"
          label={(_, all) => all.contactType === 'work' ? 'Work contact' : 'Personal contact'}
          placeholder={(_, all) =>
            all.contactType === 'work' ? 'work@company.com' : 'personal@example.com'
          }
        />
      </Enforma.Form>

      <pre style={{ marginTop: '2rem', background: '#f4f4f4', padding: '1rem' }}>
        {JSON.stringify(reactiveValues, null, 2)}
      </pre>
    </div>
  )
}
