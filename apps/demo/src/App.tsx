// apps/demo/src/App.tsx
import { useState } from 'react';
import Enforma, { type FormValues, registerComponents } from 'enforma';
import enformaJoy from 'enforma-joy';
registerComponents(enformaJoy);

const LIST_INITIAL: FormValues = {
  members: [{ name: 'Alice' }, { name: 'Bob' }],
};

export function App() {
  const [values, setValues] = useState<FormValues>({});
  const [reactiveValues, setReactiveValues] = useState<FormValues>({});
  const [signupValues, setSignupValues] = useState<FormValues>({});
  const [submitted, setSubmitted] = useState<FormValues | null>(null);
  const [listValues, setListValues] = useState<FormValues>(LIST_INITIAL);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Enforma Demo</h1>

      <Enforma.Form values={values} onChange={setValues} aria-label="demo form">
        <Enforma.TextInput bind="name" label="Name" placeholder="Your name" />
        <Enforma.TextInput bind="email" label="Email" placeholder="your@email.com" />

        <Enforma.Fieldset path="address" title="Address">
          <Enforma.TextInput bind="city" label="City" placeholder="City" />
          <Enforma.Fieldset path="street">
            <Enforma.TextInput bind="line1" label="Street line 1" placeholder="123 Main St" />
          </Enforma.Fieldset>
        </Enforma.Fieldset>
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

      <Enforma.Form
        values={reactiveValues}
        onChange={setReactiveValues}
        aria-label="reactive demo form"
      >
        {/* Reactive disabled: email is locked until name is entered */}
        <Enforma.TextInput
          bind="name"
          label="Name"
          placeholder="Enter your name to unlock the next field"
        />
        <Enforma.TextInput
          bind="email"
          label={({ name }) =>
            `Email${String(name) === '' ? ' (locked until name is entered)' : ''}`
          }
          placeholder={({ name }) =>
            String(name) === '' ? 'Fill in your name first' : `Email for ${String(name)}`
          }
          disabled={({ name }) => String(name) === ''}
        />

        {/* Reactive label driven by another field */}
        <Enforma.TextInput bind="contactType" label="Contact type (try: personal / work)" />
        <Enforma.TextInput
          bind="contact"
          label={({ contactType }) =>
            contactType === 'work' ? 'Work contact' : 'Personal contact'
          }
          placeholder={({ contactType }) =>
            contactType === 'work' ? 'work@company.com' : 'personal@example.com'
          }
        />
      </Enforma.Form>

      <pre style={{ marginTop: '2rem', background: '#f4f4f4', padding: '1rem' }}>
        {JSON.stringify(reactiveValues, null, 2)}
      </pre>

      <hr style={{ margin: '2rem 0' }} />

      <h2>Validation</h2>
      <p style={{ color: '#555', marginBottom: '1rem' }}>
        Errors appear after blur. Submitting while invalid reveals all errors and blocks{' '}
        <code>onSubmit</code>.
      </p>

      {submitted !== null ? (
        <div>
          <p style={{ color: 'green', fontWeight: 'bold' }}>Submitted!</p>
          <pre style={{ background: '#f4f4f4', padding: '1rem' }}>
            {JSON.stringify(submitted, null, 2)}
          </pre>
          <button
            onClick={() => {
              setSubmitted(null);
              setSignupValues({});
            }}
          >
            Reset
          </button>
        </div>
      ) : (
        <Enforma.Form
          values={signupValues}
          onChange={setSignupValues}
          onSubmit={setSubmitted}
          aria-label="signup form"
        >
          <Enforma.TextInput
            bind="name"
            label="Name"
            placeholder="Your name"
            validate={(v) => (!v ? 'Name is required' : null)}
          />
          <Enforma.TextInput
            bind="email"
            label="Email"
            placeholder="you@example.com"
            validate={(v) => (!v ? 'Email is required' : null)}
          />
          <Enforma.TextInput
            bind="password"
            label="Password"
            placeholder="Choose a password"
            validate={(v) => (!v ? 'Password is required' : null)}
          />
          <Enforma.TextInput
            bind="confirm"
            label="Confirm password"
            placeholder="Repeat your password"
            validate={(v, { password }) =>
              v || password ? (v !== password ? 'Passwords do not match' : null) : null
            }
          />
          <button type="submit" style={{ marginTop: '0.5rem' }}>
            Sign up
          </button>
        </Enforma.Form>
      )}

      <hr style={{ margin: '2rem 0' }} />

      <h2>List</h2>
      <p style={{ color: '#555', marginBottom: '1rem' }}>
        Repeated sections driven by an array. Each item is scoped automatically.
      </p>

      <Enforma.Form values={listValues} onChange={setListValues} aria-label="list demo form">
        <Enforma.List bind="members" defaultItem={{ name: '' }}>
          <Enforma.TextInput bind="name" label="Name" />
        </Enforma.List>
      </Enforma.Form>

      <pre style={{ marginTop: '2rem', background: '#f4f4f4', padding: '1rem' }}>
        {JSON.stringify(listValues, null, 2)}
      </pre>
    </div>
  );
}
