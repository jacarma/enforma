// apps/docs/src/components/Preview.tsx
import { useState, useEffect, useMemo } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
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

function useMuiColorMode(): 'light' | 'dark' {
  const [mode, setMode] = useState<'light' | 'dark'>(() =>
    document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light',
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setMode(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  return mode;
}

export function MuiThemeWrapper({ children }: { children: React.ReactNode }) {
  const mode = useMuiColorMode();
  const theme = useMemo(() => createTheme({ palette: { mode } }), [mode]);
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

interface PreviewProps {
  children: React.ReactNode;
  initialValues?: FormValues;
}

export function Preview({ children, initialValues = {} }: PreviewProps) {
  const [values, setValues] = useState<FormValues>(initialValues);
  return (
    <MuiThemeWrapper>
      <div className="preview-card not-content">
        <Enforma.Form values={values} onChange={({ values }) => setValues(values)}>
          {children}
        </Enforma.Form>
      </div>
    </MuiThemeWrapper>
  );
}
