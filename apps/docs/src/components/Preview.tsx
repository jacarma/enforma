// apps/docs/src/components/Preview.tsx
import { useState } from 'react';
import Enforma, {
  registerComponents,
  type FormValues,
  type EnformaComponentRegistry,
} from 'enforma';
import muiComponents from 'enforma-mui';

registerComponents(muiComponents as Partial<EnformaComponentRegistry>, {
  variant: 'outlined',
  dateAdapter: 'dayjs',
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
