// apps/docs/src/demos/SelectDemos.tsx
import { useState } from 'react';
import Enforma, { type FormValues } from 'enforma';
import { Preview } from '../components/Preview';

export function BasicDemo() {
  return (
    <Preview>
      <Enforma.Select bind="country" label="Country">
        <Enforma.Select.Option value="us" label="United States" />
        <Enforma.Select.Option value="gb" label="United Kingdom" />
      </Enforma.Select>
    </Preview>
  );
}

export function DataSourceDemo() {
  const [values, setValues] = useState<FormValues>({});
  return (
    <div className="preview-card">
      <Enforma.Form
        values={values}
        onChange={setValues}
        dataSources={{
          countries: [
            { code: 'us', name: 'United States' },
            { code: 'gb', name: 'United Kingdom' },
          ],
        }}
      >
        <Enforma.Select bind="country" label="Country" dataSource="countries">
          <Enforma.Select.Option label="name" value="code" />
        </Enforma.Select>
      </Enforma.Form>
    </div>
  );
}

export function CascadingDemo() {
  const [values, setValues] = useState<FormValues>({});
  return (
    <div className="preview-card">
      <Enforma.Form
        values={values}
        onChange={setValues}
        dataSources={{
          countries: [
            { code: 'us', name: 'United States' },
            { code: 'gb', name: 'United Kingdom' },
          ],
          cities: [
            { code: 'nyc', name: 'New York', country: 'us' },
            { code: 'la', name: 'Los Angeles', country: 'us' },
            { code: 'lon', name: 'London', country: 'gb' },
          ],
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
            filters: (scope) => ({ country: scope.country as string }),
          }}
        >
          <Enforma.Select.Option label="name" value="code" />
        </Enforma.Select>
      </Enforma.Form>
    </div>
  );
}

export function OpenChoiceDemo() {
  return (
    <Preview>
      <Enforma.Select bind="color" label="Favourite colour" openChoice>
        <Enforma.Select.Option value="red" label="Red" />
        <Enforma.Select.Option value="blue" label="Blue" />
      </Enforma.Select>
    </Preview>
  );
}
