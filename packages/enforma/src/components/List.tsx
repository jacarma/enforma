// packages/enforma/src/components/List.tsx
import { useRef } from 'react';
import { type ReactNode } from 'react';
import { flushSync } from 'react-dom';
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

  const keyCountRef = useRef(0);
  const keysRef = useRef<string[]>([]);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  // Ensure we have a key for every item (handles externally grown arrays)
  while (keysRef.current.length < arr.length) {
    keysRef.current.push(String(keyCountRef.current++));
  }

  return (
    <Scope path={bind}>
      {arr.map((_, index) => {
        const stableKey = keysRef.current[index] ?? String(index);
        return (
          <Scope key={stableKey} path={String(index)}>
            {children}
            <button
              type="button"
              onMouseDown={() => {
                prevFocusRef.current =
                  document.activeElement instanceof HTMLElement ? document.activeElement : null;
              }}
              onClick={() => {
                keysRef.current = keysRef.current.filter((_, i) => i !== index);
                flushSync(() => {
                  setArr(arr.filter((__, i) => i !== index));
                });
                const toFocus = prevFocusRef.current;
                prevFocusRef.current = null;
                if (toFocus !== null && document.body.contains(toFocus)) {
                  toFocus.focus();
                }
              }}
            >
              Remove
            </button>
          </Scope>
        );
      })}
      <button
        type="button"
        onClick={() => {
          keysRef.current.push(String(keyCountRef.current++));
          setArr([...arr, defaultItem]);
        }}
      >
        Add
      </button>
    </Scope>
  );
}
