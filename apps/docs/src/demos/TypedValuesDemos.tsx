// apps/docs/src/demos/TypedValuesDemos.tsx
import { useState } from 'react';
import Enforma, { type OnChangeArg, submitDisabled } from 'enforma';
import { Preview, MuiThemeWrapper } from '../components/Preview';

interface ContactForm {
  name: string;
  email: string;
}

export function OnChangeArgDemo() {
  const [arg, setArg] = useState<OnChangeArg<ContactForm> | null>(null);
  return (
    <MuiThemeWrapper>
      <div className="preview-card not-content">
        <Enforma.Form<ContactForm> values={{ name: '', email: '' }} onChange={(a) => setArg(a)}>
          <Enforma.TextInput bind="name" label="Name" required />
          <Enforma.TextInput bind="email" label="Email" required />
        </Enforma.Form>
        {arg && (
          <pre style={{ marginTop: '0.5rem', fontSize: '0.85em' }}>
            {JSON.stringify({ isValid: arg.isValid, values: arg.values }, null, 2)}
          </pre>
        )}
      </div>
    </MuiThemeWrapper>
  );
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
          <button type="submit">Submit</button>
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

const isDisabled = submitDisabled<ContactForm>((_values, { formValid }) => !formValid);

export function SubmitDisabledDemo() {
  return (
    <Preview>
      <Enforma.TextInput bind="name" label="Name" required />
      <Enforma.TextInput bind="email" label="Email" required />
      <Enforma.Submit disabled={isDisabled} />
    </Preview>
  );
}
