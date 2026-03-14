// apps/docs/src/demos/ListDemos.tsx
import Enforma from 'enforma';
import { Preview } from '../components/Preview';

export function BasicDemo() {
  return (
    <Preview>
      <Enforma.List bind="members" defaultItem={{ name: '' }}>
        <Enforma.List.Item title="name" showDeleteButton />
        <Enforma.List.Form showDeleteButton>
          <Enforma.TextInput bind="name" label="Name" />
        </Enforma.List.Form>
      </Enforma.List>
    </Preview>
  );
}

export function MinMaxDemo() {
  return (
    <Preview>
      <Enforma.List bind="tags" defaultItem={{ tag: '' }} minItems={1} maxItems={3}>
        <Enforma.List.Item title="tag" showDeleteButton />
        <Enforma.List.Form showDeleteButton>
          <Enforma.TextInput bind="tag" label="Tag" required />
        </Enforma.List.Form>
      </Enforma.List>
    </Preview>
  );
}
