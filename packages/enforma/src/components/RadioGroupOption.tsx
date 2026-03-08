export type RadioGroupOptionProps = {
  label: string | ((item: unknown) => string);
  value: string | number | ((item: unknown) => unknown);
};

// Props are read externally by the adapter via React.Children — not used in the body.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function RadioGroupOption(_: RadioGroupOptionProps): null {
  return null;
}
