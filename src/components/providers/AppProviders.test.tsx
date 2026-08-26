import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppProviders } from './AppProviders';

describe('AppProviders', () => {
  it('renders its children inside the Mantine provider', () => {
    render(
      <AppProviders>
        <p>tool goes here</p>
      </AppProviders>,
    );

    expect(screen.getByText('tool goes here')).toBeInTheDocument();
  });

  it('stamps a colour scheme on the document so tokens resolve', () => {
    render(
      <AppProviders>
        <span>content</span>
      </AppProviders>,
    );

    expect(document.documentElement).toHaveAttribute('data-mantine-color-scheme');
  });
});
