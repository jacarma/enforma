// apps/docs/src/demos/RadioGroupDemos.tsx
import { useState } from 'react';
import Enforma, { type FormValues } from 'enforma';
import { Preview } from '../components/Preview';

const countries = [
  { code: 'us', name: 'United States' },
  { code: 'gb', name: 'United Kingdom' },
];

export function BasicDemo() {
  return (
    <Preview>
      <Enforma.RadioGroup bind="size" label="Size">
        <Enforma.RadioGroup.Option value="s" label="Small" />
        <Enforma.RadioGroup.Option value="m" label="Medium" />
        <Enforma.RadioGroup.Option value="l" label="Large" />
      </Enforma.RadioGroup>
    </Preview>
  );
}

export function HorizontalDataSourceDemo() {
  const [values, setValues] = useState<FormValues>({});
  return (
    <div className="preview-card not-content">
      <Enforma.Form values={values} onChange={setValues} dataSources={{ countries }}>
        <Enforma.RadioGroup bind="country" label="Country" dataSource="countries" row>
          <Enforma.RadioGroup.Option label="name" value="code" />
        </Enforma.RadioGroup>
      </Enforma.Form>
    </div>
  );
}

export function OpenChoiceDemo() {
  return (
    <Preview>
      <Enforma.RadioGroup bind="size" label="Size" openChoice>
        <Enforma.RadioGroup.Option value="s" label="Small" />
        <Enforma.RadioGroup.Option value="m" label="Medium" />
        <Enforma.RadioGroup.Option value="l" label="Large" />
      </Enforma.RadioGroup>
    </Preview>
  );
}
