// apps/docs/src/components/Preview.tsx
import { useState } from 'react';
import Enforma, {
  registerComponents,
  type FormValues,
  type EnformaComponentRegistry,
} from 'enforma';
import muiComponents from 'enforma-mui';

// Register date adapter for live previews (skipped in test env to avoid Suspense mid-type issues)
const isTest = import.meta.env.MODE === 'test';
registerComponents(muiComponents as Partial<EnformaComponentRegistry>, {
  variant: 'outlined',
  ...(isTest ? {} : { dateAdapter: 'dayjs' }),
});

interface PreviewProps {
  children: React.ReactNode;
  initialValues?: FormValues;
}

export function Preview({ children, initialValues = {} }: PreviewProps) {
  const [values, setValues] = useState<FormValues>(initialValues);
  return (
    <div className="preview-card">
      <Enforma.Form values={values} onChange={setValues}>
        {children}
      </Enforma.Form>
    </div>
  );
}
