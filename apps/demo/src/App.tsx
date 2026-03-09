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

let cachedTypes: PokemonItem[] | null = null;
const cachedPokemon = new Map<string, PokemonItem[]>();

type BookItem = {
  key: string;
  title: string;
  label: string;
};

interface OLSearchDoc {
  key: string;
  title: string;
  author_name?: string[];
}

interface OLSearchResponse {
  docs: OLSearchDoc[];
}

interface OLWorkResponse {
  key: string;
  title: string;
}

const OPEN_LIBRARY_DATASOURCES: Record<string, DataSourceDefinition<BookItem>> = {
  books: {
    query: async ({ search, filters }: DataSourceParams): Promise<BookItem[]> => {
      if (!search) return [];
      const params = new URLSearchParams({
        q: search,
        fields: 'key,title,author_name',
        limit: '10',
      });
      const subject = filters.subject as string | undefined;
      if (subject) params.set('subject', subject);
      const res = await fetch(`https://openlibrary.org/search.json?${params.toString()}`);
      const data = (await res.json()) as OLSearchResponse;
      return data.docs.map((doc) => {
        const firstAuthor = doc.author_name?.[0];
        return {
          key: doc.key,
          title: doc.title,
          label: firstAuthor !== undefined ? `${doc.title} — ${firstAuthor}` : doc.title,
        };
      });
    },
    resolve: async (value: unknown): Promise<BookItem> => {
      const id = (value as string).replace('/works/', '');
      const res = await fetch(`https://openlibrary.org/works/${id}.json`);
      const data = (await res.json()) as OLWorkResponse;
      return { key: data.key, title: data.title, label: data.title };
    },
  },
};

const POKEMON_DATASOURCES: Record<string, DataSourceDefinition<PokemonItem>> = {
  types: {
    query: async ({ search }: DataSourceParams): Promise<PokemonItem[]> => {
      if (!cachedTypes) {
        const res = await fetch('https://pokeapi.co/api/v2/type?limit=20');
        const data = (await res.json()) as { results: { name: string }[] };
        cachedTypes = data.results
          .filter((t) => t.name !== 'unknown' && t.name !== 'shadow')
          .map((t) => ({ name: t.name, label: capitalize(t.name) }));
      }
      if (!search) return cachedTypes;
      const q = search.toLowerCase();
      return cachedTypes.filter((t) => t.name.includes(q));
    },
  },
  pokemon: {
    query: async ({ filters, search }: DataSourceParams): Promise<PokemonItem[]> => {
      const type = filters.type as string;
      if (!type) return [];
      if (!cachedPokemon.has(type)) {
        const res = await fetch(`https://pokeapi.co/api/v2/type/${type}`);
        const data = (await res.json()) as {
          pokemon: { pokemon: { name: string } }[];
        };
        cachedPokemon.set(
          type,
          data.pokemon.map(({ pokemon }) => ({
            name: pokemon.name,
            label: capitalize(pokemon.name),
          })),
        );
      }
      const all = cachedPokemon.get(type) ?? [];
      if (!search) return all;
      const q = search.toLowerCase();
      return all.filter((p) => p.name.includes(q));
    },
  },
};

type VariantKey = 'classic' | 'outlined' | 'standard';

registerComponents(muiComponents, { variant: 'classic', dateAdapter: 'dayjs' });

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
  const [radioValues, setRadioValues] = useState<FormValues>({ size: '', country: '' });
  const [autocompleteValues, setAutocompleteValues] = useState<Record<string, unknown>>({
    country: '',
    plan: '',
    subject: 'fantasy',
    book: '/works/OL82563W',
  });
  const [toggleValues, setToggleValues] = useState<Record<string, unknown>>({
    size: '',
    plan: '',
  });
  const [openChoiceValues, setOpenChoiceValues] = useState<Record<string, unknown>>({
    color: '',
    size: '',
    format: 'tangerine', // pre-loaded custom value to show auto-detection
  });
  const [numericValues, setNumericValues] = useState<FormValues>({});
  const [calculatedValues, setCalculatedValues] = useState<FormValues>({ q1: 0, q2: 0 });
  const [outputValues, setOutputValues] = useState<FormValues>({ name: '' });
  const [dateValues, setDateValues] = useState<FormValues>({});
  const [phq9Values, setPhq9Values] = useState<FormValues>({});

  const handleVariantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value as VariantKey;
    registerComponents(muiComponents, { variant: v, dateAdapter: 'dayjs' });
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
          disabled={({ name }) => !name}
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

      <h2>Radio Group</h2>
      <p style={{ color: '#555', marginBottom: '1rem' }}>
        <code>RadioGroup</code> works like <code>Select</code> — inline children or a datasource,
        with optional <code>row</code> layout and reactive <code>disabled</code>.
      </p>

      <Enforma.Form
        values={radioValues}
        onChange={setRadioValues}
        aria-label="radio group demo form"
        dataSources={DATASOURCE_DEMO_SOURCES}
      >
        {/* RadioGroup — inline options */}
        <Enforma.RadioGroup bind="size" label="Size">
          <Enforma.RadioGroup.Option value="s" label="Small" />
          <Enforma.RadioGroup.Option value="m" label="Medium" />
          <Enforma.RadioGroup.Option value="l" label="Large" />
        </Enforma.RadioGroup>

        {/* RadioGroup — datasource, row layout, reactive disabled */}
        <Enforma.RadioGroup
          bind="country"
          label="Country (row)"
          dataSource="countries"
          row
          disabled={(scope) => Boolean(scope.disableCountry)}
        >
          <Enforma.RadioGroup.Option label="name" value="code" />
        </Enforma.RadioGroup>
      </Enforma.Form>

      <pre style={{ marginTop: '2rem', background: '#f4f4f4', padding: '1rem' }}>
        {JSON.stringify(radioValues, null, 2)}
      </pre>

      <hr style={{ margin: '2rem 0' }} />

      <h2>Autocomplete</h2>
      <p style={{ color: '#555', marginBottom: '1rem' }}>
        <code>Autocomplete</code> is a searchable combobox. Subject uses inline options with MUI
        client-side filtering. Book uses{' '}
        <a href="https://openlibrary.org" target="_blank" rel="noreferrer">
          Open Library
        </a>{' '}
        server-side search — type 3+ chars to search, optional subject filter. Pre-selected book
        resolves its label on mount.
      </p>

      <Enforma.Form
        values={autocompleteValues}
        onChange={setAutocompleteValues}
        aria-label="autocomplete demo form"
        dataSources={{ ...DATASOURCE_DEMO_SOURCES, ...OPEN_LIBRARY_DATASOURCES }}
      >
        {/* Autocomplete — inline options, MUI filters client-side */}
        <Enforma.Autocomplete bind="country" label="Country">
          <Enforma.Autocomplete.Option value="au" label="Australia" />
          <Enforma.Autocomplete.Option value="nz" label="New Zealand" />
          <Enforma.Autocomplete.Option value="us" label="United States" />
        </Enforma.Autocomplete>

        {/* Autocomplete — datasource with template mapping */}
        <Enforma.Autocomplete bind="plan" label="Plan (datasource)" dataSource="countries">
          <Enforma.Autocomplete.Option label="name" value="code" />
        </Enforma.Autocomplete>

        {/* Autocomplete — inline subject options, MUI filters client-side */}
        <Enforma.Autocomplete bind="subject" label="Subject">
          <Enforma.Autocomplete.Option value="fantasy" label="Fantasy" />
          <Enforma.Autocomplete.Option value="science_fiction" label="Science Fiction" />
          <Enforma.Autocomplete.Option value="mystery" label="Mystery" />
          <Enforma.Autocomplete.Option value="history" label="History" />
          <Enforma.Autocomplete.Option value="romance" label="Romance" />
        </Enforma.Autocomplete>

        {/* Autocomplete — Open Library server-side search, minSearchLength=2, resolve for pre-selected */}
        <Enforma.Autocomplete
          bind="book"
          label="Book (type 3+ chars to search)"
          dataSource={{
            source: 'books',
            filters: (scope) => ({ subject: scope.subject as string }),
          }}
          minSearchLength={3}
        >
          <Enforma.Autocomplete.Option label="label" value="key" />
        </Enforma.Autocomplete>

        <p style={{ color: '#777', fontSize: '0.85rem', marginTop: '0.5rem' }}>
          Duplicate pair below is bound to the same values — changes sync instantly.
        </p>

        {/* Duplicate pair — same bindings, verifies sync and resolve */}
        <Enforma.Autocomplete bind="subject" label="Subject (duplicate)">
          <Enforma.Autocomplete.Option value="fantasy" label="Fantasy" />
          <Enforma.Autocomplete.Option value="science_fiction" label="Science Fiction" />
          <Enforma.Autocomplete.Option value="mystery" label="Mystery" />
          <Enforma.Autocomplete.Option value="history" label="History" />
          <Enforma.Autocomplete.Option value="romance" label="Romance" />
        </Enforma.Autocomplete>

        <Enforma.Autocomplete
          bind="book"
          label="Book (duplicate)"
          dataSource={{
            source: 'books',
            filters: (scope) => ({ subject: scope.subject as string }),
          }}
          minSearchLength={3}
        >
          <Enforma.Autocomplete.Option label="label" value="key" />
        </Enforma.Autocomplete>
      </Enforma.Form>

      <pre style={{ marginTop: '2rem', background: '#f4f4f4', padding: '1rem' }}>
        {JSON.stringify(autocompleteValues, null, 2)}
      </pre>

      <hr style={{ margin: '2rem 0' }} />

      <h2>Exclusive Toggle</h2>
      <p style={{ color: '#555', marginBottom: '1rem' }}>
        <code>ExclusiveToggle</code> is a segmented button group for single selection from a small
        fixed set — inline children or datasource.
      </p>

      <Enforma.Form
        values={toggleValues}
        onChange={setToggleValues}
        aria-label="exclusive toggle demo form"
        dataSources={DATASOURCE_DEMO_SOURCES}
      >
        {/* ExclusiveToggle — inline options */}
        <Enforma.ExclusiveToggle bind="size" label="Size">
          <Enforma.ExclusiveToggle.Option value="s" label="S" />
          <Enforma.ExclusiveToggle.Option value="m" label="M" />
          <Enforma.ExclusiveToggle.Option value="l" label="L" />
        </Enforma.ExclusiveToggle>

        {/* ExclusiveToggle — datasource with template mapping */}
        <Enforma.ExclusiveToggle bind="plan" label="Country (datasource)" dataSource="countries">
          <Enforma.ExclusiveToggle.Option label="name" value="code" />
        </Enforma.ExclusiveToggle>
      </Enforma.Form>

      <pre style={{ marginTop: '2rem', background: '#f4f4f4', padding: '1rem' }}>
        {JSON.stringify(toggleValues, null, 2)}
      </pre>

      <hr style={{ margin: '2rem 0' }} />

      <h2>openChoice</h2>
      <p style={{ color: '#555', marginBottom: '1rem' }}>
        Add <code>openChoice</code> to <code>Select</code>, <code>RadioGroup</code>, or{' '}
        <code>ExclusiveToggle</code> to append an "Other" option that reveals a text input. The
        typed value is stored directly as the field value. Pre-loaded values not in the options list
        are auto-detected as "Other".
      </p>
      <Enforma.Form values={openChoiceValues} onChange={setOpenChoiceValues}>
        <Enforma.Select bind="color" label="Color (openChoice)" openChoice>
          <Enforma.Select.Option value="red" label="Red" />
          <Enforma.Select.Option value="blue" label="Blue" />
          <Enforma.Select.Option value="green" label="Green" />
        </Enforma.Select>

        <Enforma.RadioGroup bind="size" label="Size (openChoice)" openChoice>
          <Enforma.RadioGroup.Option value="s" label="Small" />
          <Enforma.RadioGroup.Option value="m" label="Medium" />
          <Enforma.RadioGroup.Option value="l" label="Large" />
        </Enforma.RadioGroup>

        <Enforma.ExclusiveToggle
          bind="format"
          label="Format (openChoice, pre-loaded custom)"
          openChoice
        >
          <Enforma.ExclusiveToggle.Option value="pdf" label="PDF" />
          <Enforma.ExclusiveToggle.Option value="csv" label="CSV" />
        </Enforma.ExclusiveToggle>
      </Enforma.Form>

      <pre style={{ marginTop: '2rem', background: '#f4f4f4', padding: '1rem' }}>
        {JSON.stringify(openChoiceValues, null, 2)}
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

      <h2>Calculated Fields</h2>
      <p style={{ color: '#555', marginBottom: '1rem' }}>
        <code>Calculated</code> derives a value from form state. With <code>bind</code> the result
        is synced back into the store; without, it is display-only.
      </p>

      <Enforma.Form
        values={calculatedValues}
        onChange={setCalculatedValues}
        aria-label="calculated demo form"
      >
        <Enforma.NumberInput bind="q1" label="Q1 score" decimalScale={0} />
        <Enforma.NumberInput bind="q2" label="Q2 score" decimalScale={0} />
        <Enforma.Calculated<number>
          bind="total"
          value={(v) => (v.q1 as number) + (v.q2 as number)}
          label="Computed Total (synced into store)"
          description="Value is written back to form state via bind"
        />
        <Enforma.Calculated<number>
          value={(v) => (v.q1 as number) + (v.q2 as number)}
          label="Computed Total (display only)"
          description="Value is not written back to form state"
        />
      </Enforma.Form>

      <pre style={{ marginTop: '2rem', background: '#f4f4f4', padding: '1rem' }}>
        {JSON.stringify(calculatedValues, null, 2)}
      </pre>

      <hr style={{ margin: '2rem 0' }} />

      <h2>Output</h2>
      <p style={{ color: '#555', marginBottom: '1rem' }}>
        <code>Output</code> renders a read-only value inline. Pass a static value or a reactive
        function. Use the <code>as</code> prop to control the rendered element.
      </p>

      <Enforma.Form values={outputValues} onChange={setOutputValues} aria-label="output demo form">
        <h3>
          Hello,{' '}
          <Enforma.Output
            as="span"
            value={({ name }: Record<string, unknown>) =>
              typeof name === 'string' && name ? name : 'stranger'
            }
          />
        </h3>
        <Enforma.TextInput bind="name" label="Name" placeholder="Your name" />
        <Enforma.Output value="This is a static instruction note." />
      </Enforma.Form>

      <hr style={{ margin: '2rem 0' }} />

      <h2>Date &amp; Time Fields</h2>
      <p style={{ color: '#555', marginBottom: '1rem' }}>
        <code>DatePicker</code> stores a <code>Date</code> when valid, a <code>string</code> during
        partial entry. <code>TimePicker</code> stores <code>&quot;HH:mm&quot;</code>. Requires{' '}
        <code>@mui/x-date-pickers</code> and a date adapter (e.g.{' '}
        <code>registerComponents(muiComponents, {"{ dateAdapter: 'dayjs' }"})</code>).
      </p>

      <Enforma.Form values={dateValues} onChange={setDateValues} aria-label="date time demo form">
        <Enforma.DatePicker bind="birthday" label="Birthday" />
        <Enforma.TimePicker bind="meetingTime" label="Meeting time" ampm={false} />
        <Enforma.DateTimePicker bind="deadline" label="Deadline" />
      </Enforma.Form>

      <pre style={{ marginTop: '2rem', background: '#f4f4f4', padding: '1rem' }}>
        {JSON.stringify(dateValues, null, 2)}
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

      <hr style={{ margin: '2rem 0' }} />

      <h2>PHQ-9 Questionnaire</h2>
      <p style={{ color: '#555', marginBottom: '1rem' }}>
        Patient Health Questionnaire — 9 Item. Each question is scored 0–3; the{' '}
        <code>Calculated</code> field sums all answers to produce a total severity score.
      </p>

      <Enforma.Form values={phq9Values} onChange={setPhq9Values} aria-label="PHQ-9 form">
        <p style={{ fontWeight: 'bold', marginBottom: '1rem' }}>
          Over the last two weeks, how often have you been bothered by any of the following
          problems?
        </p>

        <Enforma.RadioGroup bind="q1" label="Little interest or pleasure in doing things?" row>
          <Enforma.RadioGroup.Option value={0} label="Not at all" />
          <Enforma.RadioGroup.Option value={1} label="Several days" />
          <Enforma.RadioGroup.Option value={2} label="More than half the days" />
          <Enforma.RadioGroup.Option value={3} label="Nearly every day" />
        </Enforma.RadioGroup>

        <Enforma.RadioGroup bind="q2" label="Feeling down, depressed, or hopeless?" row>
          <Enforma.RadioGroup.Option value={0} label="Not at all" />
          <Enforma.RadioGroup.Option value={1} label="Several days" />
          <Enforma.RadioGroup.Option value={2} label="More than half the days" />
          <Enforma.RadioGroup.Option value={3} label="Nearly every day" />
        </Enforma.RadioGroup>

        <Enforma.RadioGroup
          bind="q3"
          label="Trouble falling or staying asleep, or sleeping too much?"
          row
        >
          <Enforma.RadioGroup.Option value={0} label="Not at all" />
          <Enforma.RadioGroup.Option value={1} label="Several days" />
          <Enforma.RadioGroup.Option value={2} label="More than half the days" />
          <Enforma.RadioGroup.Option value={3} label="Nearly every day" />
        </Enforma.RadioGroup>

        <Enforma.RadioGroup bind="q4" label="Feeling tired or having little energy?" row>
          <Enforma.RadioGroup.Option value={0} label="Not at all" />
          <Enforma.RadioGroup.Option value={1} label="Several days" />
          <Enforma.RadioGroup.Option value={2} label="More than half the days" />
          <Enforma.RadioGroup.Option value={3} label="Nearly every day" />
        </Enforma.RadioGroup>

        <Enforma.RadioGroup bind="q5" label="Poor appetite or overeating?" row>
          <Enforma.RadioGroup.Option value={0} label="Not at all" />
          <Enforma.RadioGroup.Option value={1} label="Several days" />
          <Enforma.RadioGroup.Option value={2} label="More than half the days" />
          <Enforma.RadioGroup.Option value={3} label="Nearly every day" />
        </Enforma.RadioGroup>

        <Enforma.RadioGroup
          bind="q6"
          label="Feeling bad about yourself — or that you are a failure or have let yourself or your family down?"
          row
        >
          <Enforma.RadioGroup.Option value={0} label="Not at all" />
          <Enforma.RadioGroup.Option value={1} label="Several days" />
          <Enforma.RadioGroup.Option value={2} label="More than half the days" />
          <Enforma.RadioGroup.Option value={3} label="Nearly every day" />
        </Enforma.RadioGroup>

        <Enforma.RadioGroup
          bind="q7"
          label="Trouble concentrating on things, such as reading the newspaper or watching television?"
          row
        >
          <Enforma.RadioGroup.Option value={0} label="Not at all" />
          <Enforma.RadioGroup.Option value={1} label="Several days" />
          <Enforma.RadioGroup.Option value={2} label="More than half the days" />
          <Enforma.RadioGroup.Option value={3} label="Nearly every day" />
        </Enforma.RadioGroup>

        <Enforma.RadioGroup
          bind="q8"
          label="Moving or speaking so slowly that other people could have noticed? Or so fidgety or restless that you have been moving a lot more than usual?"
          row
        >
          <Enforma.RadioGroup.Option value={0} label="Not at all" />
          <Enforma.RadioGroup.Option value={1} label="Several days" />
          <Enforma.RadioGroup.Option value={2} label="More than half the days" />
          <Enforma.RadioGroup.Option value={3} label="Nearly every day" />
        </Enforma.RadioGroup>

        <Enforma.RadioGroup
          bind="q9"
          label="Thoughts that you would be better off dead, or thoughts of hurting yourself in some way?"
          row
        >
          <Enforma.RadioGroup.Option value={0} label="Not at all" />
          <Enforma.RadioGroup.Option value={1} label="Several days" />
          <Enforma.RadioGroup.Option value={2} label="More than half the days" />
          <Enforma.RadioGroup.Option value={3} label="Nearly every day" />
        </Enforma.RadioGroup>

        <Enforma.Calculated<number>
          bind="total"
          value={(v) =>
            ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9'].reduce(
              (sum, k) => sum + (typeof v[k] === 'number' ? v[k] : 0),
              0,
            )
          }
          label="PHQ-9 Total Score"
          description={(v) => {
            const phqKeys = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9'];
            const anyAnswered = phqKeys.some((k) => v[k] !== undefined);
            if (!anyAnswered) return 'Answer questions above to compute score';
            const score = phqKeys.reduce((sum, k) => sum + ((v[k] as number | undefined) ?? 0), 0);
            if (score <= 4) return `${String(score)} — None-minimal`;
            if (score <= 9) return `${String(score)} — Mild`;
            if (score <= 14) return `${String(score)} — Moderate`;
            if (score <= 19) return `${String(score)} — Moderately severe`;
            return `${String(score)} — Severe`;
          }}
        />
      </Enforma.Form>

      <pre style={{ marginTop: '2rem', background: '#f4f4f4', padding: '1rem' }}>
        {JSON.stringify(phq9Values, null, 2)}
      </pre>
    </div>
  );
}
