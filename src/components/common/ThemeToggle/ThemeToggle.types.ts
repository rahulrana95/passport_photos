import type { MantineColorScheme } from '@mantine/core';

export interface ThemeOption {
  readonly value: MantineColorScheme;
  readonly label: string;
}

export interface ThemeToggleProps {
  /** Accessible name for the control group. */
  readonly label?: string;
}
