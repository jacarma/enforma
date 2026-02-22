// packages/enforma/src/components/List.tsx
import { type ReactNode } from 'react';
import { Scope } from './Scope';
import { useListState } from '../hooks/useListState';

type ListProps = {
  bind: string;
  defaultItem: Record<string, unknown>;
  children: ReactNode;
};

export function List({ bind, defaultItem, children }: ListProps) {
  const { arr, keys, containerRef, append, remove, handleMouseDown } = useListState(
    bind,
    defaultItem,
  );

  return (
    <Scope path={bind}>
      <div ref={containerRef}>
        {arr.map((_, index) => (
          <Scope key={keys[index] ?? String(index)} path={String(index)}>
            {children}
            <button
              type="button"
              onMouseDown={handleMouseDown}
              onClick={() => {
                remove(index);
              }}
            >
              Remove
            </button>
          </Scope>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          append();
        }}
      >
        Add
      </button>
    </Scope>
  );
}
