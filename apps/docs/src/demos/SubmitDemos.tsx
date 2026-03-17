// apps/docs/src/demos/SubmitDemos.tsx
import Enforma from 'enforma';
import { Preview } from '../components/Preview';

export function BasicDemo() {
  return (
    <Preview>
      <Enforma.TextInput bind="name" label="Name" required />
      <Enforma.Submit />
    </Preview>
  );
}

export function CustomLabelDemo() {
  return (
    <Preview>
      <Enforma.TextInput bind="name" label="Name" required />
      <Enforma.Submit>Save changes</Enforma.Submit>
    </Preview>
  );
}

export function DisabledWhenInvalidDemo() {
  return (
    <Preview>
      <Enforma.TextInput bind="name" label="Name" required />
      <Enforma.Submit disabled={(_, { formValid }) => !formValid} />
    </Preview>
  );
}
