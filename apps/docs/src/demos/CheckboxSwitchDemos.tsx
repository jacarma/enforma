// apps/docs/src/demos/CheckboxSwitchDemos.tsx
import Enforma from 'enforma';
import { Preview } from '../components/Preview';

export function BasicDemo() {
  return (
    <Preview>
      <Enforma.Checkbox bind="agree" label="I agree to the terms" />
      <Enforma.Switch bind="darkMode" label="Dark mode" />
    </Preview>
  );
}

export function ReactiveDisabledDemo() {
  return (
    <Preview>
      <Enforma.Checkbox bind="agree" label="I agree to the terms" />
      <Enforma.Checkbox
        bind="newsletter"
        label="Subscribe to newsletter"
        disabled={({ agree }) => !agree}
      />
    </Preview>
  );
}

export function SwitchLabelDemo() {
  return (
    <Preview>
      <Enforma.Switch bind="notifications" label="Email notifications" labelPlacement="start" />
    </Preview>
  );
}

export function RequiredDemo() {
  return (
    <Preview>
      <Enforma.Checkbox bind="terms" label="I accept the terms and conditions" required />
    </Preview>
  );
}
