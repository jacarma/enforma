import { forwardRef } from 'react';
import { IMaskInput as IMaskInputBase } from 'react-imask';
import type { ResolvedTextInputProps } from 'enforma';
import { UnmaskedTextInput } from './TextInput';

// Cast to bypass IMask's complex overloaded types which conflict with exactOptionalPropertyTypes
const IMaskInput = IMaskInputBase as React.ComponentType<{
  value: string;
  mask: string | RegExp;
  inputRef: React.Ref<HTMLInputElement>;
  onAccept: (value: string) => void;
  [key: string]: unknown;
}>;

type MaskAdapterProps = React.InputHTMLAttributes<HTMLInputElement> & {
  inputRef: React.Ref<HTMLInputElement>;
  mask: string | RegExp;
};

const MaskAdapter = forwardRef<HTMLInputElement, MaskAdapterProps>(
  ({ onChange, inputRef, mask, value, ...other }) => (
    <IMaskInput
      {...other}
      value={typeof value === 'string' ? value : ''}
      mask={mask}
      inputRef={inputRef}
      onAccept={(v) => {
        onChange?.({
          target: { value: v },
        } as React.ChangeEvent<HTMLInputElement>);
      }}
    />
  ),
);

MaskAdapter.displayName = 'MaskAdapter';

export function MaskedTextInput(props: ResolvedTextInputProps & { mask: string | RegExp }) {
  return (
    <UnmaskedTextInput
      {...props}
      inputComponent={MaskAdapter as unknown as React.ComponentType<object>}
    />
  );
}
