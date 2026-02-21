import { createContext, useContext } from 'react';

export type FormSettings = {
  showErrors: boolean;
  messages: Partial<Record<string, string>>;
};

const defaultSettings: FormSettings = {
  showErrors: false,
  messages: {},
};

export const FormSettingsContext = createContext<FormSettings>(defaultSettings);

export function useFormSettings(): FormSettings {
  return useContext(FormSettingsContext);
}
