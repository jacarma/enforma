import { useRef, useMemo, type ReactNode, type FormEvent } from 'react';
import { FormStore, type FormValues } from '../store/FormStore';
import { FormContext } from '../context/FormContext';
import { FormSettingsContext } from '../context/FormSettingsContext';
import { ScopeContext } from '../context/ScopeContext';
import { DataSourceContext } from '../context/DataSourceContext';
import type { DataSourceDefinition } from '../datasource/types';
import { getComponent } from './registry';
import type { ValidationState } from './types';

const emptyMessages: Partial<Record<string, string>> = {};
const emptyDataSources: Record<string, DataSourceDefinition<unknown>> = {};

type FormProps = {
  values: FormValues;
  onChange: (values: FormValues, state: ValidationState) => void;
  onSubmit?: (values: FormValues) => void;
  showErrors?: boolean;
  messages?: Partial<Record<string, string>>;
  children: ReactNode;
  'aria-label'?: string;
  dataSources?: Record<string, DataSourceDefinition<unknown>>;
};

export function Form({
  values,
  onChange,
  onSubmit,
  showErrors = false,
  messages = emptyMessages,
  children,
  'aria-label': ariaLabel = 'form',
  dataSources = emptyDataSources,
}: FormProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  const storeRef = useRef<FormStore | null>(null);
  if (storeRef.current === null) {
    const store = new FormStore(values);
    store.subscribe(() => {
      onChangeRef.current(store.getSnapshot(), {
        isValid: store.isValid(),
        errors: store.getErrors(),
      });
    });
    storeRef.current = store;
  }

  const store = storeRef.current;
  const scopeValue = useMemo(() => ({ store, prefix: '' }), [store]);
  const formSettings = useMemo(() => ({ showErrors, messages }), [showErrors, messages]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    store.setSubmitted();
    if (store.isValid()) {
      onSubmitRef.current?.(store.getSnapshot());
    }
  };

  const FormWrap = getComponent('FormWrap');
  const wrappedChildren = FormWrap ? <FormWrap>{children}</FormWrap> : children;

  return (
    <DataSourceContext.Provider value={dataSources}>
      <FormContext.Provider value={store}>
        <FormSettingsContext.Provider value={formSettings}>
          <ScopeContext.Provider value={scopeValue}>
            <form aria-label={ariaLabel} onSubmit={handleSubmit}>
              {wrappedChildren}
            </form>
          </ScopeContext.Provider>
        </FormSettingsContext.Provider>
      </FormContext.Provider>
    </DataSourceContext.Provider>
  );
}
