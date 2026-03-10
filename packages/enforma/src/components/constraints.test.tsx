import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Form } from './Form';
import { TextInput, Checkbox, NumberInput } from './fields';
import { List } from './List';
import { ListItemSlot } from './ListItemSlot';
import { ListFormSlot } from './ListFormSlot';
import { registerComponents } from './registry';
import type {
  ResolvedTextInputProps,
  ResolvedCheckboxProps,
  ResolvedNumberInputProps,
  ResolvedListProps,
  ResolvedListItemProps,
  ResolvedAddButtonProps,
  ResolvedFormModalProps,
} from './types';

// Minimal adapter that renders the error and exposes required via aria
function StubTextInput({
  value,
  setValue,
  label,
  error,
  showError,
  onBlur,
  required,
}: ResolvedTextInputProps) {
  return (
    <div>
      <label htmlFor="f">{label}</label>
      <input
        id="f"
        aria-label={label ?? ''}
        aria-required={required}
        value={value ?? ''}
        onChange={(e) => {
          setValue(e.target.value);
        }}
        onBlur={onBlur}
      />
      {showError && <span role="alert">{error}</span>}
    </div>
  );
}

function StubCheckbox({
  value,
  setValue,
  label,
  error,
  showError,
  onBlur,
  required,
}: ResolvedCheckboxProps) {
  return (
    <div>
      <input
        type="checkbox"
        aria-label={label ?? ''}
        aria-required={required}
        checked={value ?? false}
        onChange={(e) => {
          setValue(e.target.checked);
        }}
        onBlur={onBlur}
      />
      {showError && <span role="alert">{error}</span>}
    </div>
  );
}

beforeEach(() => {
  registerComponents({ TextInput: StubTextInput, Checkbox: StubCheckbox });
});

describe('required on TextInput', () => {
  it('blocks submit and shows default message when value is empty string', async () => {
    const onSubmit = vi.fn();
    render(
      <Form values={{ name: '' }} onChange={vi.fn()} onSubmit={onSubmit}>
        <TextInput bind="name" label="Name" required />
        <button type="submit">Submit</button>
      </Form>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('This field is required');
  });

  it('blocks submit when value is undefined', async () => {
    const onSubmit = vi.fn();
    render(
      <Form values={{}} onChange={vi.fn()} onSubmit={onSubmit}>
        <TextInput bind="name" label="Name" required />
        <button type="submit">Submit</button>
      </Form>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not show error when value is provided', () => {
    render(
      <Form values={{ name: 'Alice' }} onChange={vi.fn()} showErrors>
        <TextInput bind="name" label="Name" required />
      </Form>,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('passes required to the adapter', () => {
    render(
      <Form values={{}} onChange={vi.fn()}>
        <TextInput bind="name" label="Name" required />
      </Form>,
    );
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAttribute('aria-required', 'true');
  });

  it('message is customizable via messages prop', () => {
    render(
      <Form values={{ name: '' }} onChange={vi.fn()} showErrors>
        <TextInput
          bind="name"
          label="Name"
          required
          messages={{ required: 'Name cannot be empty' }}
        />
      </Form>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Name cannot be empty');
  });

  it('message is customizable via Form-level messages', () => {
    render(
      <Form
        values={{ name: '' }}
        onChange={vi.fn()}
        showErrors
        messages={{ required: 'Global required message' }}
      >
        <TextInput bind="name" label="Name" required />
      </Form>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Global required message');
  });

  it('field-level messages override Form-level messages', () => {
    render(
      <Form values={{ name: '' }} onChange={vi.fn()} showErrors messages={{ required: 'Global' }}>
        <TextInput bind="name" label="Name" required messages={{ required: 'Local' }} />
      </Form>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Local');
  });
});

describe('required on Checkbox', () => {
  it('shows error when value is false', () => {
    render(
      <Form values={{ accepted: false }} onChange={vi.fn()} showErrors>
        <Checkbox bind="accepted" label="Accept" required />
      </Form>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('This field is required');
  });

  it('shows error when value is undefined', () => {
    render(
      <Form values={{}} onChange={vi.fn()} showErrors>
        <Checkbox bind="accepted" label="Accept" required />
      </Form>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('This field is required');
  });

  it('does not show error when value is true', () => {
    render(
      <Form values={{ accepted: true }} onChange={vi.fn()} showErrors>
        <Checkbox bind="accepted" label="Accept" required />
      </Form>,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('required on NumberInput', () => {
  beforeEach(() => {
    registerComponents({
      NumberInput: ({ error, showError, onBlur }: ResolvedNumberInputProps) => (
        <div>
          <button aria-label="field" onBlur={onBlur} />
          {showError && <span role="alert">{error}</span>}
        </div>
      ),
    });
  });

  it('shows error when value is undefined', () => {
    render(
      <Form values={{}} onChange={vi.fn()} showErrors>
        <NumberInput bind="qty" required />
      </Form>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('This field is required');
  });

  it('does not show error when value is 0', () => {
    render(
      <Form values={{ qty: 0 }} onChange={vi.fn()} showErrors>
        <NumberInput bind="qty" required />
      </Form>,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('minLength / maxLength on TextInput', () => {
  it('shows tooShort when value is shorter than minLength', () => {
    render(
      <Form values={{ code: 'ab' }} onChange={vi.fn()} showErrors>
        <TextInput bind="code" label="Code" minLength={3} />
      </Form>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Must be at least 3 characters');
  });

  it('does not show tooShort when value meets minLength', () => {
    render(
      <Form values={{ code: 'abc' }} onChange={vi.fn()} showErrors>
        <TextInput bind="code" label="Code" minLength={3} />
      </Form>,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not show tooShort when value is undefined', () => {
    render(
      <Form values={{}} onChange={vi.fn()} showErrors>
        <TextInput bind="code" label="Code" minLength={3} />
      </Form>,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows tooLong when value exceeds maxLength', () => {
    render(
      <Form values={{ name: 'HelloWorld' }} onChange={vi.fn()} showErrors>
        <TextInput bind="name" label="Name" maxLength={5} />
      </Form>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Must be 5 characters or fewer');
  });

  it('does not show tooLong when value is within maxLength', () => {
    render(
      <Form values={{ name: 'Hello' }} onChange={vi.fn()} showErrors>
        <TextInput bind="name" label="Name" maxLength={5} />
      </Form>,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('minLength message is customizable', () => {
    render(
      <Form values={{ code: 'a' }} onChange={vi.fn()} showErrors>
        <TextInput bind="code" label="Code" minLength={3} messages={{ tooShort: 'Too short!' }} />
      </Form>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Too short!');
  });

  it('maxLength message is customizable', () => {
    render(
      <Form values={{ name: 'TooLongName' }} onChange={vi.fn()} showErrors>
        <TextInput bind="name" label="Name" maxLength={5} messages={{ tooLong: 'Too long!' }} />
      </Form>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Too long!');
  });

  it('passes minLength and maxLength to the adapter', () => {
    const received: { minLength?: number; maxLength?: number }[] = [];
    registerComponents({
      TextInput: (props: ResolvedTextInputProps) => {
        received.push({
          ...(props.minLength !== undefined ? { minLength: props.minLength } : {}),
          ...(props.maxLength !== undefined ? { maxLength: props.maxLength } : {}),
        });
        return <input aria-label={props.label ?? ''} />;
      },
    });
    render(
      <Form values={{}} onChange={vi.fn()}>
        <TextInput bind="code" label="Code" minLength={3} maxLength={10} />
      </Form>,
    );
    expect(received[0]).toEqual({ minLength: 3, maxLength: 10 });
  });

  it('required and minLength together: required fires first on empty string', () => {
    render(
      <Form values={{ code: '' }} onChange={vi.fn()} showErrors>
        <TextInput bind="code" label="Code" required minLength={3} />
      </Form>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('This field is required');
  });
});

function StubList({ items, addButton, error, showError }: ResolvedListProps) {
  return (
    <div>
      <div data-testid="list-rows">{items}</div>
      {addButton}
      {showError && <span role="alert">{error}</span>}
    </div>
  );
}

function StubListItem({ title }: ResolvedListItemProps) {
  return <div>{title}</div>;
}

function StubAddButton({ onClick, disabled }: ResolvedAddButtonProps) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}>
      Add
    </button>
  );
}

function StubFormModal({ open, children, onConfirm, onCancel }: ResolvedFormModalProps) {
  if (!open) return null;
  return (
    <div>
      {children}
      <button onClick={onConfirm}>Confirm</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  );
}

describe('List constraints', () => {
  beforeEach(() => {
    registerComponents({
      List: StubList,
      ListItem: StubListItem,
      AddButton: StubAddButton,
      FormModal: StubFormModal,
    });
  });

  it('required blocks submit when list is empty', async () => {
    const onSubmit = vi.fn();
    render(
      <Form values={{ items: [] }} onChange={vi.fn()} onSubmit={onSubmit}>
        <List bind="items" defaultItem={{ name: '' }} required>
          <ListItemSlot title="name" />
          <ListFormSlot>
            <TextInput bind="name" label="Name" />
          </ListFormSlot>
        </List>
        <button type="submit">Submit</button>
      </Form>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('This field is required');
  });

  it('required does not show error when list has items', async () => {
    const onSubmit = vi.fn();
    render(
      <Form values={{ items: [{ name: 'Alice' }] }} onChange={vi.fn()} onSubmit={onSubmit}>
        <List bind="items" defaultItem={{ name: '' }} required>
          <ListItemSlot title="name" />
          <ListFormSlot>
            <TextInput bind="name" label="Name" />
          </ListFormSlot>
        </List>
        <button type="submit">Submit</button>
      </Form>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onSubmit).toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('minItems shows error when below minimum', () => {
    render(
      <Form values={{ items: [] }} onChange={vi.fn()} showErrors>
        <List bind="items" defaultItem={{ name: '' }} minItems={2}>
          <ListItemSlot title="name" />
          <ListFormSlot>
            <TextInput bind="name" label="Name" />
          </ListFormSlot>
        </List>
      </Form>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Must have at least 2 item(s)');
  });

  it('maxItems shows error when above maximum', () => {
    render(
      <Form
        values={{ items: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] }}
        onChange={vi.fn()}
        showErrors
      >
        <List bind="items" defaultItem={{ name: '' }} maxItems={2}>
          <ListItemSlot title="name" />
          <ListFormSlot>
            <TextInput bind="name" label="Name" />
          </ListFormSlot>
        </List>
      </Form>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Must have 2 item(s) or fewer');
  });

  it('minItems message is customizable via Form messages', () => {
    render(
      <Form
        values={{ items: [] }}
        onChange={vi.fn()}
        showErrors
        messages={{ tooFewItems: 'Add more!' }}
      >
        <List bind="items" defaultItem={{ name: '' }} minItems={1}>
          <ListItemSlot title="name" />
          <ListFormSlot>
            <TextInput bind="name" label="Name" />
          </ListFormSlot>
        </List>
      </Form>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Add more!');
  });
});
