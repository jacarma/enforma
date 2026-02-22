// packages/enforma/src/components/List.tsx
import { type ReactNode } from 'react';
import { useFormValue } from '../context/ScopeContext';
import { Scope } from './Scope';

type ListProps = {
  bind: string;
  defaultItem: Record<string, unknown>;
  children: ReactNode;
};

export function List({ bind, defaultItem, children }: ListProps) {
  const [rawArr, setArr] = useFormValue<unknown[]>(bind);
  const arr = rawArr ?? [];

  return (
    <Scope path={bind}>
      {arr.map((_, index) => (
        <Scope key={index} path={String(index)}>
          {children}
          <button
            type="button"
            onClick={() => {
              setArr(arr.filter((__, i) => i !== index));
            }}
          >
            Remove
          </button>
        </Scope>
      ))}
      <button
        type="button"
        onClick={() => {
          setArr([...arr, defaultItem]);
        }}
      >
        Add
      </button>
    </Scope>
  );
}
