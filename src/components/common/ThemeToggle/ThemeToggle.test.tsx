import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe.utils';
import { ThemeToggle } from './ThemeToggle';
import { THEME_OPTIONS, THEME_TOGGLE_LABEL } from './ThemeToggle.constants';

const renderToggle = (props?: Parameters<typeof ThemeToggle>[0]): ReturnType<typeof render> =>
  render(
    <MantineProvider defaultColorScheme="auto">
      <ThemeToggle {...props} />
    </MantineProvider>,
  );

describe('ThemeToggle', () => {
  it('offers all three theme states, so system remains reachable', () => {
    renderToggle();

    for (const option of THEME_OPTIONS) {
      expect(screen.getByRole('radio', { name: option.label })).toBeInTheDocument();
    }
  });

  it('uses the default accessible name when none is given', () => {
    renderToggle();

    expect(screen.getByRole('radiogroup', { name: THEME_TOGGLE_LABEL })).toBeInTheDocument();
  });

  it('accepts a custom accessible name', () => {
    renderToggle({ label: 'Appearance' });

    expect(screen.getByRole('radiogroup', { name: 'Appearance' })).toBeInTheDocument();
  });

  it('applies the chosen scheme to the document', async () => {
    const user = userEvent.setup();
    renderToggle();

    await user.click(screen.getByRole('radio', { name: 'Dark' }));

    expect(document.documentElement).toHaveAttribute('data-mantine-color-scheme', 'dark');
  });

  it('is operable by keyboard alone', async () => {
    const user = userEvent.setup();
    renderToggle();

    // A radiogroup takes a single tab stop and lands on the checked option, so
    // asserting a specific label here would encode the wrong mental model.
    await user.tab();
    const group = screen.getByRole('radiogroup', { name: THEME_TOGGLE_LABEL });
    expect(group.contains(document.activeElement)).toBe(true);

    await user.keyboard('{ArrowRight}');
    expect(document.documentElement).toHaveAttribute('data-mantine-color-scheme');
  });

  it('has no accessibility violations', async () => {
    const { container } = renderToggle();

    await expectNoAxeViolations(container);
  });
});
