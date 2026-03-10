import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import type { FormValues } from '../store/FormStore';
import { useScope, joinPath } from '../context/ScopeContext';
import { useFormSettings } from '../context/FormSettingsContext';
import type { Reactive, ToComponentProps } from '../components/types';

// No-op unsubscribe for useSyncExternalStore when a prop is static (no store subscription needed).
// eslint-disable-next-line @typescript-eslint/no-empty-function
const staticUnsubscribe = (): void => {};

export function useFormValue<T>(bind: string): [T | undefined, (value: T) => void] {
  const { store, prefix } = useScope();
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

export function useReactiveProp<T>(prop: Reactive<T> | undefined): T | undefined {
  const { store, prefix } = useScope();

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

export function useFieldProps<R extends { value: unknown; setValue: (v: never) => void }>(
  props: ToComponentProps<R>,
  options?: { typeValidator?: (value: unknown) => string | null },
): R {
  // Destructure non-reactive / specially-handled props out of the spread.
  // `validate` and `messages` go to useFieldValidation.
  // `bind` goes to useFormValue and useFieldValidation.
  // Everything else is a potentially-reactive prop that the loop will resolve.
  // `id` is excluded from the loop below — it's CommonProps-only and not in ResolvedCommonProps.
  const { bind, validate, messages, ...reactiveProps } = props;

  const { store, prefix } = useScope();

  type ValueType = NonNullable<R['value']>;
  const [value, setValue] = useFormValue<ValueType>(bind);

  // Always-current ref — the subscribe/snapshot closures read this
  // instead of closing over `reactiveProps` directly, avoiding stale values.
  const propsRef = useRef(reactiveProps);
  propsRef.current = reactiveProps;

  // Stable reference cache for the snapshot return value.
  // useSyncExternalStore compares snapshots with Object.is; returning the same
  // object reference when nothing changed prevents unnecessary re-renders.
  const lastRef = useRef<Record<string, unknown> | null>(null);

  // Always subscribe — the snapshot caching handles the no-change bail-out.
  // Using useCallback([store]) makes the function reference stable so React
  // does not unnecessarily re-subscribe on every render.
  const subscribe = useCallback((cb: () => void) => store.subscribe(cb), [store]);

  const resolvedExtras = useSyncExternalStore(subscribe, () => {
    const allValues = store.getSnapshot();
    const raw = store.getField(prefix);
    const scopeValues: FormValues =
      prefix === '' || raw === null || typeof raw !== 'object' ? allValues : (raw as FormValues);

    const current = propsRef.current;
    const next: Record<string, unknown> = {};
    for (const key of Object.keys(current)) {
      // `id` is a CommonProps-only field — skip it so it never appears in resolved output.
      if (key === 'id') continue;
      const val = current[key as keyof typeof current];
      next[key] =
        typeof val === 'function'
          ? (val as (s: FormValues, a: FormValues) => unknown)(scopeValues, allValues)
          : val;
    }

    // Return cached reference if all values are unchanged.
    const last = lastRef.current;
    if (
      last !== null &&
      Object.keys(last).length === Object.keys(next).length &&
      Object.keys(next).every((k) => Object.is(last[k], next[k]))
    ) {
      return last;
    }
    return (lastRef.current = next);
  });

  return {
    value,
    setValue,
    ...resolvedExtras,
    ...useFieldValidation(bind, validate, messages, undefined, options?.typeValidator),
  } as unknown as R;
}

export function useFieldValidation(
  bind: string,
  validate:
    | ((value: unknown, scopeValues: FormValues, allValues: FormValues) => string | null)
    | undefined,
  localMessages: Partial<Record<string, string>> | undefined,
  implicitValidator?: () => string | null,
  typeValidator?: (value: unknown) => string | null,
  skip?: boolean,
): { error: string | null; showError: boolean; onBlur: () => void } {
  const { store, prefix } = useScope();
  const { showErrors: formShowErrors, messages: formMessages } = useFormSettings();
  const fullPath = joinPath(prefix, bind);

  // Refs keep the registered validator always seeing latest props without re-registering.
  const validateRef = useRef(validate);
  validateRef.current = validate;

  const localMessagesRef = useRef(localMessages);
  localMessagesRef.current = localMessages;

  const formMessagesRef = useRef(formMessages);
  formMessagesRef.current = formMessages;

  const implicitValidatorRef = useRef(implicitValidator);
  implicitValidatorRef.current = implicitValidator;

  const typeValidatorRef = useRef(typeValidator);
  typeValidatorRef.current = typeValidator;

  useEffect(() => {
    if (skip) return;
    if (
      validateRef.current === undefined &&
      implicitValidatorRef.current === undefined &&
      typeValidatorRef.current === undefined
    )
      return;

    const combinedValidator = (): string | null => {
      // 0. Type validator — runs before user validators; error is shown after blur like all others.
      const typeValidatorFn = typeValidatorRef.current;
      if (typeValidatorFn !== undefined) {
        const fieldValue = store.getField(fullPath);
        const key = typeValidatorFn(fieldValue);
        if (key !== null) {
          return localMessagesRef.current?.[key] ?? formMessagesRef.current[key] ?? key;
        }
      }

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
  }, [store, fullPath, prefix, skip]);

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
