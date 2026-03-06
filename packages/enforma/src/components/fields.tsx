import { memo } from 'react';
import React from 'react';
import { getComponent } from './registry';
import { SelectOption } from './SelectOption';
import type { SelectOptionProps } from './SelectOption';
import { RadioGroupOption } from './RadioGroupOption';
import { AutocompleteOption } from './AutocompleteOption';
import { ExclusiveToggleOption } from './ExclusiveToggleOption';
import type {
  AutocompleteProps,
  CheckboxProps,
  ComponentPropsMap,
  DatePickerProps,
  DateTimePickerProps,
  ExclusiveToggleProps,
  FieldsetProps,
  NumberInputProps,
  RadioGroupProps,
  ResolvedAutocompleteProps,
  ResolvedExclusiveToggleProps,
  ResolvedRadioGroupProps,
  SelectProps,
  SwitchProps,
  TextareaProps,
  TextInputProps,
  TimePickerProps,
  ResolvedCheckboxProps,
  ResolvedDatePickerProps,
  ResolvedDateTimePickerProps,
  ResolvedNumberInputProps,
  ResolvedSwitchProps,
  ResolvedTextInputProps,
  ResolvedTextareaProps,
  ResolvedTimePickerProps,
  FieldResolved,
} from './types';
import { useFieldProps, useReactiveProp } from '../hooks/useField';
import { useDataSource, resolveDefinition } from '../hooks/useDataSource';
import { useDataSources } from '../context/DataSourceContext';
import { Scope } from './Scope';

function isEmptyRef(v: unknown): boolean {
  if (Array.isArray(v)) return v.length === 0;
  if (v !== null && typeof v === 'object') return Object.keys(v).length === 0;
  return false;
}

function stablePropsEqual<P extends object>(prev: P, next: P): boolean {
  const prevKeys = Object.keys(prev);
  const nextKeys = Object.keys(next);
  if (prevKeys.length !== nextKeys.length) return false;
  for (const key of nextKeys) {
    const p = prev[key as keyof P];
    const n = next[key as keyof P];
    if (typeof p === 'function' && typeof n === 'function') continue;
    if (isEmptyRef(p) && isEmptyRef(n) && Array.isArray(p) === Array.isArray(n)) continue;
    if (!Object.is(p, n)) return false;
  }
  return true;
}

function dispatchComponent<K extends keyof ComponentPropsMap>(
  componentType: K,
  props: ComponentPropsMap[K],
) {
  const Impl = getComponent(componentType);
  if (!Impl) {
    throw new Error(`Enforma: component "${componentType}" is not registered.`);
  }
  return <Impl {...props} />;
}

function TextInputDispatch(props: TextInputProps) {
  return dispatchComponent('TextInput', useFieldProps<ResolvedTextInputProps>(props));
}

function TextareaDispatch(props: TextareaProps) {
  return dispatchComponent('Textarea', useFieldProps<ResolvedTextareaProps>(props));
}

function CheckboxDispatch(props: CheckboxProps) {
  return dispatchComponent('Checkbox', useFieldProps<ResolvedCheckboxProps>(props));
}

function SwitchDispatch(props: SwitchProps) {
  return dispatchComponent('Switch', useFieldProps<ResolvedSwitchProps>(props));
}

function NumberInputDispatch(props: NumberInputProps) {
  return dispatchComponent(
    'NumberInput',
    useFieldProps<ResolvedNumberInputProps>(props, {
      typeValidator: (v): string | null => {
        if (v === undefined) return null;
        if (typeof v !== 'number' || isNaN(v)) return 'invalidNumber';
        return null;
      },
    }),
  );
}

function DatePickerDispatch(props: DatePickerProps) {
  return dispatchComponent(
    'DatePicker',
    useFieldProps<ResolvedDatePickerProps>(props, {
      typeValidator: (v): string | null => {
        if (v === undefined) return null;
        if (v instanceof Date) return null;
        return 'invalidDate';
      },
    }),
  );
}

function TimePickerDispatch(props: TimePickerProps) {
  return dispatchComponent(
    'TimePicker',
    useFieldProps<ResolvedTimePickerProps>(props, {
      typeValidator: (v): string | null => {
        if (v === undefined) return null;
        if (typeof v === 'string' && /^\d{2}:\d{2}$/.test(v)) return null;
        return 'invalidTime';
      },
    }),
  );
}

function DateTimePickerDispatch(props: DateTimePickerProps) {
  return dispatchComponent(
    'DateTimePicker',
    useFieldProps<ResolvedDateTimePickerProps>(props, {
      typeValidator: (v): string | null => {
        if (v === undefined) return null;
        if (v instanceof Date) return null;
        return 'invalidDateTime';
      },
    }),
  );
}

function FieldsetDispatch({ bind, children, title }: FieldsetProps) {
  const content = bind !== undefined ? <Scope bind={bind}>{children}</Scope> : children;
  return dispatchComponent('Fieldset', {
    children: content,
    ...(title !== undefined && { title }),
  });
}

function buildSelectOptions(
  items: unknown[],
  children: React.ReactNode,
): { value: unknown; label: string }[] {
  const childOptions: { value: unknown; label: unknown }[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    const props = child.props as SelectOptionProps;
    childOptions.push({ value: props.value, label: props.label });
  });

  // Single SelectOption with string fields + datasource items → field-name mapping template
  if (items.length > 0 && childOptions.length === 1) {
    const template = childOptions[0];
    if (
      template !== undefined &&
      typeof template.label === 'string' &&
      typeof template.value === 'string'
    ) {
      const labelKey = template.label;
      const valueKey = template.value;
      return items.map((item) => {
        if (typeof item === 'object' && item !== null) {
          const obj = item as Record<string, unknown>;
          const lv = obj[labelKey];
          const label =
            typeof lv === 'string' || typeof lv === 'number' || typeof lv === 'boolean'
              ? String(lv)
              : '';
          return { value: obj[valueKey], label };
        }
        return { value: item, label: String(item) };
      });
    }
  }

  // Inline literal children
  if (childOptions.length > 0) {
    return childOptions.map((opt) => ({ value: opt.value, label: String(opt.label) }));
  }

  // No children: map items directly, expecting { value, label } shape
  return items.map((item) => {
    if (typeof item === 'object' && item !== null && 'value' in item && 'label' in item) {
      return {
        value: (item as { value: unknown }).value,
        label: String((item as { label: unknown }).label),
      };
    }
    return { value: item, label: String(item) };
  });
}

function SelectDispatch(props: SelectProps) {
  const resolved = useFieldProps<FieldResolved<unknown>>(props);
  const {
    items,
    isLoading,
    error: dataSourceError,
  } = useDataSource(props.dataSource, {
    bind: props.bind,
  });
  const options = buildSelectOptions(items, props.children);
  const SelectOptionImpl = getComponent('SelectOption');
  if (!SelectOptionImpl) {
    throw new Error('Enforma: component "SelectOption" is not registered.');
  }
  const renderedOptions = options.map((opt) => (
    <SelectOptionImpl key={String(opt.value)} value={opt.value} label={opt.label} />
  ));
  const matched = options.find((opt) => opt.value === resolved.value);
  const displayValue = matched?.label ?? (typeof resolved.value === 'string' ? resolved.value : '');
  return dispatchComponent('Select', {
    ...resolved,
    options,
    children: renderedOptions,
    displayValue,
    isLoading,
    dataSourceError: dataSourceError ?? null,
  });
}

function RadioGroupDispatch(props: RadioGroupProps) {
  const resolved = useFieldProps<FieldResolved<unknown>>(props);
  const {
    items,
    isLoading,
    error: dataSourceError,
  } = useDataSource(props.dataSource, {
    bind: props.bind,
  });
  const options = buildSelectOptions(items, props.children);
  const RadioGroupOptionImpl = getComponent('RadioGroupOption');
  if (!RadioGroupOptionImpl) {
    throw new Error('Enforma: component "RadioGroupOption" is not registered.');
  }
  const renderedOptions = options.map((opt) => (
    <RadioGroupOptionImpl key={String(opt.value)} value={opt.value} label={opt.label} />
  ));
  const row = useReactiveProp(props.row) ?? false;
  return dispatchComponent('RadioGroup', {
    ...resolved,
    options,
    children: renderedOptions,
    row,
    isLoading,
    dataSourceError: dataSourceError ?? null,
  } as ResolvedRadioGroupProps);
}

function AutocompleteDispatch(props: AutocompleteProps) {
  const [inputValue, setInputValue] = React.useState('');
  const [resolvedItem, setResolvedItem] = React.useState<{
    value: unknown;
    label: string;
  } | null>(null);
  const resolved = useFieldProps<FieldResolved<unknown>>(props);
  const registry = useDataSources();
  const minSearchLength = useReactiveProp(props.minSearchLength) ?? 0;
  const activeDataSource = inputValue.length >= minSearchLength ? props.dataSource : undefined;
  const {
    items,
    isLoading,
    error: dataSourceError,
  } = useDataSource(activeDataSource, {
    bind: props.bind,
    search: inputValue,
  });

  // Auto-detect: disable MUI client-side filtering when datasource owns search
  const definition =
    props.dataSource !== undefined ? resolveDefinition(props.dataSource, registry) : null;
  const disableClientFilter =
    definition !== null &&
    definition !== 'reactive' &&
    !Array.isArray(definition) &&
    'query' in definition;

  const options = buildSelectOptions(items, props.children);
  const currentValue = resolved.value;
  const valueInOptions = options.some((opt) => opt.value === currentValue);

  // Resolve pre-selected values that are not in the loaded options.
  // Wait for the initial query to finish (isLoading=false) before deciding to call resolve,
  // so we don't call it unnecessarily when the value will appear in query results.
  // Uses a ref to avoid re-calling resolve for the same value.
  const lastResolvedValueRef = React.useRef<unknown>(undefined);
  React.useEffect(() => {
    if (!currentValue || valueInOptions || isLoading) {
      if (valueInOptions) {
        lastResolvedValueRef.current = undefined;
        setResolvedItem(null);
      }
      return;
    }
    if (lastResolvedValueRef.current === currentValue) return;
    if (definition === null || definition === 'reactive' || Array.isArray(definition)) return;
    if (!definition.resolve) return;

    lastResolvedValueRef.current = currentValue;
    let cancelled = false;
    void Promise.resolve(definition.resolve(currentValue)).then((item) => {
      if (cancelled) return;
      const [mappedItem] = buildSelectOptions([item], props.children);
      if (mappedItem !== undefined) setResolvedItem(mappedItem);
    });
    return () => {
      cancelled = true;
    };
    // definition, registry, props.children intentionally omitted —
    // resolve re-triggers on value/options changes, not datasource identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentValue, valueInOptions, isLoading]);

  // Merge resolved item into options so the combobox displays the correct label
  const mergedOptions =
    resolvedItem !== null && !valueInOptions ? [resolvedItem, ...options] : options;

  const AutocompleteOptionImpl = getComponent('AutocompleteOption');
  if (!AutocompleteOptionImpl) {
    throw new Error('Enforma: component "AutocompleteOption" is not registered.');
  }
  const renderedOptions = mergedOptions.map((opt) => (
    <AutocompleteOptionImpl key={String(opt.value)} value={opt.value} label={opt.label} />
  ));
  const matched = mergedOptions.find((opt) => opt.value === currentValue);
  const displayValue = matched?.label ?? (typeof currentValue === 'string' ? currentValue : '');
  return dispatchComponent('Autocomplete', {
    ...resolved,
    options: mergedOptions,
    children: renderedOptions,
    displayValue,
    isLoading,
    dataSourceError: dataSourceError ?? null,
    onInputChange: setInputValue,
    disableClientFilter,
  } as ResolvedAutocompleteProps);
}

function ExclusiveToggleDispatch(props: ExclusiveToggleProps) {
  const resolved = useFieldProps<FieldResolved<unknown>>(props);
  const {
    items,
    isLoading,
    error: dataSourceError,
  } = useDataSource(props.dataSource, {
    bind: props.bind,
  });
  const options = buildSelectOptions(items, props.children);
  const ExclusiveToggleOptionImpl = getComponent('ExclusiveToggleOption');
  if (!ExclusiveToggleOptionImpl) {
    throw new Error('Enforma: component "ExclusiveToggleOption" is not registered.');
  }
  const renderedOptions = options.map((opt) => (
    <ExclusiveToggleOptionImpl key={String(opt.value)} value={opt.value} label={opt.label} />
  ));
  return dispatchComponent('ExclusiveToggle', {
    ...resolved,
    options,
    children: renderedOptions,
    isLoading,
    dataSourceError: dataSourceError ?? null,
  } as ResolvedExclusiveToggleProps);
}

export const DatePicker = memo(DatePickerDispatch, stablePropsEqual);
export const TimePicker = memo(TimePickerDispatch, stablePropsEqual);
export const DateTimePicker = memo(DateTimePickerDispatch, stablePropsEqual);
export const TextInput = memo(TextInputDispatch, stablePropsEqual);
export const Textarea = memo(TextareaDispatch, stablePropsEqual);
export const Checkbox = memo(CheckboxDispatch, stablePropsEqual);
export const Switch = memo(SwitchDispatch, stablePropsEqual);
export const NumberInput = memo(NumberInputDispatch, stablePropsEqual);
export const Fieldset = memo(FieldsetDispatch, stablePropsEqual);
export const Select = Object.assign(memo(SelectDispatch, stablePropsEqual), {
  Option: SelectOption,
});
export const RadioGroup = Object.assign(memo(RadioGroupDispatch, stablePropsEqual), {
  Option: RadioGroupOption,
});
export const Autocomplete = Object.assign(memo(AutocompleteDispatch, stablePropsEqual), {
  Option: AutocompleteOption,
});
export const ExclusiveToggle = Object.assign(memo(ExclusiveToggleDispatch, stablePropsEqual), {
  Option: ExclusiveToggleOption,
});

export { SelectOption };
export { RadioGroupOption };
export { AutocompleteOption };
export { ExclusiveToggleOption };
