// packages/enforma/src/hooks/useListState.ts
import { useRef } from 'react';
import { flushSync } from 'react-dom';
import { useFormValue } from '../context/ScopeContext';

export function useListState(bind: string, defaultItem: Record<string, unknown>) {
  const [rawArr, setArr] = useFormValue<unknown[]>(bind);
  const arr = rawArr ?? [];

  const keyCountRef = useRef(0);
  const keysRef = useRef<string[]>([]);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  while (keysRef.current.length < arr.length) {
    keysRef.current.push(String(keyCountRef.current++));
  }
  if (keysRef.current.length > arr.length) {
    keysRef.current = keysRef.current.slice(0, arr.length);
  }

  const append = (item?: unknown): void => {
    keysRef.current.push(String(keyCountRef.current++));
    setArr([...arr, item ?? defaultItem]);
  };

  const remove = (index: number): void => {
    const mouseTarget = prevFocusRef.current;
    prevFocusRef.current = null;
    const newArr = arr.filter((_, i) => i !== index);
    keysRef.current = keysRef.current.filter((_, i) => i !== index);
    flushSync(() => {
      setArr(newArr);
    });
    if (mouseTarget !== null && document.body.contains(mouseTarget)) {
      mouseTarget.focus();
    } else if (containerRef.current !== null && newArr.length > 0) {
      const inputs = containerRef.current.querySelectorAll('input');
      const targetInput = inputs[Math.min(index, newArr.length - 1)];
      if (targetInput instanceof HTMLElement) {
        targetInput.focus();
      }
    }
  };

  const update = (index: number, item: unknown): void => {
    setArr(arr.map((v, i) => (i === index ? item : v)));
  };

  const handleMouseDown = (): void => {
    prevFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
  };

  return { arr, keys: keysRef.current, containerRef, append, remove, update, handleMouseDown };
}
