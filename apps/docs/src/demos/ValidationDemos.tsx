// apps/docs/src/demos/ValidationDemos.tsx
import Enforma from 'enforma';
import { Preview } from '../components/Preview';

export function ValidateDemo() {
  return (
    <Preview>
      <Enforma.TextInput
        bind="email"
        label="Email"
        validate={(value) => {
          if (!value) return 'Email is required';
          if (!String(value).includes('@')) return 'Enter a valid email';
          return null;
        }}
      />
      <Enforma.Submit />
    </Preview>
  );
}

export function CrossFieldValidationDemo() {
  return (
    <Preview>
      <Enforma.TextInput bind="password" label="Password" />
      <Enforma.TextInput
        bind="confirmPassword"
        label="Confirm password"
        validate={(value, { password }) => (value !== password ? 'Passwords do not match' : null)}
      />
      <Enforma.Submit />
    </Preview>
  );
}

export function ConstraintsDemo() {
  return (
    <Preview>
      <Enforma.TextInput bind="username" label="Username" required minLength={3} maxLength={20} />
      <Enforma.Submit />
    </Preview>
  );
}
