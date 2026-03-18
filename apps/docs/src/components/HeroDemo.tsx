// apps/docs/src/components/HeroDemo.tsx
import { useState } from 'react';
import Enforma, {
  type FormValues,
  type EnformaComponentRegistry,
  registerComponents,
} from 'enforma';
import muiComponents from 'enforma-mui';
import { MuiThemeWrapper } from './Preview';

registerComponents(muiComponents as Partial<EnformaComponentRegistry>, { variant: 'outlined' });

export function HeroDemo() {
  const [values, setValues] = useState<FormValues>({});

  return (
    <MuiThemeWrapper>
      <Enforma.Form values={values} onChange={({ values }) => setValues(values)}>
        <Enforma.TextInput bind="name" label="Name" />
        <Enforma.TextInput bind="email" label="Email" disabled={({ name }) => !name} />
        <Enforma.Submit />
      </Enforma.Form>
    </MuiThemeWrapper>
  );
}
