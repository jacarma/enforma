// packages/enforma/src/components/List.tsx
import { useState, type ReactNode } from 'react';
import React from 'react';
import { Form } from './Form';
import type { FormValues } from '../store/FormStore';
import { useListState } from '../hooks/useListState';
import { ListItemSlot, type ListItemSlotProps } from './ListItemSlot';
import { ListFormSlot, type ListFormSlotProps, type ListFormSlotMode } from './ListFormSlot';
import { getComponent } from './registry';
import type { ResolvedListItemProps } from './types';

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

  // Build list item nodes
  const ListItemImpl = getComponent('ListItem');
  const items: ReactNode[] = arr.map((item, index) => {
    if (!ListItemImpl) return null;
    const itemProps: ResolvedListItemProps = {
      item: item as FormValues,
      index,
      onEdit: () => {
        openModal(index, disabled ? 'DISPLAY' : 'UPDATE');
      },
      onDelete: () => {
        handleDelete(index);
      },
      disabled,
      title: itemSlot !== undefined ? evalProp(itemSlot.title, item) : '',
      showDeleteButton: itemSlot?.showDeleteButton ?? false,
      ...(itemSlot?.subtitle !== undefined ? { subtitle: evalProp(itemSlot.subtitle, item) } : {}),
      ...(itemSlot?.avatar !== undefined ? { avatar: evalProp(itemSlot.avatar, item) } : {}),
    };
    return <ListItemImpl key={keys[index] ?? String(index)} {...itemProps} />;
  });

  // Build add button node
  const AddButtonImpl = getComponent('AddButton');
  const addButton = AddButtonImpl ? (
    <AddButtonImpl
      onClick={() => {
        openModal(arr.length, 'CREATE');
      }}
      disabled={disabled}
    />
  ) : null;

  // Build modal node
  const activeForm = modal.open ? resolveForm(formSlots, modal.mode) : undefined;
  const dialogTitle = modal.open
    ? modal.mode === 'CREATE'
      ? 'Add item'
      : modal.mode === 'UPDATE'
        ? 'Edit item'
        : 'View item'
    : '';

  const FormModalImpl = getComponent('FormModal');
  const modalNode = FormModalImpl ? (
    <FormModalImpl
      open={modal.open}
      mode={modal.open ? modal.mode : 'CREATE'}
      title={dialogTitle}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      {...(modal.open &&
      modal.mode !== 'CREATE' &&
      !disabled &&
      activeForm?.showDeleteButton === true
        ? {
            onDelete: () => {
              handleDelete(modal.index);
            },
          }
        : {})}
    >
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
    </FormModalImpl>
  ) : null;

  // Dispatch to registered List
  const ListImpl = getComponent('List');
  if (!ListImpl) {
    throw new Error('Enforma: component "List" is not registered.');
  }

  return (
    <ListImpl
      items={items}
      addButton={addButton}
      modal={modalNode}
      isEmpty={arr.length === 0}
      disabled={disabled}
    />
  );
}

export const List = Object.assign(ListMain, {
  Item: ListItemSlot,
  Form: ListFormSlot,
});
