// apps/docs/src/demos/CalculatedDemos.tsx
import Enforma from 'enforma';
import { Preview } from '../components/Preview';

export function BasicDemo() {
  return (
    <Preview>
      <Enforma.NumberInput bind="q1" label="Q1" decimalScale={0} />
      <Enforma.NumberInput bind="q2" label="Q2" decimalScale={0} />
      <Enforma.Calculated<number>
        value={(v) => ((v.q1 as number) ?? 0) + ((v.q2 as number) ?? 0)}
        label="Total"
      />
      <Enforma.Calculated<number>
        bind="total"
        value={(v) => ((v.q1 as number) ?? 0) + ((v.q2 as number) ?? 0)}
        label="Total (stored)"
      />
    </Preview>
  );
}

export function ReactiveDescriptionDemo() {
  return (
    <Preview>
      <Enforma.NumberInput bind="q1" label="Q1" decimalScale={0} min={0} max={3} />
      <Enforma.NumberInput bind="q2" label="Q2" decimalScale={0} min={0} max={3} />
      <Enforma.NumberInput bind="q3" label="Q3" decimalScale={0} min={0} max={3} />
      <Enforma.Calculated<number>
        bind="score"
        value={(v) => ['q1', 'q2', 'q3'].reduce((sum, k) => sum + ((v[k] as number) ?? 0), 0)}
        label="Total score"
        description={(v) => {
          const score = (v.score as number) ?? 0;
          if (score <= 4) return 'Minimal';
          if (score <= 9) return 'Mild';
          return 'Severe';
        }}
      />
    </Preview>
  );
}
