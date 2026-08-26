import type { MantineColorScheme } from '@mantine/core';
import { THEME_OPTIONS } from './ThemeToggle.constants';

export const isColorScheme = (value: string): value is MantineColorScheme =>
  THEME_OPTIONS.some((option) => option.value === value);

/**
 * Builds the change handler for the theme control.
 *
 * Mantine's SegmentedControl reports a plain string, so the value has to be
 * narrowed before it reaches setColorScheme. Extracting the handler keeps that
 * guard in a pure function that can be tested with an invalid value — which the
 * control itself can never produce.
 */
export const createColorSchemeHandler =
  (setColorScheme: (value: MantineColorScheme) => void) =>
  (next: string): void => {
    if (isColorScheme(next)) setColorScheme(next);
  };
