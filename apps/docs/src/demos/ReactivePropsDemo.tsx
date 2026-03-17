// apps/docs/src/demos/ReactivePropsDemo.tsx
import Enforma from 'enforma';
import { Preview } from '../components/Preview';

export function ReactiveDisabledDemo() {
  return (
    <Preview>
      <Enforma.TextInput bind="name" label="Name" />
      <Enforma.TextInput
        bind="email"
        label="Email"
        placeholder="your@email.com"
        disabled={({ name }) => !name}
      />
    </Preview>
  );
}

export function ReactiveLabelDemo() {
  return (
    <Preview>
      <Enforma.Select bind="contactType" label="Contact type">
        <Enforma.Select.Option value="personal" label="Personal" />
        <Enforma.Select.Option value="work" label="Work" />
      </Enforma.Select>
      <Enforma.TextInput
        bind="contact"
        label={({ contactType }) => (contactType === 'work' ? 'Work email' : 'Personal email')}
      />
    </Preview>
  );
}

export function ReactivePlaceholderDemo() {
  return (
    <Preview>
      <Enforma.Select bind="platform" label="Platform">
        <Enforma.Select.Option value="twitter" label="Twitter / X" />
        <Enforma.Select.Option value="instagram" label="Instagram" />
      </Enforma.Select>
      <Enforma.TextInput
        bind="handle"
        label="Handle"
        placeholder={({ platform }) => (platform === 'twitter' ? '@username' : 'username')}
      />
    </Preview>
  );
}

export function ReactiveValidationDemo() {
  return (
    <Preview>
      <Enforma.Select bind="deliveryMethod" label="Delivery method">
        <Enforma.Select.Option value="delivery" label="Delivery" />
        <Enforma.Select.Option value="pickup" label="Pickup in store" />
      </Enforma.Select>
      <Enforma.TextInput
        bind="address"
        label="Delivery address"
        validate={(value, { deliveryMethod }) =>
          deliveryMethod === 'delivery' && !value ? 'Address is required for delivery' : null
        }
      />
      <Enforma.Submit />
    </Preview>
  );
}
