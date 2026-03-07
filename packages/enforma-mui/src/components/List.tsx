import { Card, CardActions, CardContent, List as MuiList } from '@mui/material';
import { type ResolvedListProps } from 'enforma';

export function List({ items, addButton, modal }: ResolvedListProps) {
  return (
    <>
      <Card variant="outlined">
        <CardContent>
          <MuiList>{items}</MuiList>
        </CardContent>
        <CardActions>{addButton}</CardActions>
      </Card>
      {modal}
    </>
  );
}
