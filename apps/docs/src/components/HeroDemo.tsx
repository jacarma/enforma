// apps/docs/src/components/HeroDemo.tsx
import { useState } from 'react';
import Enforma, {
  type FormValues,
  type EnformaComponentRegistry,
  registerComponents,
} from 'enforma';
import muiComponents from 'enforma-mui';

registerComponents(muiComponents as Partial<EnformaComponentRegistry>, { variant: 'outlined' });

export function HeroDemo() {
  const [values, setValues] = useState<FormValues>({});

  return (
    <Enforma.Form values={values} onChange={setValues}>
      <Enforma.TextInput bind="name" label="Name" placeholder="Your name" />
      <Enforma.TextInput
        bind="email"
        label="Email"
        placeholder="your@email.com"
        disabled={({ name }) => !name}
      />
      <button type="submit" style={{ marginTop: '0.5rem' }}>
        Submit
      </button>
    </Enforma.Form>
  );
}
