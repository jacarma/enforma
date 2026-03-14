// apps/docs/src/demos/AutocompleteDemos.tsx
import { useState } from 'react';
import Enforma, { type FormValues, type DataSourceParams } from 'enforma';
import { Preview } from '../components/Preview';

const BOOKS = [
  { key: '1', label: 'The Great Gatsby' },
  { key: '2', label: 'To Kill a Mockingbird' },
  { key: '3', label: 'Pride and Prejudice' },
];

const booksSource = {
  query: ({ search }: DataSourceParams) =>
    BOOKS.filter((b) => !search || b.label.toLowerCase().includes(search.toLowerCase())),
  resolve: (value: unknown) =>
    BOOKS.find((b) => b.key === value) ?? { key: String(value), label: String(value) },
};

export function BasicDemo() {
  return (
    <Preview>
      <Enforma.Autocomplete bind="country" label="Country">
        <Enforma.Autocomplete.Option value="us" label="United States" />
        <Enforma.Autocomplete.Option value="gb" label="United Kingdom" />
      </Enforma.Autocomplete>
    </Preview>
  );
}

export function AsyncSourceDemo() {
  const [values, setValues] = useState<FormValues>({});
  return (
    <div className="preview-card not-content">
      <Enforma.Form values={values} onChange={setValues} dataSources={{ books: booksSource }}>
        <Enforma.Autocomplete bind="book" label="Book" dataSource="books" minSearchLength={0}>
          <Enforma.Autocomplete.Option label="label" value="key" />
        </Enforma.Autocomplete>
      </Enforma.Form>
    </div>
  );
}
