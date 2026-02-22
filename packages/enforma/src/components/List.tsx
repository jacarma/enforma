// packages/enforma/src/components/List.tsx
import { useRef, type ReactNode } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);

  // Ensure we have a key for every item (handles externally grown arrays)
  while (keysRef.current.length < arr.length) {
    keysRef.current.push(String(keyCountRef.current++));
  }

  // Trim surplus keys when the array shrinks externally (e.g. form reset, bulk delete)
  if (keysRef.current.length > arr.length) {
    keysRef.current = keysRef.current.slice(0, arr.length);
  }

  return (
    <Scope path={bind}>
      <div ref={containerRef}>
        {arr.map((_, index) => {
          return (
            <Scope key={keysRef.current[index] ?? String(index)} path={String(index)}>
              {children}
              <button
                type="button"
                onMouseDown={() => {
                  prevFocusRef.current =
                    document.activeElement instanceof HTMLElement ? document.activeElement : null;
                }}
                onClick={() => {
                  const mouseTarget = prevFocusRef.current;
                  prevFocusRef.current = null;

                  const newArr = arr.filter((__, i) => i !== index);
                  keysRef.current = keysRef.current.filter((_, i) => i !== index);
                  flushSync(() => {
                    setArr(newArr);
                  });

                  if (mouseTarget !== null && document.body.contains(mouseTarget)) {
                    // Mouse click: restore pre-click focus
                    mouseTarget.focus();
                  } else if (containerRef.current !== null && newArr.length > 0) {
                    // Keyboard activation: focus the input at the nearest remaining index.
                    // NOTE: assumes one focusable <input> per list item.
                    const inputs = containerRef.current.querySelectorAll('input');
                    const targetInput = inputs[Math.min(index, newArr.length - 1)];
                    if (targetInput instanceof HTMLElement) {
                      targetInput.focus();
                    }
                  }
                }}
              >
                Remove
              </button>
            </Scope>
          );
        })}
      </div>
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
