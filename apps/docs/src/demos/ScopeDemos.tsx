// apps/docs/src/demos/ScopeDemos.tsx
import Enforma from 'enforma';
import { Preview } from '../components/Preview';

export function BasicDemo() {
  return (
    <Preview>
      <Enforma.Scope bind="address">
        <Enforma.TextInput bind="city" label="City" />
        <Enforma.TextInput bind="zip" label="ZIP" />
      </Enforma.Scope>
    </Preview>
  );
}

export function NestedAddressDemo() {
  return (
    <Preview>
      <Enforma.Scope bind="address">
        <Enforma.TextInput bind="street" label="Street" />
        <Enforma.TextInput bind="city" label="City" />
        <Enforma.TextInput bind="zip" label="ZIP" />
      </Enforma.Scope>
    </Preview>
  );
}
