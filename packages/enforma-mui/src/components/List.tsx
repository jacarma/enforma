// packages/enforma-mui/src/components/List.tsx
import { useState, type ReactNode } from 'react';
import React from 'react';
import {
  List as MuiList,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Form, type FormValues, useListState } from 'enforma';
import {
  ListItemSlot,
  type ListItemSlotProps,
  ListFormSlot,
  type ListFormSlotProps,
  type ListFormSlotMode,
} from 'enforma';

type ListProps = {
  bind: string;
  defaultItem: Record<string, unknown>;
  disabled?: boolean;
  children: ReactNode;
};

type ModalState = { open: false } | { open: true; index: number; mode: ListFormSlotMode };

function resolveForm(
  forms: ListFormSlotProps[],
  mode: ListFormSlotMode,
): ListFormSlotProps | undefined {
  return forms.find((f) => f.mode === mode) ?? forms.find((f) => f.mode === undefined);
}

function evalProp(prop: string | ((item: FormValues) => string), item: unknown): string {
  if (typeof prop === 'function') return prop(item as FormValues);
  const value = (item as FormValues)[prop];
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
    return '';
  }
  return String(value);
}

function ListMain({ bind, defaultItem, disabled = false, children }: ListProps) {
  const { arr, keys, append, remove, update } = useListState(bind, defaultItem);
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [draftValues, setDraftValues] = useState<FormValues>({});

  // Parse slot children
  let itemSlot: ListItemSlotProps | undefined;
  const formSlots: ListFormSlotProps[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === ListItemSlot) {
      itemSlot = child.props as ListItemSlotProps;
    } else if (child.type === ListFormSlot) {
      formSlots.push(child.props as ListFormSlotProps);
    }
  });

  const openModal = (index: number, mode: ListFormSlotMode) => {
    const draft =
      mode === 'CREATE' ? { ...defaultItem } : { ...(arr[index] as Record<string, unknown>) };
    setDraftValues(draft);
    setModal({ open: true, index, mode });
  };

  const handleConfirm = () => {
    if (!modal.open) return;
    if (modal.mode === 'CREATE') {
      append(draftValues as Record<string, unknown>);
    } else {
      update(modal.index, draftValues as Record<string, unknown>);
    }
    setModal({ open: false });
  };

  const handleCancel = () => {
    setModal({ open: false });
  };

  const handleDelete = (index: number) => {
    remove(index);
    setModal({ open: false });
  };

  const activeForm = modal.open ? resolveForm(formSlots, modal.mode) : undefined;

  const dialogTitle = modal.open
    ? modal.mode === 'CREATE'
      ? 'Add item'
      : modal.mode === 'UPDATE'
        ? 'Edit item'
        : 'View item'
    : '';

  return (
    <>
      <MuiList>
        {arr.map((item, index) => (
          <ListItemButton
            key={keys[index]}
            onClick={() => {
              openModal(index, disabled ? 'DISPLAY' : 'UPDATE');
            }}
          >
            {itemSlot?.avatar !== undefined && (
              <ListItemAvatar>
                <Avatar src={evalProp(itemSlot.avatar, item)} />
              </ListItemAvatar>
            )}
            {itemSlot !== undefined && (
              <ListItemText
                primary={evalProp(itemSlot.title, item)}
                secondary={
                  itemSlot.subtitle !== undefined ? evalProp(itemSlot.subtitle, item) : undefined
                }
              />
            )}
            {itemSlot?.showDeleteButton === true && !disabled && (
              <IconButton
                edge="end"
                aria-label="delete"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(index);
                }}
              >
                ✕
              </IconButton>
            )}
          </ListItemButton>
        ))}
      </MuiList>

      {!disabled && (
        <Button
          onClick={() => {
            openModal(arr.length, 'CREATE');
          }}
        >
          Add
        </Button>
      )}

      <Dialog open={modal.open} onClose={handleCancel}>
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent>
          {modal.open && activeForm !== undefined && (
            <Form
              values={draftValues}
              onChange={(v) => {
                setDraftValues(v);
              }}
              aria-label={dialogTitle}
            >
              {activeForm.children}
            </Form>
          )}
        </DialogContent>
        <DialogActions>
          {modal.open &&
            activeForm?.showDeleteButton === true &&
            modal.mode !== 'CREATE' &&
            !disabled && (
              <Button
                color="error"
                onClick={() => {
                  handleDelete(modal.index);
                }}
              >
                Delete
              </Button>
            )}
          {modal.open && modal.mode !== 'DISPLAY' && (
            <>
              <Button onClick={handleCancel}>Cancel</Button>
              <Button onClick={handleConfirm} variant="contained">
                Confirm
              </Button>
            </>
          )}
          {modal.open && modal.mode === 'DISPLAY' && <Button onClick={handleCancel}>Close</Button>}
        </DialogActions>
      </Dialog>
    </>
  );
}

export const List = Object.assign(ListMain, {
  Item: ListItemSlot,
  Form: ListFormSlot,
});
