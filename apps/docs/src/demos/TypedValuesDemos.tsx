// apps/docs/src/demos/TypedValuesDemos.tsx
import { useState } from 'react';
import Enforma, { type OnChangeArg } from 'enforma';
import { MuiThemeWrapper } from '../components/Preview';

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
