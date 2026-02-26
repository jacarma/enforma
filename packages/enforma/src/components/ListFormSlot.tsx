// packages/enforma/src/components/ListFormSlot.tsx
import { type ReactNode } from 'react';

export type ListFormSlotMode = 'CREATE' | 'UPDATE' | 'DISPLAY';

export type ListFormSlotProps = {
  mode?: ListFormSlotMode;
  showDeleteButton?: boolean;
  children: ReactNode;
};

// Props are read externally by the parent via React.Children — not used in the body
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ListFormSlot(_: ListFormSlotProps): null {
  return null;
}
