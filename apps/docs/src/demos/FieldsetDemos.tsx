// apps/docs/src/demos/FieldsetDemos.tsx
import Enforma from 'enforma';
import { Preview } from '../components/Preview';

export function BasicDemo() {
  return (
    <Preview>
      <Enforma.Fieldset bind="address" title="Address">
        <Enforma.TextInput bind="city" label="City" />
        <Enforma.TextInput bind="zip" label="ZIP code" />
      </Enforma.Fieldset>
    </Preview>
  );
}

export function NestedDemo() {
  return (
    <Preview>
      <Enforma.Fieldset bind="address" title="Address">
        <Enforma.TextInput bind="city" label="City" />
        <Enforma.Fieldset bind="street">
          <Enforma.TextInput bind="line1" label="Street line 1" />
          <Enforma.TextInput bind="line2" label="Street line 2" />
        </Enforma.Fieldset>
      </Enforma.Fieldset>
    </Preview>
  );
}

export function ConditionalDemo() {
  return (
    <Preview>
      <Enforma.Checkbox bind="hasBilling" label="Use a different billing address" />
      <Enforma.Fieldset bind="billing" removed={({ hasBilling }) => !hasBilling}>
        <Enforma.TextInput bind="street" label="Billing street" />
        <Enforma.TextInput bind="city" label="Billing city" />
      </Enforma.Fieldset>
    </Preview>
  );
}
