import type { FormValues } from '../store/FormStore';
import type { SubmitDisabledFn } from './types';

export function submitDisabled<TValues extends FormValues = FormValues>(
  fn: SubmitDisabledFn<TValues>,
): SubmitDisabledFn<TValues> {
  return fn;
}
