// packages/enforma/src/components/List.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Form } from './Form';
import { List } from './List';
import { Scope } from './Scope';
import { TextInput } from './component-wrap';
import { useFormStore } from '../context/FormContext';

describe('List', () => {
  it('renders one scoped item per array element', () => {
    render(
      <Form values={{ items: [{ name: 'Alice' }, { name: 'Bob' }] }} onChange={vi.fn()}>
        <List bind="items" defaultItem={{ name: '' }}>
          <TextInput bind="name" label="Name" />
        </List>
      </Form>,
    );
    const inputs = screen.getAllByLabelText('Name');
    expect(inputs).toHaveLength(2);
    expect(inputs[0]).toHaveValue('Alice');
    expect(inputs[1]).toHaveValue('Bob');
  });

  it('renders nothing when the array is empty', () => {
    render(
      <Form values={{ items: [] }} onChange={vi.fn()}>
        <List bind="items" defaultItem={{ name: '' }}>
          <TextInput bind="name" label="Name" />
        </List>
      </Form>,
    );
    expect(screen.queryAllByLabelText('Name')).toHaveLength(0);
  });

  it('scopes each item to its own index so edits do not bleed', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ items: [{ name: 'Alice' }, { name: 'Bob' }] }} onChange={onChange}>
        <List bind="items" defaultItem={{ name: '' }}>
          <TextInput bind="name" label="Name" />
        </List>
      </Form>,
    );
    const first: HTMLElement | undefined = screen.getAllByLabelText('Name')[0];
    if (first === undefined) throw new Error('Expected at least one Name input');
    await userEvent.clear(first);
    await userEvent.type(first, 'Charlie');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        items: [{ name: 'Charlie' }, { name: 'Bob' }],
      }),
      expect.anything(),
    );
  });

  it('appends a new item when the Add button is clicked', async () => {
    render(
      <Form values={{ items: [] }} onChange={vi.fn()}>
        <List bind="items" defaultItem={{ name: '' }}>
          <TextInput bind="name" label="Name" />
        </List>
      </Form>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getAllByLabelText('Name')).toHaveLength(1);
    expect(screen.getByLabelText('Name')).toHaveValue('');
  });

  it('removes the correct item when its Remove button is clicked', async () => {
    render(
      <Form values={{ items: [{ name: 'Alice' }, { name: 'Bob' }] }} onChange={vi.fn()}>
        <List bind="items" defaultItem={{ name: '' }}>
          <TextInput bind="name" label="Name" />
        </List>
      </Form>,
    );
    const firstRemove: HTMLElement | undefined = screen.getAllByRole('button', {
      name: 'Remove',
    })[0];
    if (firstRemove === undefined) throw new Error('Expected at least one Remove button');
    await userEvent.click(firstRemove);
    const inputs = screen.getAllByLabelText('Name');
    expect(inputs).toHaveLength(1);
    expect(inputs[0]).toHaveValue('Bob');
  });

  it('works nested inside a Scope', () => {
    render(
      <Form values={{ team: { members: [{ name: 'Alice' }] } }} onChange={vi.fn()}>
        <Scope path="team">
          <List bind="members" defaultItem={{ name: '' }}>
            <TextInput bind="name" label="Name" />
          </List>
        </Scope>
      </Form>,
    );
    expect(screen.getByLabelText('Name')).toHaveValue('Alice');
  });

  it('preserves focus when removing via keyboard', async () => {
    render(
      <Form values={{ items: [{ name: 'Alice' }, { name: 'Bob' }] }} onChange={vi.fn()}>
        <List bind="items" defaultItem={{ name: '' }}>
          <TextInput bind="name" label="Name" />
        </List>
      </Form>,
    );

    const inputs = screen.getAllByLabelText('Name');
    if (inputs[1] === undefined) throw new Error('Expected second input');
    inputs[1].focus();

    // Tab to Bob's Remove button (the second Remove) and press Enter
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');

    const remaining = screen.getAllByLabelText('Name');
    expect(remaining).toHaveLength(1);
    expect(document.activeElement).toBe(remaining[0]);
  });

  it('handles external array shrinkage without corrupting keys', async () => {
    // Resetter bypasses List's onClick to simulate an external store update
    // (e.g. a sibling component or future form-reset API shrinking the array).
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
          <TextInput bind="name" label="Name" />
        </List>
        <Resetter />
      </Form>,
    );

    // Externally shrink the array to 1 item via the store (bypasses List's onClick)
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getAllByLabelText('Name')).toHaveLength(1);

    // Add a new item — it should get a fresh key, not reuse a stale one
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    const inputs = screen.getAllByLabelText('Name');
    expect(inputs).toHaveLength(2);
    expect(inputs[0]).toHaveValue('Alice');
    expect(inputs[1]).toHaveValue('');
  });

  it('preserves focus when removing an item above the focused one', async () => {
    render(
      <Form values={{ items: [{ name: 'Alice' }, { name: 'Bob' }] }} onChange={vi.fn()}>
        <List bind="items" defaultItem={{ name: '' }}>
          <TextInput bind="name" label="Name" />
        </List>
      </Form>,
    );

    const inputs = screen.getAllByLabelText('Name');
    // Focus the second input (Bob)
    if (inputs[1] === undefined) throw new Error('Expected second input');
    inputs[1].focus();
    expect(document.activeElement).toBe(inputs[1]);

    // Remove the first item (Alice)
    const removeButtons = screen.getAllByRole('button', { name: 'Remove' });
    if (removeButtons[0] === undefined) throw new Error('Expected a Remove button');
    await userEvent.click(removeButtons[0]);

    // Only one input remains; it should still be focused
    const remaining = screen.getAllByLabelText('Name');
    expect(remaining).toHaveLength(1);
    expect(document.activeElement).toBe(remaining[0]);
  });
});
