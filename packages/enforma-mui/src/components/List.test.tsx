// packages/enforma-mui/src/components/List.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Enforma, { Form, clearRegistry, registerComponents } from 'enforma';
import { TextInput } from './TextInput';
import { ListWrap } from './ListWrap';
import { ListItem } from './ListItem';
import { AddButton } from './AddButton';
import { FormModal } from './FormModal';

beforeEach(() => {
  clearRegistry();
  registerComponents({ TextInput, ListWrap, ListItem, AddButton, FormModal });
});

const defaultProps = {
  bind: 'items',
  defaultItem: { name: '' },
};

function renderList(
  listProps: Partial<typeof defaultProps & { disabled?: boolean }> = {},
  extraChildren?: React.ReactNode,
) {
  const onChange = vi.fn();
  render(
    <Form values={{ items: [{ name: 'Alice' }, { name: 'Bob' }] }} onChange={onChange}>
      <Enforma.List {...defaultProps} {...listProps}>
        <Enforma.List.Item title="name" />
        <Enforma.List.Form>
          <Enforma.TextInput bind="name" label="Name" />
        </Enforma.List.Form>
        {extraChildren}
      </Enforma.List>
    </Form>,
  );
  return { onChange };
}

describe('MUI List — rows', () => {
  it('renders one row per array item showing the title field value', () => {
    renderList();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('renders a subtitle when List.Item has subtitle prop', () => {
    const onChange = vi.fn();
    render(
      <Form values={{ items: [{ name: 'Alice', email: 'alice@example.com' }] }} onChange={onChange}>
        <Enforma.List {...defaultProps}>
          <Enforma.List.Item title="name" subtitle="email" />
          <Enforma.List.Form>
            <Enforma.TextInput bind="name" label="Name" />
          </Enforma.List.Form>
        </Enforma.List>
      </Form>,
    );
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
  });

  it('renders an Add button when not disabled', () => {
    renderList();
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
  });

  it('does not render an Add button when disabled', () => {
    renderList({ disabled: true });
    expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument();
  });
});

describe('MUI List — row delete button', () => {
  it('does not show delete buttons by default', () => {
    renderList();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('shows delete icon buttons when List.Item has showDeleteButton', () => {
    const onChange = vi.fn();
    render(
      <Form values={{ items: [{ name: 'Alice' }] }} onChange={onChange}>
        <Enforma.List {...defaultProps}>
          <Enforma.List.Item title="name" showDeleteButton />
          <Enforma.List.Form>
            <Enforma.TextInput bind="name" label="Name" />
          </Enforma.List.Form>
        </Enforma.List>
      </Form>,
    );
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('removes the item when the row delete button is clicked', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ items: [{ name: 'Alice' }, { name: 'Bob' }] }} onChange={onChange}>
        <Enforma.List {...defaultProps}>
          <Enforma.List.Item title="name" showDeleteButton />
          <Enforma.List.Form>
            <Enforma.TextInput bind="name" label="Name" />
          </Enforma.List.Form>
        </Enforma.List>
      </Form>,
    );
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    const firstDeleteButton = deleteButtons[0];
    if (firstDeleteButton === undefined) throw new Error('Expected at least one delete button');
    await userEvent.click(firstDeleteButton);
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ items: [{ name: 'Bob' }] }),
      expect.anything(),
    );
  });
});

describe('MUI List — Add flow', () => {
  it('opens a dialog when Add is clicked', async () => {
    renderList();
    await userEvent.click(screen.getByRole('button', { name: /add/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('dialog contains an empty form for the new item', async () => {
    renderList();
    await userEvent.click(screen.getByRole('button', { name: /add/i }));
    await screen.findByRole('dialog');
    expect(screen.getByLabelText('Name')).toHaveValue('');
  });

  it('appends item to parent store on Confirm', async () => {
    const { onChange } = renderList();
    await userEvent.click(screen.getByRole('button', { name: /add/i }));
    await screen.findByRole('dialog');
    await userEvent.type(screen.getByLabelText('Name'), 'Charlie');
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }));
    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          items: [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Charlie' }],
        }),
        expect.anything(),
      );
    });
  });

  it('closes dialog on Confirm', async () => {
    renderList();
    await userEvent.click(screen.getByRole('button', { name: /add/i }));
    await screen.findByRole('dialog');
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('does NOT write to parent store while typing in the modal', async () => {
    const { onChange } = renderList();
    onChange.mockClear();
    await userEvent.click(screen.getByRole('button', { name: /add/i }));
    await screen.findByRole('dialog');
    await userEvent.type(screen.getByLabelText('Name'), 'Charlie');
    // Draft form is isolated — parent onChange must not fire while typing
    expect(onChange).not.toHaveBeenCalled();
  });

  it('discards draft on Cancel — parent store unchanged', async () => {
    const { onChange } = renderList();
    onChange.mockClear();
    await userEvent.click(screen.getByRole('button', { name: /add/i }));
    await screen.findByRole('dialog');
    await userEvent.type(screen.getByLabelText('Name'), 'Charlie');
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('MUI List — Edit flow', () => {
  it('opens a dialog when a row is clicked', async () => {
    renderList();
    await userEvent.click(screen.getByText('Alice'));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('dialog pre-populates with the clicked item data', async () => {
    renderList();
    await userEvent.click(screen.getByText('Alice'));
    await screen.findByRole('dialog');
    expect(screen.getByLabelText('Name')).toHaveValue('Alice');
  });

  it('updates the item in parent store on Confirm', async () => {
    const { onChange } = renderList();
    await userEvent.click(screen.getByText('Alice'));
    await screen.findByRole('dialog');
    await userEvent.clear(screen.getByLabelText('Name'));
    await userEvent.type(screen.getByLabelText('Name'), 'Alicia');
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }));
    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          items: [{ name: 'Alicia' }, { name: 'Bob' }],
        }),
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
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('MUI List — modal delete', () => {
  it('does not show a Delete button in modal by default', async () => {
    renderList();
    await userEvent.click(screen.getByText('Alice'));
    await screen.findByRole('dialog');
    expect(screen.queryByRole('button', { name: /^delete$/i })).not.toBeInTheDocument();
  });

  it('shows Delete button in modal when List.Form has showDeleteButton', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ items: [{ name: 'Alice' }] }} onChange={onChange}>
        <Enforma.List {...defaultProps}>
          <Enforma.List.Item title="name" />
          <Enforma.List.Form showDeleteButton>
            <Enforma.TextInput bind="name" label="Name" />
          </Enforma.List.Form>
        </Enforma.List>
      </Form>,
    );
    await userEvent.click(screen.getByText('Alice'));
    await screen.findByRole('dialog');
    expect(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument();
  });

  it('removes item and closes modal when modal Delete is clicked', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ items: [{ name: 'Alice' }, { name: 'Bob' }] }} onChange={onChange}>
        <Enforma.List {...defaultProps}>
          <Enforma.List.Item title="name" />
          <Enforma.List.Form showDeleteButton>
            <Enforma.TextInput bind="name" label="Name" />
          </Enforma.List.Form>
        </Enforma.List>
      </Form>,
    );
    await userEvent.click(screen.getByText('Alice'));
    await screen.findByRole('dialog');
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ items: [{ name: 'Bob' }] }),
      expect.anything(),
    );
  });
});

describe('MUI List — disabled', () => {
  it('opens DISPLAY modal (not edit) when a row is clicked on disabled list', async () => {
    render(
      <Form values={{ items: [{ name: 'Alice' }] }} onChange={vi.fn()}>
        <Enforma.List {...defaultProps} disabled>
          <Enforma.List.Item title="name" />
          <Enforma.List.Form mode="UPDATE">
            <Enforma.TextInput bind="name" label="Name" />
          </Enforma.List.Form>
          <Enforma.List.Form mode="DISPLAY">
            <Enforma.TextInput bind="name" label="Name" disabled />
          </Enforma.List.Form>
        </Enforma.List>
      </Form>,
    );
    await userEvent.click(screen.getByText('Alice'));
    await screen.findByRole('dialog');
    // DISPLAY mode should show a Close button, not Confirm/Cancel
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /confirm/i })).not.toBeInTheDocument();
  });

  it('does not show row delete buttons on disabled list even with showDeleteButton', () => {
    render(
      <Form values={{ items: [{ name: 'Alice' }] }} onChange={vi.fn()}>
        <Enforma.List {...defaultProps} disabled>
          <Enforma.List.Item title="name" showDeleteButton />
          <Enforma.List.Form>
            <Enforma.TextInput bind="name" label="Name" />
          </Enforma.List.Form>
        </Enforma.List>
      </Form>,
    );
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });
});

describe('MUI List — mode fallback', () => {
  it('uses untyped List.Form as fallback when no mode-specific form exists', async () => {
    renderList(); // List.Form has no mode prop — used for both CREATE and UPDATE
    await userEvent.click(screen.getByText('Alice'));
    await screen.findByRole('dialog');
    expect(screen.getByLabelText('Name')).toHaveValue('Alice');
  });
});
