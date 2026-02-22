// packages/enforma-mui/src/components/ListItemSlot.tsx
import { type FormValues } from 'enforma';

export type ListItemSlotProps = {
  title: string | ((item: FormValues) => string);
  subtitle?: string | ((item: FormValues) => string);
  avatar?: string | ((item: FormValues) => string);
  showDeleteButton?: boolean;
};

export function ListItemSlot(_props: ListItemSlotProps): null {
  return null;
}
