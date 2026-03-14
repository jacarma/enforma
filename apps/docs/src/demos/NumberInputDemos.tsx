// apps/docs/src/demos/NumberInputDemos.tsx
import Enforma from 'enforma';
import { Preview } from '../components/Preview';

export function BasicDemo() {
  return (
    <Preview>
      <Enforma.NumberInput bind="price" label="Price" />
    </Preview>
  );
}

export function IntegerDemo() {
  return (
    <Preview>
      <Enforma.NumberInput
        bind="quantity"
        label="Quantity"
        decimalScale={0}
        thousandSeparator={false}
        allowNegative={false}
      />
    </Preview>
  );
}

export function PercentageDemo() {
  return (
    <Preview>
      <Enforma.NumberInput
        bind="rate"
        label="Rate (0–100%)"
        decimalScale={2}
        min={0}
        max={100}
        allowNegative={false}
      />
    </Preview>
  );
}
