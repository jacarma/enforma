// packages/enforma/src/components/List.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createPortal } from 'react-dom';
import userEvent from '@testing-library/user-event';
import { Form } from './Form';
import { List } from './List';
import { TextInput } from './fields';
import { registerComponents } from './registry';
import type {
  ResolvedListProps,
  ResolvedListItemProps,
  ResolvedFormModalProps,
  ResolvedAddButtonProps,
} from './types';
import { useFormStore } from '../context/FormContext';

// Minimal stub slot components used to exercise List orchestration logic.

function StubListWrap({ items, addButton, modal }: ResolvedListProps) {
  return (
    <div>
      <div data-testid="list-rows">{items}</div>
      {addButton}
      {modal}
    </div>
  );
}

function StubListItem({
  title,
  subtitle,
  onEdit,
  onDelete,
  showDeleteButton,
  disabled,
}: ResolvedListItemProps) {
  return (
    <div>
      <button type="button" onClick={onEdit}>
        {title}
      </button>
      {subtitle !== undefined && <span>{subtitle}</span>}
      {showDeleteButton && !disabled && (
        <button type="button" aria-label="delete" onClick={onDelete}>
          Delete
        </button>
      )}
    </div>
  );
}

function StubAddButton({ onClick, disabled }: ResolvedAddButtonProps) {
  if (disabled) return null;
  return (
    <button type="button" onClick={onClick}>
      Add
    </button>
  );
}

function StubFormModal({
  open,
  mode,
  title,
  children,
  onConfirm,
  onCancel,
  onDelete,
}: ResolvedFormModalProps) {
  if (!open) return null;
  return createPortal(
    <div role="dialog" aria-label={title}>
      {children}
      {mode !== 'DISPLAY' && (
        <>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm}>
            Confirm
          </button>
        </>
      )}
      {mode === 'DISPLAY' && (
        <button type="button" onClick={onCancel}>
          Close
        </button>
      )}
      {onDelete !== undefined && (
        <button type="button" onClick={onDelete}>
          Delete
        </button>
      )}
    </div>,
    document.body,
  );
}

beforeEach(() => {
  // setup.tsx beforeEach already clears registry and registers TextInput.
  // We add the List slot components on top.
  registerComponents({
    ListWrap: StubListWrap,
    ListItem: StubListItem,
    AddButton: StubAddButton,
    FormModal: StubFormModal,
  });
});

const defaultProps = { bind: 'items', defaultItem: { name: '' } };

function renderList(listProps: Partial<typeof defaultProps & { disabled?: boolean }> = {}) {
  const onChange = vi.fn();
  render(
    <Form values={{ items: [{ name: 'Alice' }, { name: 'Bob' }] }} onChange={onChange}>
      <List {...defaultProps} {...listProps}>
        <List.Item title="name" />
        <List.Form>
          <TextInput bind="name" label="Name" />
        </List.Form>
      </List>
    </Form>,
  );
  return { onChange };
}

describe('List — items rendering', () => {
  it('renders one row per array element showing the title field value', () => {
    renderList();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('renders nothing but Add button when array is empty', () => {
    render(
      <Form values={{ items: [] }} onChange={vi.fn()}>
        <List {...defaultProps}>
          <List.Item title="name" />
          <List.Form>
            <TextInput bind="name" label="Name" />
          </List.Form>
        </List>
      </Form>,
    );
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });

  it('renders a subtitle when List.Item has subtitle prop', () => {
    render(
      <Form values={{ items: [{ name: 'Alice', role: 'Admin' }] }} onChange={vi.fn()}>
        <List {...defaultProps}>
          <List.Item title="name" subtitle="role" />
          <List.Form>
            <TextInput bind="name" label="Name" />
          </List.Form>
        </List>
      </Form>,
    );
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('renders Add button when not disabled', () => {
    renderList();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });

  it('does not render Add button when disabled', () => {
    renderList({ disabled: true });
    expect(screen.queryByRole('button', { name: 'Add' })).not.toBeInTheDocument();
  });

  it('shows row delete buttons when List.Item has showDeleteButton', () => {
    render(
      <Form values={{ items: [{ name: 'Alice' }] }} onChange={vi.fn()}>
        <List {...defaultProps}>
          <List.Item title="name" showDeleteButton />
          <List.Form>
            <TextInput bind="name" label="Name" />
          </List.Form>
        </List>
      </Form>,
    );
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('does not show row delete buttons on disabled list', () => {
    render(
      <Form values={{ items: [{ name: 'Alice' }] }} onChange={vi.fn()}>
        <List {...defaultProps} disabled>
          <List.Item title="name" showDeleteButton />
          <List.Form>
            <TextInput bind="name" label="Name" />
          </List.Form>
        </List>
      </Form>,
    );
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });
});

describe('List — Edit flow', () => {
  it('opens modal pre-populated with item data when a row is clicked', async () => {
    renderList();
    await userEvent.click(screen.getByText('Alice'));
    await screen.findByRole('dialog');
    expect(screen.getByLabelText('Name')).toHaveValue('Alice');
  });

  it('updates item in parent store on Confirm', async () => {
    const { onChange } = renderList();
    await userEvent.click(screen.getByText('Alice'));
    await screen.findByRole('dialog');
    await userEvent.clear(screen.getByLabelText('Name'));
    await userEvent.type(screen.getByLabelText('Name'), 'Alicia');
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ items: [{ name: 'Alicia' }, { name: 'Bob' }] }),
        expect.anything(),
      );
    });
  });

  it('leaves parent store unchanged on Cancel', async () => {
    const { onChange } = renderList();
    onChange.mockClear();
    await userEvent.click(screen.getByText('Alice'));
    await screen.findByRole('dialog');
    await userEvent.clear(screen.getByLabelText('Name'));
    await userEvent.type(screen.getByLabelText('Name'), 'Alicia');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('List — Add flow', () => {
  it('opens an empty dialog when Add is clicked', async () => {
    renderList();
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    await screen.findByRole('dialog');
    expect(screen.getByLabelText('Name')).toHaveValue('');
  });

  it('appends item to parent store on Confirm', async () => {
    const { onChange } = renderList();
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    await screen.findByRole('dialog');
    await userEvent.type(screen.getByLabelText('Name'), 'Charlie');
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          items: [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Charlie' }],
        }),
        expect.anything(),
      );
    });
  });

  it('does NOT write to parent store while typing in the modal', async () => {
    const { onChange } = renderList();
    onChange.mockClear();
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    await screen.findByRole('dialog');
    await userEvent.type(screen.getByLabelText('Name'), 'Charlie');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('discards draft on Cancel', async () => {
    const { onChange } = renderList();
    onChange.mockClear();
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    await screen.findByRole('dialog');
    await userEvent.type(screen.getByLabelText('Name'), 'Charlie');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('List — Delete', () => {
  it('removes item when row delete button is clicked', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ items: [{ name: 'Alice' }, { name: 'Bob' }] }} onChange={onChange}>
        <List {...defaultProps}>
          <List.Item title="name" showDeleteButton />
          <List.Form showDeleteButton>
            <TextInput bind="name" label="Name" />
          </List.Form>
        </List>
      </Form>,
    );
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    const first = deleteButtons[0];
    if (first === undefined) throw new Error('Expected delete button');
    await userEvent.click(first);
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ items: [{ name: 'Bob' }] }),
      expect.anything(),
    );
  });

  it('shows modal Delete button when List.Form has showDeleteButton', async () => {
    render(
      <Form values={{ items: [{ name: 'Alice' }] }} onChange={vi.fn()}>
        <List {...defaultProps}>
          <List.Item title="name" />
          <List.Form showDeleteButton>
            <TextInput bind="name" label="Name" />
          </List.Form>
        </List>
      </Form>,
    );
    await userEvent.click(screen.getByText('Alice'));
    await screen.findByRole('dialog');
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('removes item via modal Delete and closes dialog', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ items: [{ name: 'Alice' }, { name: 'Bob' }] }} onChange={onChange}>
        <List {...defaultProps}>
          <List.Item title="name" />
          <List.Form showDeleteButton>
            <TextInput bind="name" label="Name" />
          </List.Form>
        </List>
      </Form>,
    );
    await userEvent.click(screen.getByText('Alice'));
    await screen.findByRole('dialog');
    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ items: [{ name: 'Bob' }] }),
      expect.anything(),
    );
  });
});

describe('List — key management', () => {
  it('handles external array shrinkage without corrupting keys', async () => {
    function Resetter() {
      const store = useFormStore();
      return (
        <button
          onClick={() => {
            store.setField('items', [{ name: 'Alice' }]);
          }}
        >
          Reset
        </button>
      );
    }

    render(
      <Form
        values={{ items: [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Charlie' }] }}
        onChange={vi.fn()}
      >
        <List bind="items" defaultItem={{ name: '' }}>
          <List.Item title="name" />
          <List.Form>
            <TextInput bind="name" label="Name" />
          </List.Form>
        </List>
        <Resetter />
      </Form>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
    expect(screen.queryByText('Charlie')).not.toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    await screen.findByRole('dialog');
    await userEvent.type(screen.getByLabelText('Name'), 'Dave');
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => {
      expect(screen.getByText('Dave')).toBeInTheDocument();
    });
  });
});
