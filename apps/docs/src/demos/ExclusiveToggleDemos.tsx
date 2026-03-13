// apps/docs/src/demos/ExclusiveToggleDemos.tsx
import Enforma from 'enforma';
import { Preview } from '../components/Preview';

export function BasicDemo() {
  return (
    <Preview>
      <Enforma.ExclusiveToggle bind="size" label="Size">
        <Enforma.ExclusiveToggle.Option value="s" label="S" />
        <Enforma.ExclusiveToggle.Option value="m" label="M" />
        <Enforma.ExclusiveToggle.Option value="l" label="L" />
      </Enforma.ExclusiveToggle>
    </Preview>
  );
}

export function OpenChoiceDemo() {
  return (
    <Preview initialValues={{ format: 'epub' }}>
      <Enforma.ExclusiveToggle bind="format" label="Format" openChoice>
        <Enforma.ExclusiveToggle.Option value="pdf" label="PDF" />
        <Enforma.ExclusiveToggle.Option value="csv" label="CSV" />
      </Enforma.ExclusiveToggle>
    </Preview>
  );
}
