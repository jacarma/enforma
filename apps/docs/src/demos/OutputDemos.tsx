// apps/docs/src/demos/OutputDemos.tsx
import Enforma, { type FormValues } from 'enforma';
import { Preview } from '../components/Preview';

export function BasicDemo() {
  return (
    <Preview>
      <h3>
        Hello,{' '}
        <Enforma.Output
          as="span"
          value={(v: FormValues) => (v.name != null && v.name !== '' ? String(v.name) : 'stranger')}
        />
      </h3>
      <Enforma.TextInput bind="name" label="Name" />
    </Preview>
  );
}

export function StaticDemo() {
  return (
    <Preview>
      <Enforma.Output value="All fields marked with * are required." />
      <Enforma.TextInput bind="name" label="Name" required />
    </Preview>
  );
}
