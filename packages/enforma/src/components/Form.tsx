import { useRef, type ReactNode, type FormEvent } from 'react';
import { FormStore, type FormValues } from '../store/FormStore';
import { FormContext } from '../context/FormContext';
import { FormSettingsContext } from '../context/FormSettingsContext';
import { ScopeContext, makeScopeValue } from '../context/ScopeContext';
import { getComponent } from './registry';
import type { ValidationState } from './types';

type FormProps = {
  values: FormValues;
  onChange: (values: FormValues, state: ValidationState) => void;
  onSubmit?: (values: FormValues) => void;
  showErrors?: boolean;
  messages?: Partial<Record<string, string>>;
  children: ReactNode;
  'aria-label'?: string;
};

export function Form({
  values,
  onChange,
  onSubmit,
  showErrors = false,
  messages = {},
  children,
  'aria-label': ariaLabel = 'form',
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
  const scopeValue = makeScopeValue(store, '');
  const formSettings = { showErrors, messages };

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
    <FormContext.Provider value={store}>
      <FormSettingsContext.Provider value={formSettings}>
        <ScopeContext.Provider value={scopeValue}>
          <form aria-label={ariaLabel} onSubmit={handleSubmit}>
            {wrappedChildren}
          </form>
        </ScopeContext.Provider>
      </FormSettingsContext.Provider>
    </FormContext.Provider>
  );
}
