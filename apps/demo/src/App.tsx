// apps/demo/src/App.tsx
import React, { useState } from 'react';
import Enforma, {
  type FormValues,
  type FieldResolved,
  registerComponents,
  useFieldProps,
  type TextInputProps,
  type DataSourceDefinition,
  type DataSourceParams,
} from 'enforma';

function StarRating(props: TextInputProps) {
  const { value, setValue, label, error, showError, disabled } =
    useFieldProps<FieldResolved<number>>(props);
  return (
    <div>
      {label && <label>{label}</label>}
      <div>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => {
              setValue(star);
            }}
            disabled={disabled ?? false}
            aria-pressed={value === star}
            style={{ fontSize: '1.5rem', cursor: 'pointer', background: 'none', border: 'none' }}
          >
            {star <= (value ?? 0) ? '★' : '☆'}
          </button>
        ))}
      </div>
      {showError && error && <span style={{ color: 'red' }}>{error}</span>}
    </div>
  );
}
import muiComponents from 'enforma-mui';

type OptionItem = Record<string, string>;

const allCities: OptionItem[] = [
  { code: 'nyc', name: 'New York', country: 'us' },
  { code: 'la', name: 'Los Angeles', country: 'us' },
  { code: 'lon', name: 'London', country: 'gb' },
  { code: 'par', name: 'Paris', country: 'fr' },
];

const DATASOURCE_DEMO_SOURCES = {
  countries: [
    { code: 'us', name: 'United States' },
    { code: 'gb', name: 'United Kingdom' },
    { code: 'fr', name: 'France' },
  ],
  cities: allCities,
};

type PokemonItem = { name: string; label: string };

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const POKEMON_DATASOURCES: Record<string, DataSourceDefinition<PokemonItem>> = {
  types: {
    query: async (): Promise<PokemonItem[]> => {
      const res = await fetch('https://pokeapi.co/api/v2/type?limit=20');
      const data = (await res.json()) as { results: { name: string }[] };
      return data.results
        .filter((t) => t.name !== 'unknown' && t.name !== 'shadow')
        .map((t) => ({ name: t.name, label: capitalize(t.name) }));
    },
  },
  pokemon: {
    query: async ({ filters }: DataSourceParams): Promise<PokemonItem[]> => {
      const type = filters.type as string;
      if (!type) return [];
      const res = await fetch(`https://pokeapi.co/api/v2/type/${type}`);
      const data = (await res.json()) as {
        pokemon: { pokemon: { name: string } }[];
      };
      return data.pokemon.map(({ pokemon }) => ({
        name: pokemon.name,
        label: capitalize(pokemon.name),
      }));
    },
  },
};

type VariantKey = 'classic' | 'outlined' | 'standard';

registerComponents(muiComponents, { variant: 'classic' });

const LIST_INITIAL: FormValues = {
  members: [{ name: 'Alice' }, { name: 'Bob' }],
};
const EMPTY_VALUES = {};

export function App() {
  const [variant, setVariant] = useState<VariantKey>('classic');
  const [customValues, setCustomValues] = useState<FormValues>(EMPTY_VALUES);
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [reactiveValues, setReactiveValues] = useState<FormValues>(EMPTY_VALUES);
  const [maskedValues, setMaskedValues] = useState<FormValues>(EMPTY_VALUES);
  const [signupValues, setSignupValues] = useState<FormValues>(EMPTY_VALUES);
  const [submitted, setSubmitted] = useState<FormValues | null>(null);
  const [listValues, setListValues] = useState<FormValues>(LIST_INITIAL);
  const [boolValues, setBoolValues] = useState<FormValues>({});
  const [numericValues, setNumericValues] = useState<FormValues>({});

  const handleVariantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value as VariantKey;
    registerComponents(muiComponents, { variant: v });
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

      <h2>Custom Components</h2>
      <p style={{ color: '#555', marginBottom: '1rem' }}>
        Use <code>useFieldProps</code> to build your own fields. No registration needed — use them
        directly inside a form.
      </p>

      <Enforma.Form
        values={customValues}
        onChange={setCustomValues}
        aria-label="custom components demo form"
      >
        <StarRating
          bind="rating"
          label="Rating"
          validate={(v) => (!v ? 'Rating is required' : null)}
        />
        <Enforma.TextInput
          bind="comment"
          label="Comment"
          placeholder="Tell us more..."
          disabled={({ rating }) => !rating}
        />
        <button type="submit">Submit</button>
      </Enforma.Form>

      <pre style={{ marginTop: '2rem', background: '#f4f4f4', padding: '1rem' }}>
        {JSON.stringify(customValues, null, 2)}
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

      <h2>Boolean Fields</h2>
      <p style={{ color: '#555', marginBottom: '1rem' }}>
        <code>Checkbox</code> and <code>Switch</code> both bind to a boolean value. The{' '}
        <code>labelPlacement</code> prop controls where the label appears.
      </p>

      <Enforma.Form
        values={boolValues}
        onChange={setBoolValues}
        aria-label="boolean fields demo form"
      >
        <Enforma.Checkbox
          bind="agree"
          label="I agree to the terms"
          description="Required to continue"
        />
        <Enforma.Checkbox
          bind="newsletter"
          label="Subscribe to newsletter"
          labelPlacement="start"
          disabled={({ agree }) => !agree}
        />
        <Enforma.Switch bind="darkMode" label="Dark mode" />
        <Enforma.Switch
          bind="notifications"
          label="Email notifications"
          labelPlacement="start"
          validate={(v) => (!v ? 'Notifications must be enabled' : null)}
        />
      </Enforma.Form>

      <pre style={{ marginTop: '2rem', background: '#f4f4f4', padding: '1rem' }}>
        {JSON.stringify(boolValues, null, 2)}
      </pre>

      <hr style={{ margin: '2rem 0' }} />

      <h2>Numeric Fields</h2>
      <p style={{ color: '#555', marginBottom: '1rem' }}>
        <code>NumberInput</code> stores a <code>number | undefined</code> and formats using IMask's
        Number mask. Separators default to the browser locale (<code>Intl.NumberFormat</code>).
      </p>

      <Enforma.Form
        values={numericValues}
        onChange={setNumericValues}
        aria-label="numeric fields demo form"
      >
        <Enforma.NumberInput bind="price" label="Price (locale default)" />
        <Enforma.NumberInput
          bind="quantity"
          label="Quantity (integer)"
          decimalScale={0}
          thousandSeparator={false}
          allowNegative={false}
          validate={(v) => (v === undefined ? 'Required' : null)}
        />
        <Enforma.NumberInput
          bind="rate"
          label="Rate (0–100%)"
          decimalScale={2}
          min={0}
          max={100}
          allowNegative={false}
        />
      </Enforma.Form>

      <pre style={{ marginTop: '2rem', background: '#f4f4f4', padding: '1rem' }}>
        {JSON.stringify(numericValues, null, 2)}
      </pre>

      <hr style={{ margin: '2rem 0' }} />

      <h2>Masked Input</h2>
      <p style={{ color: '#555', marginBottom: '1rem' }}>
        The <code>mask</code> prop accepts an IMask pattern string. <code>react-imask</code> is
        loaded lazily — only when a masked field is rendered.
      </p>

      <Enforma.Form
        values={maskedValues}
        onChange={setMaskedValues}
        aria-label="masked input demo form"
      >
        <Enforma.TextInput
          bind="phone"
          label="Phone"
          mask="(000) 000-0000"
          placeholder="(555) 000-0000"
        />
        <Enforma.TextInput
          bind="dob"
          label="Date of birth"
          mask="00/00/0000"
          placeholder="MM/DD/YYYY"
        />
      </Enforma.Form>

      <pre style={{ marginTop: '2rem', background: '#f4f4f4', padding: '1rem' }}>
        {JSON.stringify(maskedValues, null, 2)}
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
        <Enforma.List bind="members" defaultItem={{ name: '' }}>
          <Enforma.List.Item title="name" showDeleteButton />
          <Enforma.List.Form showDeleteButton>
            <Enforma.TextInput bind="name" label="Name" />
          </Enforma.List.Form>
        </Enforma.List>
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
        dataSources={DATASOURCE_DEMO_SOURCES}
      >
        <Enforma.Select bind="country" label="Country" dataSource="countries">
          <Enforma.Select.Option label="name" value="code" />
        </Enforma.Select>

        <Enforma.Select
          bind="city"
          label="City"
          dataSource={{
            source: 'cities',
            filters: (scope) => ({ country: scope.country as string }),
          }}
        >
          <Enforma.Select.Option label="name" value="code" />
        </Enforma.Select>
      </Enforma.Form>

      <hr style={{ margin: '2rem 0' }} />

      <h2>API DataSources</h2>
      <p style={{ color: '#555', marginBottom: '1rem' }}>
        Select options loaded from the{' '}
        <a href="https://pokeapi.co" target="_blank" rel="noreferrer">
          PokeAPI
        </a>
        . Both selects use async query datasources. Picking a type reloads and clears the Pokémon
        select.
      </p>

      <Enforma.Form
        values={{ type: '', pokemon: '' }}
        onChange={() => {}}
        aria-label="api datasource demo form"
        dataSources={POKEMON_DATASOURCES}
      >
        <Enforma.Select bind="type" label="Type" dataSource="types">
          <Enforma.Select.Option label="label" value="name" />
        </Enforma.Select>

        <Enforma.Select
          bind="pokemon"
          label="Pokémon"
          dataSource={{ source: 'pokemon', filters: (scope) => ({ type: scope.type as string }) }}
        >
          <Enforma.Select.Option label="label" value="name" />
        </Enforma.Select>
      </Enforma.Form>
    </div>
  );
}
