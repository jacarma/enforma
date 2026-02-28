import { forwardRef, useContext, useId } from 'react';
import { FormLabel, TextField } from '@mui/material';
import { IMaskInput as IMaskInputBase } from 'react-imask';
import type { ResolvedTextInputProps } from 'enforma';
import { ComponentWrap } from './ComponentWrap';
import { MuiVariantContext } from '../context/MuiVariantContext';

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

type Props = ResolvedTextInputProps & { mask: string | RegExp };

export function MaskedTextInput({
  value,
  setValue,
  label,
  disabled = false,
  placeholder,
  description,
  error,
  showError,
  onBlur,
  mask,
}: Props) {
  const variant = useContext(MuiVariantContext);
  const id = useId();

  const commonProps = {
    value: value ?? '',
    disabled,
    onBlur,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
    },
    fullWidth: true,
    placeholder: placeholder ?? '',
    error: showError,
    helperText: showError ? error : description,
    color: showError ? ('error' as const) : ('primary' as const),
    slotProps: {
      input: {
        inputComponent: MaskAdapter as unknown as React.ComponentType<object>,
      },
      htmlInput: { mask } as unknown as React.InputHTMLAttributes<HTMLInputElement>,
    },
  };

  if (variant === 'classic') {
    return (
      <ComponentWrap error={showError} disabled={disabled}>
        {label !== undefined && <FormLabel htmlFor={id}>{label}</FormLabel>}
        <TextField
          {...commonProps}
          slotProps={{
            ...commonProps.slotProps,
            htmlInput: {
              ...(commonProps.slotProps.htmlInput as object),
              id,
            } as unknown as React.InputHTMLAttributes<HTMLInputElement>,
          }}
          variant="outlined"
          size="small"
        />
      </ComponentWrap>
    );
  }

  return (
    <ComponentWrap error={showError} disabled={disabled}>
      <TextField {...commonProps} label={label} variant={variant} />
    </ComponentWrap>
  );
}
