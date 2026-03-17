// apps/docs/src/demos/FormDemos.tsx
import { useState } from 'react';
import Enforma, { type FormValues } from 'enforma';
import { Preview } from '../components/Preview';

const countries = [
  { code: 'us', name: 'United States' },
  { code: 'gb', name: 'United Kingdom' },
];

export function BasicDemo() {
  return (
    <Preview>
      <Enforma.TextInput bind="name" label="Name" />
      <button type="submit">Submit</button>
    </Preview>
  );
}

export function SubmitDemo() {
  const [values, setValues] = useState<FormValues>({});
  const [submitted, setSubmitted] = useState(false);
  return (
    <div className="preview-card not-content">
      <Enforma.Form
        values={values}
        onChange={({ values }) => setValues(values)}
        onSubmit={() => setSubmitted(true)}
      >
        <Enforma.TextInput bind="name" label="Name" required />
        <button type="submit">Submit</button>
      </Enforma.Form>
      {submitted && <p style={{ marginTop: '0.5rem' }}>Submitted!</p>}
    </div>
  );
}

export function DataSourcesDemo() {
  const [values, setValues] = useState<FormValues>({});
  return (
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
  );
}

export function ValidityDemo() {
  const [values, setValues] = useState<FormValues>({});
  const [isValid, setIsValid] = useState(false);
  return (
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
  );
}
