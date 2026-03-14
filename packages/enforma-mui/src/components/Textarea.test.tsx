import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Enforma, { Form, registerComponents, clearRegistry } from 'enforma';
import { Textarea } from './Textarea';
import { Fieldset } from './Fieldset';
import { MuiFormWrap } from './MuiFormWrap';

beforeEach(() => {
  clearRegistry();
  registerComponents({ Textarea, Fieldset });
});

describe('MUI Textarea', () => {
  it('renders a textarea accessible by label text', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.Textarea bind="bio" label="Bio" />
      </Form>,
    );
    expect(screen.getByLabelText('Bio')).toBeInTheDocument();
  });

  it('textarea has correct value from form state', () => {
    render(
      <Form values={{ bio: 'Hello world' }} onChange={() => undefined}>
        <Enforma.Textarea bind="bio" label="Bio" />
      </Form>,
    );
    expect(screen.getByLabelText('Bio')).toHaveValue('Hello world');
  });

  it('calls onChange with updated value when user types', async () => {
    const onChange = vi.fn();
    render(
      <Form values={{ bio: '' }} onChange={onChange}>
        <Enforma.Textarea bind="bio" label="Bio" />
      </Form>,
    );
    await userEvent.type(screen.getByLabelText('Bio'), 'Hello');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ bio: 'Hello' }),
      expect.anything(),
    );
  });

  it('shows error message after blur when validate fails', async () => {
    render(
      <Form values={{ bio: '' }} onChange={() => undefined}>
        <Enforma.Textarea
          bind="bio"
          label="Bio"
          validate={(v) => (!v ? 'Bio is required' : null)}
        />
      </Form>,
    );
    await userEvent.click(screen.getByLabelText('Bio'));
    await userEvent.tab();
    expect(await screen.findByText('Bio is required')).toBeInTheDocument();
  });

  it('does not show error before blur', () => {
    render(
      <Form values={{ bio: '' }} onChange={() => undefined}>
        <Enforma.Textarea
          bind="bio"
          label="Bio"
          validate={(v) => (!v ? 'Bio is required' : null)}
        />
      </Form>,
    );
    expect(screen.queryByText('Bio is required')).not.toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.Textarea bind="bio" label="Bio" disabled />
      </Form>,
    );
    expect(screen.getByLabelText('Bio')).toBeDisabled();
  });
});

describe('MUI Textarea variants', () => {
  it('classic: renders a textarea accessible by label text', () => {
    clearRegistry();
    registerComponents({ Textarea, Fieldset, FormWrap: MuiFormWrap }, { variant: 'classic' });
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.Textarea bind="bio" label="Bio" />
      </Form>,
    );
    expect(screen.getByLabelText('Bio')).toBeInTheDocument();
  });

  it('classic: textarea has correct value from form state', () => {
    clearRegistry();
    registerComponents({ Textarea, Fieldset, FormWrap: MuiFormWrap }, { variant: 'classic' });
    render(
      <Form values={{ bio: 'test' }} onChange={() => undefined}>
        <Enforma.Textarea bind="bio" label="Bio" />
      </Form>,
    );
    expect(screen.getByLabelText('Bio')).toHaveValue('test');
  });

  it('outlined (default): renders a textarea accessible by label text', () => {
    render(
      <Form values={{}} onChange={() => undefined}>
        <Enforma.Textarea bind="bio" label="Bio" />
      </Form>,
    );
    expect(screen.getByLabelText('Bio')).toBeInTheDocument();
  });
});
