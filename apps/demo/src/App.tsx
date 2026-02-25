// apps/demo/src/App.tsx
import React, { useState, useEffect } from 'react';
import Enforma, {
  type FormValues,
  registerComponents,
  useFieldProps,
  useDataSource,
  SelectOption,
  type SelectProps,
  type SelectOptionProps,
  type DataSourceProp,
} from 'enforma';
import { classic, outlined, standard, List } from 'enforma-mui';

// Minimal Select adapter for demo purposes
type OptionItem = Record<string, string>;

const allCities: OptionItem[] = [
  { code: 'nyc', name: 'New York', country: 'us' },
  { code: 'la', name: 'Los Angeles', country: 'us' },
  { code: 'lon', name: 'London', country: 'gb' },
  { code: 'par', name: 'Paris', country: 'fr' },
];

function DemoSelect(props: SelectProps) {
  const { value, setValue, label, error, showError } = useFieldProps<string>(props);

  let labelKey = 'label';
  let valueKey = 'value';

  React.Children.forEach(props.children, (child) => {
    if (!React.isValidElement(child) || child.type !== SelectOption) return;
    const p = child.props as SelectOptionProps<OptionItem>;
    if (typeof p.label === 'string') labelKey = p.label;
    if (typeof p.value === 'string') valueKey = p.value;
  });

  const dataSource = props.dataSource as DataSourceProp<OptionItem> | undefined;
  const { items, isLoading } = useDataSource<OptionItem>(dataSource);

  // Clear the value when it's no longer in the available items (e.g. country changed).
  useEffect(() => {
    if (isLoading || !value) return;
    if (!items.some((item) => item[valueKey] === value)) {
      setValue('');
    }
  }, [items, isLoading, value, valueKey, setValue]);

  return (
    <div style={{ marginBottom: '1rem' }}>
      {label && <label>{label}</label>}
      <select
        value={value ?? ''}
        onChange={(e) => {
          setValue(e.target.value);
        }}
        disabled={isLoading}
      >
        <option value="">— select —</option>
        {items.map((item, i) => (
          <option key={i} value={item[valueKey] ?? ''}>
            {item[labelKey] ?? ''}
          </option>
        ))}
      </select>
      {showError && error && <span style={{ color: 'red' }}>{error}</span>}
    </div>
  );
}

const bundleMap = { classic, outlined, standard };
type VariantKey = keyof typeof bundleMap;

registerComponents({ ...classic, Select: DemoSelect });

const LIST_INITIAL: FormValues = {
  members: [{ name: 'Alice' }, { name: 'Bob' }],
};
const EMPTY_VALUES = {};

export function App() {
  const [variant, setVariant] = useState<VariantKey>('classic');
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [reactiveValues, setReactiveValues] = useState<FormValues>(EMPTY_VALUES);
  const [signupValues, setSignupValues] = useState<FormValues>(EMPTY_VALUES);
  const [submitted, setSubmitted] = useState<FormValues | null>(null);
  const [listValues, setListValues] = useState<FormValues>(LIST_INITIAL);

  const handleVariantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value as VariantKey;
    registerComponents(bundleMap[v]);
    setVariant(v);
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Enforma Demo</h1>

      <div style={{ marginBottom: '1.5rem' }}>
        <label htmlFor="variant-select" style={{ marginRight: '0.5rem' }}>
          Variant:
        </label>
        <select id="variant-select" value={variant} onChange={handleVariantChange}>
          <option value="classic">Classic</option>
          <option value="outlined">MUI Outline</option>
          <option value="standard">MUI Default</option>
        </select>
      </div>

      <Enforma.Form values={values} onChange={setValues} aria-label="demo form">
        <Enforma.TextInput bind="name" label="Name" placeholder="Your name" />
        <Enforma.TextInput bind="email" label="Email" placeholder="your@email.com" />

        <Enforma.Fieldset bind="address" title="Address">
          <Enforma.TextInput bind="city" label="City" placeholder="City" />
          <Enforma.Fieldset bind="street">
            <Enforma.TextInput bind="line1" label="Street line 1" placeholder="123 Main St" />
          </Enforma.Fieldset>
        </Enforma.Fieldset>
      </Enforma.Form>

      <pre style={{ marginTop: '2rem', background: '#f4f4f4', padding: '1rem' }}>
        {JSON.stringify(values, null, 2)}
      </pre>

      <hr style={{ margin: '2rem 0' }} />

      <h2>Reactive Attributes</h2>
      <p style={{ color: '#555', marginBottom: '1rem' }}>
        Props can be functions <code>(scopeValues, allValues) =&gt; T</code> that re-evaluate live
        as form state changes.
      </p>

      <Enforma.Form
        values={reactiveValues}
        onChange={setReactiveValues}
        aria-label="reactive demo form"
      >
        {/* Reactive disabled: email is locked until name is entered */}
        <Enforma.TextInput
          bind="name"
          label="Name"
          placeholder="Enter your name to unlock the next field"
        />
        <Enforma.TextInput
          bind="email"
          label={({ name }) =>
            `Email${String(name) === '' ? ' (locked until name is entered)' : ''}`
          }
          placeholder={({ name }) =>
            String(name) === '' ? 'Fill in your name first' : `Email for ${String(name)}`
          }
          disabled={({ name }) => String(name) === ''}
        />

        {/* Reactive label driven by another field */}
        <Enforma.TextInput bind="contactType" label="Contact type (try: personal / work)" />
        <Enforma.TextInput
          bind="contact"
          label={({ contactType }) =>
            contactType === 'work' ? 'Work contact' : 'Personal contact'
          }
          placeholder={({ contactType }) =>
            contactType === 'work' ? 'work@company.com' : 'personal@example.com'
          }
        />
      </Enforma.Form>

      <pre style={{ marginTop: '2rem', background: '#f4f4f4', padding: '1rem' }}>
        {JSON.stringify(reactiveValues, null, 2)}
      </pre>

      <hr style={{ margin: '2rem 0' }} />

      <h2>Validation</h2>
      <p style={{ color: '#555', marginBottom: '1rem' }}>
        Errors appear after blur. Submitting while invalid reveals all errors and blocks{' '}
        <code>onSubmit</code>.
      </p>

      {submitted !== null ? (
        <div>
          <p style={{ color: 'green', fontWeight: 'bold' }}>Submitted!</p>
          <pre style={{ background: '#f4f4f4', padding: '1rem' }}>
            {JSON.stringify(submitted, null, 2)}
          </pre>
          <button
            onClick={() => {
              setSubmitted(null);
              setSignupValues({});
            }}
          >
            Reset
          </button>
        </div>
      ) : (
        <Enforma.Form
          values={signupValues}
          onChange={setSignupValues}
          onSubmit={setSubmitted}
          aria-label="signup form"
        >
          <Enforma.TextInput
            bind="name"
            label="Name"
            placeholder="Your name"
            validate={(v) => (!v ? 'Name is required' : null)}
          />
          <Enforma.TextInput
            bind="email"
            label="Email"
            placeholder="you@example.com"
            validate={(v) => (!v ? 'Email is required' : null)}
          />
          <Enforma.TextInput
            bind="password"
            label="Password"
            placeholder="Choose a password"
            validate={(v) => (!v ? 'Password is required' : null)}
          />
          <Enforma.TextInput
            bind="confirm"
            label="Confirm password"
            placeholder="Repeat your password"
            validate={(v, { password }) =>
              v || password ? (v !== password ? 'Passwords do not match' : null) : null
            }
          />
          <button type="submit" style={{ marginTop: '0.5rem' }}>
            Sign up
          </button>
        </Enforma.Form>
      )}

      <hr style={{ margin: '2rem 0' }} />

      <h2>List</h2>
      <p style={{ color: '#555', marginBottom: '1rem' }}>
        Repeated sections driven by an array. Click a row to edit in a modal.
      </p>

      <Enforma.Form values={listValues} onChange={setListValues} aria-label="list demo form">
        <List bind="members" defaultItem={{ name: '' }}>
          <List.Item title="name" showDeleteButton />
          <List.Form showDeleteButton>
            <Enforma.TextInput bind="name" label="Name" />
          </List.Form>
        </List>
      </Enforma.Form>

      <pre style={{ marginTop: '2rem', background: '#f4f4f4', padding: '1rem' }}>
        {JSON.stringify(listValues, null, 2)}
      </pre>

      <hr style={{ margin: '2rem 0' }} />

      <h2>DataSources</h2>
      <p style={{ color: '#555', marginBottom: '1rem' }}>
        Select options driven by a static DataSource defined on the Form.
      </p>

      <Enforma.Form
        values={{ country: '', city: '' }}
        onChange={() => {}}
        aria-label="datasource demo form"
        dataSources={{
          countries: [
            { code: 'us', name: 'United States' },
            { code: 'gb', name: 'United Kingdom' },
            { code: 'fr', name: 'France' },
          ],
          cities: allCities,
        }}
      >
        <Enforma.Select bind="country" label="Country" dataSource="countries">
          <Enforma.Select.Option label="name" value="code" />
        </Enforma.Select>

        <Enforma.Select
          bind="city"
          label="City"
          dataSource={{
            source: 'cities',
            filters: (scope) => ({ country: scope.country }),
          }}
        >
          <Enforma.Select.Option label="name" value="code" />
        </Enforma.Select>
      </Enforma.Form>
    </div>
  );
}
