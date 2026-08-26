'use client';

import { SegmentedControl, useMantineColorScheme } from '@mantine/core';
import { THEME_OPTIONS, THEME_TOGGLE_LABEL } from './ThemeToggle.constants';
import { createColorSchemeHandler } from './ThemeToggle.utils';
import type { ThemeToggleProps } from './ThemeToggle.types';

/**
 * Theme switcher. Client-only by necessity — it reads and writes the stored
 * preference — so it is kept as a small leaf rather than pulling any page
 * content into the client bundle.
 */
export const ThemeToggle = ({
  label = THEME_TOGGLE_LABEL,
}: ThemeToggleProps): React.JSX.Element => {
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  return (
    <SegmentedControl
      value={colorScheme}
      onChange={createColorSchemeHandler(setColorScheme)}
      data={THEME_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
      aria-label={label}
      size="xs"
    />
  );
};
