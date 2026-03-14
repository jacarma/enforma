import { lazy, Suspense, useMemo, type ReactNode } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { getRegistryOptions } from 'enforma';
import { MuiVariantContext } from '../context/MuiVariantContext';

const adapterLoaders = {
  dayjs: () =>
    Promise.all([
      import('@mui/x-date-pickers').then((mod) => mod.LocalizationProvider),
      import('@mui/x-date-pickers/AdapterDayjs').then((mod) => mod.AdapterDayjs),
    ]),
  'date-fns': () =>
    Promise.all([
      import('@mui/x-date-pickers').then((mod) => mod.LocalizationProvider),
      import('@mui/x-date-pickers/AdapterDateFns').then((mod) => mod.AdapterDateFns),
    ]),
  luxon: () =>
    Promise.all([
      import('@mui/x-date-pickers').then((mod) => mod.LocalizationProvider),
      import('@mui/x-date-pickers/AdapterLuxon').then((mod) => mod.AdapterLuxon),
    ]),
  moment: () =>
    Promise.all([
      import('@mui/x-date-pickers').then((mod) => mod.LocalizationProvider),
      import('@mui/x-date-pickers/AdapterMoment').then((mod) => mod.AdapterMoment),
    ]),
} as const;

type AdapterKey = keyof typeof adapterLoaders;

type WrapperComponent = (props: { children: ReactNode }) => React.ReactElement;
const wrapperCache = new Map<AdapterKey, React.LazyExoticComponent<WrapperComponent>>();

function getLocalizationWrapper(key: AdapterKey): React.LazyExoticComponent<WrapperComponent> {
  const cached = wrapperCache.get(key);
  if (cached !== undefined) return cached;

  const wrapper = lazy(async () => {
    const [LocalizationProvider, Adapter] = await adapterLoaders[key]();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dateAdapter = Adapter as new (...args: any[]) => any;
    const Wrapper: WrapperComponent = ({ children }) => (
      <LocalizationProvider dateAdapter={dateAdapter}>{children}</LocalizationProvider>
    );
    return { default: Wrapper };
  });

  wrapperCache.set(key, wrapper);
  return wrapper;
}

export function MuiFormWrap({ children }: { children: ReactNode }) {
  const { variant = 'outlined', dateAdapter, colorScheme } = getRegistryOptions();

  const theme = useMemo(
    () => (colorScheme !== undefined ? createTheme({ palette: { mode: colorScheme } }) : null),
    [colorScheme],
  );

  const inner = <MuiVariantContext.Provider value={variant}>{children}</MuiVariantContext.Provider>;

  const withTheme = theme !== null ? <ThemeProvider theme={theme}>{inner}</ThemeProvider> : inner;

  if (dateAdapter === undefined) return withTheme;

  const validKeys: AdapterKey[] = ['dayjs', 'date-fns', 'luxon', 'moment'];
  if (!(validKeys as string[]).includes(dateAdapter)) return inner;

  const LazyWrapper = getLocalizationWrapper(dateAdapter);

  return (
    <Suspense fallback={withTheme}>
      <LazyWrapper>{withTheme}</LazyWrapper>
    </Suspense>
  );
}
