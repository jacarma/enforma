// apps/docs/src/demos/TextInputDemos.tsx
import Enforma from 'enforma';
import { Preview } from '../components/Preview';

export function BasicDemo() {
  return (
    <Preview>
      <Enforma.TextInput bind="name" label="Name" placeholder="Your name" />
    </Preview>
  );
}

export function ValidationDemo() {
  return (
    <Preview>
      <Enforma.TextInput
        bind="email"
        label="Email"
        validate={(v) => (!v ? 'Required' : !String(v).includes('@') ? 'Invalid email' : null)}
      />
    </Preview>
  );
}

export function ReactiveLabelDemo() {
  return (
    <Preview>
      <Enforma.TextInput bind="name" label="Name" placeholder="Enter your name first" />
      <Enforma.TextInput
        bind="email"
        label={({ name }) => `Email for ${name ? String(name) : 'you'}`}
        disabled={({ name }) => !name}
      />
    </Preview>
  );
}

export function MaskDemo() {
  return (
    <Preview initialValues={{ phone: '5550000000', dob: '01011990' }}>
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
    </Preview>
  );
}

export function LengthDemo() {
  return (
    <Preview>
      <Enforma.TextInput bind="username" label="Username" required minLength={3} maxLength={20} />
    </Preview>
  );
}
