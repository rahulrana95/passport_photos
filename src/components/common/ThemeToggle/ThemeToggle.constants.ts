import type { ThemeOption } from './ThemeToggle.types';

/**
 * Three options, not two. "System" is the default state and must stay
 * reachable — a visitor who has explicitly chosen light or dark otherwise has
 * no way back to following their OS.
 */
export const THEME_OPTIONS: readonly ThemeOption[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'auto', label: 'System' },
];

export const THEME_TOGGLE_LABEL = 'Colour theme' as const;
