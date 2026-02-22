// packages/enforma-mui/src/components/ListItemSlot.tsx
import { type FormValues } from 'enforma';

export type ListItemSlotProps = {
  title: string | ((item: FormValues) => string);
  subtitle?: string | ((item: FormValues) => string);
  avatar?: string | ((item: FormValues) => string);
  showDeleteButton?: boolean;
};

// Props are read externally by the parent via React.Children — not used in the body
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ListItemSlot(_: ListItemSlotProps): null {
  return null;
}
