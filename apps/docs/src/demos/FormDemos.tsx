// apps/docs/src/demos/FormDemos.tsx
import { useState } from 'react';
import Enforma, { type FormValues, type OnChangeArg } from 'enforma';
import { Preview, MuiThemeWrapper } from '../components/Preview';

interface ContactForm {
  name: string;
  email: string;
}

export function SubmitArgDemo() {
  const [submitArg, setSubmitArg] = useState<OnChangeArg<ContactForm> | null>(null);
  return (
    <MuiThemeWrapper>
      <div className="preview-card not-content">
        <Enforma.Form<ContactForm>
          values={{ name: '', email: '' }}
          onChange={() => undefined}
          onSubmit={(arg) => setSubmitArg(arg)}
        >
          <Enforma.TextInput bind="name" label="Name" required />
          <Enforma.TextInput bind="email" label="Email" required />
          <Enforma.Submit />
        </Enforma.Form>
        {submitArg && (
          <pre style={{ marginTop: '0.5rem', fontSize: '0.85em' }}>
            {JSON.stringify({ isValid: submitArg.isValid, values: submitArg.values }, null, 2)}
          </pre>
        )}
      </div>
    </MuiThemeWrapper>
  );
}

const countries = [
  { code: 'us', name: 'United States' },
  { code: 'gb', name: 'United Kingdom' },
];

export function BasicDemo() {
  return (
    <Preview>
      <Enforma.TextInput bind="name" label="Name" />
      <Enforma.Submit />
    </Preview>
  );
}

export function SubmitDemo() {
  const [values, setValues] = useState<FormValues>({});
  const [submitted, setSubmitted] = useState(false);
  return (
    <MuiThemeWrapper>
      <div className="preview-card not-content">
        <Enforma.Form
          values={values}
          onChange={({ values }) => setValues(values)}
          onSubmit={() => setSubmitted(true)}
        >
          <Enforma.TextInput bind="name" label="Name" required />
          <Enforma.Submit />
        </Enforma.Form>
        {submitted && <p style={{ marginTop: '0.5rem' }}>Submitted!</p>}
      </div>
    </MuiThemeWrapper>
  );
}

export function DataSourcesDemo() {
  const [values, setValues] = useState<FormValues>({});
  return (
    <MuiThemeWrapper>
      <div className="preview-card not-content">
        <Enforma.Form
          values={values}
          onChange={({ values }) => setValues(values)}
          dataSources={{ countries }}
        >
          <Enforma.Select bind="country" label="Country" dataSource="countries">
            <Enforma.Select.Option label="name" value="code" />
          </Enforma.Select>
        </Enforma.Form>
      </div>
    </MuiThemeWrapper>
  );
}

export function ValidityDemo() {
  const [values, setValues] = useState<FormValues>({});
  const [isValid, setIsValid] = useState(false);
  return (
    <MuiThemeWrapper>
      <div className="preview-card not-content">
        <Enforma.Form
          values={values}
          onChange={({ values, isValid }) => {
            setValues(values);
            setIsValid(isValid);
          }}
        >
          <Enforma.TextInput bind="name" label="Name" required />
        </Enforma.Form>
        <p style={{ marginTop: '0.5rem' }}>Form valid: {isValid ? 'yes' : 'no'}</p>
      </div>
    </MuiThemeWrapper>
  );
}
