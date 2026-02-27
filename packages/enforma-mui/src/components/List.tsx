import { List as MuiList } from '@mui/material';
import { type ResolvedListProps } from 'enforma';

export function List({ items, addButton, modal }: ResolvedListProps) {
  return (
    <>
      <MuiList>{items}</MuiList>
      {addButton}
      {modal}
    </>
  );
}
