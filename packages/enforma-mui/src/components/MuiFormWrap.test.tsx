import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme, useTheme } from '@mui/material/styles';
import { registerComponents, clearRegistry } from 'enforma';
import { MuiFormWrap } from './MuiFormWrap';
import { MuiVariantContext } from '../context/MuiVariantContext';

vi.mock('@mui/x-date-pickers', () => ({
  LocalizationProvider: ({
    children,
    dateAdapter,
  }: {
    children: React.ReactNode;
    dateAdapter: { name?: string };
  }) => (
    <div data-testid="localization-provider" data-adapter={dateAdapter.name ?? 'unknown'}>
      {children}
    </div>
  ),
}));

vi.mock('@mui/x-date-pickers/AdapterDayjs', () => ({
  // eslint-disable-next-line @typescript-eslint/no-extraneous-class
  AdapterDayjs: class AdapterDayjs {},
}));

beforeEach(() => {
  clearRegistry();
});

describe('MuiFormWrap', () => {
  it('provides "outlined" variant context by default', () => {
    let captured: string | undefined;
    function Consumer() {
      captured = React.useContext(MuiVariantContext);
      return null;
    }
    registerComponents({});
    render(
      <MuiFormWrap>
        <Consumer />
      </MuiFormWrap>,
    );
    expect(captured).toBe('outlined');
  });

  it('provides the variant from registerComponents options', () => {
    let captured: string | undefined;
    function Consumer() {
      captured = React.useContext(MuiVariantContext);
      return null;
    }
    registerComponents({}, { variant: 'classic' });
    render(
      <MuiFormWrap>
        <Consumer />
      </MuiFormWrap>,
    );
    expect(captured).toBe('classic');
  });

  it('does not render LocalizationProvider when no dateAdapter is set', () => {
    registerComponents({}, { variant: 'outlined' });
    render(
      <MuiFormWrap>
        <span>child</span>
      </MuiFormWrap>,
    );
    expect(screen.queryByTestId('localization-provider')).not.toBeInTheDocument();
  });

  it('applies dark palette when colorScheme is "dark"', () => {
    registerComponents({}, { variant: 'outlined', colorScheme: 'dark' });
    let capturedMode: string | undefined;
    function Consumer() {
      capturedMode = useTheme().palette.mode;
      return null;
    }
    render(
      <MuiFormWrap>
        <Consumer />
      </MuiFormWrap>,
    );
    expect(capturedMode).toBe('dark');
  });

  it('does not override an outer ThemeProvider when colorScheme is not set', () => {
    registerComponents({}, { variant: 'outlined' });
    let capturedMode: string | undefined;
    function Consumer() {
      capturedMode = useTheme().palette.mode;
      return null;
    }
    render(
      <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
        <MuiFormWrap>
          <Consumer />
        </MuiFormWrap>
      </ThemeProvider>,
    );
    expect(capturedMode).toBe('dark');
  });

  it('renders LocalizationProvider with correct adapter when dateAdapter is set', async () => {
    registerComponents({}, { variant: 'outlined', dateAdapter: 'dayjs' });
    render(
      <MuiFormWrap>
        <span>child</span>
      </MuiFormWrap>,
    );
    expect(await screen.findByTestId('localization-provider')).toBeInTheDocument();
    expect(screen.getByTestId('localization-provider')).toHaveAttribute(
      'data-adapter',
      'AdapterDayjs',
    );
  });
});
