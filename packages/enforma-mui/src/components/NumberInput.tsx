import {
  forwardRef,
  lazy,
  Suspense,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { FormLabel, TextField } from '@mui/material';
import type { ResolvedNumberInputProps } from 'enforma';
import { ComponentWrap } from './ComponentWrap';
import { MuiVariantContext } from '../context/MuiVariantContext';

// ── Intl separator detection ─────────────────────────────────────────────────

function getIntlSeparators(): { radix: string; thousandsSeparator: string } {
  try {
    const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US';
    const parts = new Intl.NumberFormat(locale).formatToParts(1234.56);
    return {
      radix: parts.find((p) => p.type === 'decimal')?.value ?? '.',
      thousandsSeparator: parts.find((p) => p.type === 'group')?.value ?? ',',
    };
  } catch {
    return { radix: '.', thousandsSeparator: ',' };
  }
}

// ── Types for the mask adapter ────────────────────────────────────────────────

type MaskedNumberOptions = {
  mask: NumberConstructor;
  scale?: number;
  signed?: boolean;
  radix?: string;
  thousandsSeparator?: string;
  min?: number;
  max?: number;
};

type MaskRef = { typedValue: number | null | undefined };

type NumberMaskAdapterProps = React.InputHTMLAttributes<HTMLInputElement> & {
  inputRef: React.Ref<HTMLInputElement>;
  maskOptions: MaskedNumberOptions;
  onTypedValueChange: (value: number | undefined) => void;
};

// ── Skeleton shown while react-imask lazy-loads ───────────────────────────────

function NumberInputSkeleton({
  label,
  disabled = false,
  placeholder,
  description,
  error,
  showError,
  onBlur,
  value,
}: ResolvedNumberInputProps) {
  const variant = useContext(MuiVariantContext);
  const id = useId();
  const displayValue = value !== undefined ? String(value) : '';

  const commonProps = {
    value: displayValue,
    onChange: () => undefined,
    onBlur,
    disabled: true, // disabled while loading
    placeholder: placeholder ?? '',
    fullWidth: true,
    error: showError,
    helperText: showError ? error : description,
  } as const;

  if (variant === 'classic') {
    return (
      <ComponentWrap error={showError} disabled={disabled}>
        {label !== undefined && <FormLabel htmlFor={id}>{label}</FormLabel>}
        <TextField
          {...commonProps}
          variant="outlined"
          size="small"
          slotProps={{ htmlInput: { id } }}
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

// ── Lazy-loaded component that requires react-imask ───────────────────────────

type IMaskInputType = React.ComponentType<{
  value: string;
  inputRef: React.Ref<HTMLInputElement>;
  onAccept: (value: string, mask: MaskRef) => void;
  [key: string]: unknown;
}>;

const LazyNumberInput = lazy(() =>
  import('react-imask')
    .then(({ IMaskInput: rawIMaskInput }) => {
      const IMaskInput = rawIMaskInput as unknown as IMaskInputType;

      // forwardRef adapter — bridges MUI TextField's inputComponent slot to IMaskInput
      const NumberMaskAdapter = forwardRef<HTMLInputElement, NumberMaskAdapterProps>(
        ({ onChange, onTypedValueChange, inputRef, maskOptions, value, ...other }) => (
          <IMaskInput
            {...other}
            {...(maskOptions as Record<string, unknown>)}
            value={typeof value === 'string' ? value : ''}
            inputRef={inputRef}
            onAccept={(maskedValue, mask) => {
              onChange?.({
                target: { value: maskedValue },
              } as React.ChangeEvent<HTMLInputElement>);
              const typed = mask.typedValue;
              onTypedValueChange(typeof typed === 'number' && !isNaN(typed) ? typed : undefined);
            }}
          />
        ),
      );
      NumberMaskAdapter.displayName = 'NumberMaskAdapter';

      function NumberInputImpl({
        value,
        setValue,
        label,
        disabled = false,
        placeholder,
        description,
        error,
        showError,
        onBlur,
        decimalScale,
        decimalSeparator = 'intl',
        thousandSeparator = 'intl',
        allowNegative = true,
        min,
        max,
      }: ResolvedNumberInputProps) {
        const variant = useContext(MuiVariantContext);
        const id = useId();

        const intlSeps = useMemo(getIntlSeparators, []);
        const radix = decimalSeparator === 'intl' ? intlSeps.radix : decimalSeparator;
        const thousSep =
          thousandSeparator === false
            ? ''
            : thousandSeparator === 'intl'
              ? intlSeps.thousandsSeparator
              : thousandSeparator;

        const maskOptions: MaskedNumberOptions = {
          mask: Number,
          ...(decimalScale !== undefined && { scale: decimalScale }),
          signed: allowNegative,
          radix,
          thousandsSeparator: thousSep,
          ...(min !== undefined && { min }),
          ...(max !== undefined && { max }),
        };

        // Keep a local display string so IMask never loses mid-type chars (e.g. "1.")
        const [displayValue, setDisplayValue] = useState(() =>
          value !== undefined ? String(value) : '',
        );

        // Sync from external form changes (form reset, programmatic update).
        // Does NOT fire when user is mid-typing, because typing "1." leaves
        // form value at 1 (same as after "1"), so value prop does not change.
        const prevValueRef = useRef(value);
        useEffect(() => {
          if (prevValueRef.current === value) return;
          prevValueRef.current = value;
          setDisplayValue(value !== undefined ? String(value) : '');
        }, [value]);

        const slotProps = {
          input: {
            inputComponent: NumberMaskAdapter as unknown as React.ComponentType<object>,
          },
          htmlInput: {
            maskOptions,
            onTypedValueChange: setValue,
          } as unknown as React.InputHTMLAttributes<HTMLInputElement>,
        };

        const commonProps = {
          value: displayValue,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
            setDisplayValue(e.target.value);
          },
          onBlur,
          disabled,
          placeholder: placeholder ?? '',
          fullWidth: true,
          error: showError,
          helperText: showError ? error : description,
          color: showError ? ('error' as const) : ('primary' as const),
        };

        if (variant === 'classic') {
          return (
            <ComponentWrap error={showError} disabled={disabled}>
              {label !== undefined && <FormLabel htmlFor={id}>{label}</FormLabel>}
              <TextField
                {...commonProps}
                variant="outlined"
                size="small"
                slotProps={{
                  ...slotProps,
                  htmlInput: {
                    ...(slotProps.htmlInput as object),
                    id,
                  } as unknown as React.InputHTMLAttributes<HTMLInputElement>,
                }}
              />
            </ComponentWrap>
          );
        }

        return (
          <ComponentWrap error={showError} disabled={disabled}>
            <TextField {...commonProps} label={label} variant={variant} slotProps={slotProps} />
          </ComponentWrap>
        );
      }
      NumberInputImpl.displayName = 'NumberInput';

      return { default: NumberInputImpl };
    })
    .catch(() => {
      throw new Error(
        'enforma-mui: NumberInput requires `react-imask`. Run: pnpm add react-imask imask',
      );
    }),
);

// ── Public export ─────────────────────────────────────────────────────────────

export function NumberInput(props: ResolvedNumberInputProps) {
  return (
    <Suspense fallback={<NumberInputSkeleton {...props} />}>
      <LazyNumberInput {...props} />
    </Suspense>
  );
}
