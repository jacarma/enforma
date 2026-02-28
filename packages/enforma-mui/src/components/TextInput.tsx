import { useId, useContext, lazy, Suspense, forwardRef } from 'react';
import { FormLabel, TextField } from '@mui/material';
import { type ResolvedTextInputProps } from 'enforma';
import { ComponentWrap } from './ComponentWrap';
import { MuiVariantContext } from '../context/MuiVariantContext';

type IMaskInputType = React.ComponentType<{
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

const LazyMaskedTextInput = lazy(() =>
  import('react-imask')
    .then(({ IMaskInput: rawIMaskInput }) => {
      const IMaskInput = rawIMaskInput as unknown as IMaskInputType;

      const MaskAdapter = forwardRef<HTMLInputElement, MaskAdapterProps>(
        ({ onChange, inputRef, mask, value, ...other }) => (
          <IMaskInput
            {...other}
            value={typeof value === 'string' ? value : ''}
            mask={mask}
            inputRef={inputRef}
            onAccept={(v) => {
              onChange?.({ target: { value: v } } as React.ChangeEvent<HTMLInputElement>);
            }}
          />
        ),
      );
      MaskAdapter.displayName = 'MaskAdapter';

      const MaskedComponent = (props: ResolvedTextInputProps & { mask: string | RegExp }) => (
        <UnmaskedTextInput
          {...props}
          inputComponent={MaskAdapter as unknown as React.ComponentType<object>}
        />
      );
      MaskedComponent.displayName = 'MaskedTextInput';

      return { default: MaskedComponent };
    })
    .catch(() => {
      throw new Error(
        'enforma-mui: the `mask` prop requires `react-imask`. Run: pnpm add react-imask imask',
      );
    }),
);

export function UnmaskedTextInput({
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
  inputComponent,
}: ResolvedTextInputProps & { inputComponent?: React.ComponentType<object> }) {
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
    type: 'text',
    error: showError,
    helperText: showError ? error : description,
    color: showError ? ('error' as const) : ('primary' as const),
  };

  const maskSlotProps =
    inputComponent !== undefined
      ? {
          input: { inputComponent },
          htmlInput: { mask } as unknown as React.InputHTMLAttributes<HTMLInputElement>,
        }
      : null;

  if (variant === 'classic') {
    return (
      <ComponentWrap error={showError} disabled={disabled}>
        {label !== undefined && <FormLabel htmlFor={id}>{label}</FormLabel>}
        <TextField
          {...commonProps}
          slotProps={{
            ...(maskSlotProps !== null && { input: maskSlotProps.input }),
            htmlInput: {
              ...(maskSlotProps !== null ? (maskSlotProps.htmlInput as object) : {}),
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
      <TextField
        {...commonProps}
        label={label}
        variant={variant}
        {...(maskSlotProps !== null && { slotProps: maskSlotProps })}
      />
    </ComponentWrap>
  );
}

export function TextInput(props: ResolvedTextInputProps) {
  if (props.mask !== undefined) {
    return (
      <Suspense fallback={<UnmaskedTextInput {...props} />}>
        <LazyMaskedTextInput {...props} mask={props.mask} />
      </Suspense>
    );
  }

  return <UnmaskedTextInput {...props} />;
}
