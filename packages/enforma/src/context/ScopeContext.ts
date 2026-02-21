// packages/enforma/src/context/ScopeContext.ts
import { createContext, useContext, useEffect, useRef, useSyncExternalStore } from 'react';
import type { FormStore, FormValues } from '../store/FormStore';
import { useFormSettings } from './FormSettingsContext';
import { ComponentProps, Reactive } from '../components/types';

type ScopeValue = {
  store: FormStore;
  prefix: string;
};

export type { ScopeValue };

export const ScopeContext = createContext<ScopeValue | null>(null);

function useScopeValue(): ScopeValue {
  const ctx = useContext(ScopeContext);
  if (ctx === null) {
    throw new Error('useFormValue must be used within <Enforma.Form>');
  }
  return ctx;
}

function joinPath(prefix: string, bind: string): string {
  return prefix === '' ? bind : `${prefix}.${bind}`;
}

export function useFormValue<T>(bind: string): [T | undefined, (value: T) => void] {
  const { store, prefix } = useScopeValue();
  const fullPath = joinPath(prefix, bind);

  const value = useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => store.getField(fullPath) as T | undefined,
  );

  const setValue = (newValue: T) => {
    store.setField(fullPath, newValue);
  };

  return [value, setValue];
}

export function useComponentProps<T>({
  bind,
  label,
  disabled,
  placeholder,
  description,
  validate,
  messages,
}: ComponentProps) {
  const [value, setValue] = useFormValue<T>(bind);

  return {
    value,
    setValue,
    label: useReactiveProp(label),
    disabled: useReactiveProp(disabled),
    placeholder: useReactiveProp(placeholder),
    description: useReactiveProp(description),
    ...useFieldValidation(bind, validate, messages),
  };
}

// No-op unsubscribe returned by useSyncExternalStore when prop is static (no store subscription needed).
// eslint-disable-next-line @typescript-eslint/no-empty-function
const staticUnsubscribe = (): void => {};

export function useReactiveProp<T>(prop: Reactive<T> | undefined): T | undefined {
  const { store, prefix } = useScopeValue();

  return useSyncExternalStore(
    (cb) => (typeof prop === 'function' ? store.subscribe(cb) : staticUnsubscribe),
    (): T | undefined => {
      if (typeof prop !== 'function') return prop;
      const fn = prop as (scopeValues: FormValues, allValues: FormValues) => T;
      const allValues = store.getSnapshot();
      const raw = store.getField(prefix);
      const scopeValues: FormValues =
        prefix === '' || raw === null || typeof raw !== 'object' ? allValues : (raw as FormValues);
      return fn(scopeValues, allValues);
    },
  );
}

export function makeScopeValue(store: FormStore, prefix: string): ScopeValue {
  return { store, prefix };
}

export function extendPrefix(parent: ScopeValue, path: string): ScopeValue {
  return { store: parent.store, prefix: joinPath(parent.prefix, path) };
}

export function useFieldValidation(
  bind: string,
  validate:
    | ((value: unknown, scopeValues: FormValues, allValues: FormValues) => string | null)
    | undefined,
  localMessages: Partial<Record<string, string>> | undefined,
  implicitValidator?: () => string | null,
): { error: string | null; showError: boolean; onBlur: () => void } {
  const { store, prefix } = useScopeValue();
  const { showErrors: formShowErrors, messages: formMessages } = useFormSettings();
  const fullPath = joinPath(prefix, bind);

  // Use refs so the registered validator always sees latest props without re-registering.
  const validateRef = useRef(validate);
  validateRef.current = validate;

  const localMessagesRef = useRef(localMessages);
  localMessagesRef.current = localMessages;

  const formMessagesRef = useRef(formMessages);
  formMessagesRef.current = formMessages;

  const implicitValidatorRef = useRef(implicitValidator);
  implicitValidatorRef.current = implicitValidator;

  useEffect(() => {
    // Skip registration when there is nothing to validate.
    if (validateRef.current === undefined && implicitValidatorRef.current === undefined) return;

    const combinedValidator = (): string | null => {
      // 1. Implicit check — returns a message key (e.g. "invalidDate") or null.
      const implicitFn = implicitValidatorRef.current;
      if (implicitFn !== undefined) {
        const key = implicitFn();
        if (key !== null) {
          return localMessagesRef.current?.[key] ?? formMessagesRef.current[key] ?? key;
        }
      }

      // 2. User's validate fn — only runs if implicit check passes.
      const validateFn = validateRef.current;
      if (validateFn !== undefined) {
        const fieldValue = store.getField(fullPath);
        const allValues = store.getSnapshot();
        const raw = prefix === '' ? allValues : store.getField(prefix);
        const scopeValues: FormValues =
          raw === null || typeof raw !== 'object' ? allValues : (raw as FormValues);
        return validateFn(fieldValue, scopeValues, allValues);
      }

      return null;
    };

    return store.registerValidator(fullPath, combinedValidator);
  }, [store, fullPath, prefix]);

  const error = useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => store.getError(fullPath),
  );

  const isTouched = useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => store.isTouched(fullPath),
  );

  const isSubmitted = useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => store.isSubmitted(),
  );

  const showError = (isTouched || isSubmitted || formShowErrors) && error !== null;

  const onBlur = () => {
    store.touchField(fullPath);
  };

  return { error, showError, onBlur };
}
