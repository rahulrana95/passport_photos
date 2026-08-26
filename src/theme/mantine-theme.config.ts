import {
  Button,
  createTheme,
  Tooltip,
  type CSSVariablesResolver,
  type MantineThemeOverride,
} from '@mantine/core';

/**
 * Mantine is configured to read the project's own tokens rather than carrying a
 * second, competing palette. tokens.css stays the single source of truth; this
 * file only maps it onto the variable names Mantine expects.
 */
export const appTheme: MantineThemeOverride = createTheme({
  fontFamily: 'var(--tk-font-body)',
  fontFamilyMonospace: 'var(--tk-font-mono)',
  defaultRadius: 'md',
  primaryColor: 'brand',
  colors: {
    // Mantine requires exactly ten shades. The interactive states we actually
    // use are wired through cssVariablesResolver below, so these exist to
    // satisfy the contract rather than to be referenced directly.
    brand: [
      '#e6f2f0', '#c8e2dd', '#a5d0c8', '#7dbcb1', '#57a89b',
      '#0e6e62', '#0c6258', '#0a544c', '#08453f', '#063731',
    ],
  },
  radius: {
    xs: 'var(--tk-radius-sm)',
    sm: 'var(--tk-radius-sm)',
    md: 'var(--tk-radius-md)',
    lg: 'var(--tk-radius-lg)',
    xl: 'var(--tk-radius-lg)',
  },
  spacing: {
    xs: 'var(--tk-space-2xs)',
    sm: 'var(--tk-space-xs)',
    md: 'var(--tk-space-sm)',
    lg: 'var(--tk-space-md)',
    xl: 'var(--tk-space-lg)',
  },
  components: {
    // Defaults live here so no call site repeats the same props, and so a
    // change to how every button looks is one diff rather than a grep.
    Button: Button.extend({
      defaultProps: { radius: 'md', variant: 'filled' },
    }),
    Tooltip: Tooltip.extend({
      defaultProps: {
        withArrow: true,
        // Touch devices have no hover. Without an explicit open delay of zero
        // and tap support, a tooltip is simply unreachable on a phone — and
        // most of this product's traffic will be on one.
        openDelay: 0,
        events: { hover: true, focus: true, touch: true },
      },
    }),
  },
});

export const appCssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {
    '--mantine-primary-color-filled': 'var(--tk-accent)',
    '--mantine-primary-color-contrast': 'var(--tk-accent-contrast)',
  },
  light: {
    '--mantine-color-body': 'var(--tk-ground)',
    '--mantine-color-text': 'var(--tk-text-primary)',
    '--mantine-color-dimmed': 'var(--tk-text-secondary)',
    '--mantine-color-default-border': 'var(--tk-border-default)',
  },
  dark: {
    '--mantine-color-body': 'var(--tk-ground)',
    '--mantine-color-text': 'var(--tk-text-primary)',
    '--mantine-color-dimmed': 'var(--tk-text-secondary)',
    '--mantine-color-default-border': 'var(--tk-border-default)',
  },
});
