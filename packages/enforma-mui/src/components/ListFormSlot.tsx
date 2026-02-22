// packages/enforma-mui/src/components/ListFormSlot.tsx
import { type ReactNode } from 'react';

export type ListFormSlotMode = 'CREATE' | 'UPDATE' | 'DISPLAY';

export type ListFormSlotProps = {
  mode?: ListFormSlotMode;
  showDeleteButton?: boolean;
  children: ReactNode;
};

export function ListFormSlot(_props: ListFormSlotProps): null {
  return null;
}
