// apps/demo/src/App.tsx
import { useState } from 'react'
import Enforma, { type FormValues } from 'enforma'

const INITIAL_VALUES: FormValues = {
  name: '',
  email: '',
  address: {
    city: '',
  },
}

export function App() {
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES)

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Enforma Demo</h1>

      <Enforma.Form values={values} onChange={setValues} aria-label="demo form">
        <Enforma.TextInput bind="name" label="Name" placeholder="Your name" />
        <Enforma.TextInput bind="email" label="Email" placeholder="your@email.com" />
        <Enforma.TextInput bind="address.city" label="City" placeholder="City" />
      </Enforma.Form>

      <pre style={{ marginTop: '2rem', background: '#f4f4f4', padding: '1rem' }}>
        {JSON.stringify(values, null, 2)}
      </pre>
    </div>
  )
}
