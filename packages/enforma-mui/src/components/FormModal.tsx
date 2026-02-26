import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { type ResolvedFormModalProps } from 'enforma';

export function FormModal({
  open,
  mode,
  title,
  children,
  onConfirm,
  onCancel,
  onDelete,
}: ResolvedFormModalProps) {
  return (
    <Dialog open={open} onClose={onCancel}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>{children}</DialogContent>
      <DialogActions>
        {onDelete !== undefined && mode !== 'CREATE' && (
          <Button color="error" onClick={onDelete}>
            Delete
          </Button>
        )}
        {mode !== 'DISPLAY' && (
          <>
            <Button onClick={onCancel}>Cancel</Button>
            <Button onClick={onConfirm} variant="contained">
              Confirm
            </Button>
          </>
        )}
        {mode === 'DISPLAY' && <Button onClick={onCancel}>Close</Button>}
      </DialogActions>
    </Dialog>
  );
}
