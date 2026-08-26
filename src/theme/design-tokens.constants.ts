/**
 * The registry of every design token the application may reference.
 *
 * This exists so that nothing has to hardcode a token name: the Storybook
 * gallery renders from it, and tokens.parity.test.ts asserts that every name
 * here is actually declared in the stylesheet — in all three theme states.
 *
 * Adding a token means adding it here AND in tokens.css. The parity test fails
 * if the two ever disagree.
 */

export const COLOR_TOKENS = [
  '--tk-ground',
  '--tk-surface',
  '--tk-sunken',
  '--tk-text-primary',
  '--tk-text-secondary',
  '--tk-text-tertiary',
  '--tk-border-default',
  '--tk-border-strong',
  '--tk-accent',
  '--tk-accent-soft',
  '--tk-accent-contrast',
  '--tk-status-pass',
  '--tk-status-warn',
  '--tk-status-fail',
  '--tk-status-manual',
] as const;

export const SPACE_TOKENS = [
  '--tk-optical-nudge',
  '--tk-space-3xs',
  '--tk-space-2xs',
  '--tk-space-xs',
  '--tk-space-sm',
  '--tk-space-md',
  '--tk-space-lg',
  '--tk-space-xl',
  '--tk-space-2xl',
] as const;

export const TEXT_TOKENS = [
  '--tk-text-xs',
  '--tk-text-sm',
  '--tk-text-md',
  '--tk-text-lg',
  '--tk-text-xl',
  '--tk-text-2xl',
  '--tk-text-3xl',
] as const;

export const RADIUS_TOKENS = ['--tk-radius-sm', '--tk-radius-md', '--tk-radius-lg'] as const;

export const SHADOW_TOKENS = ['--tk-shadow-sm', '--tk-shadow-md'] as const;

/**
 * Colour tokens whose value must differ between light and dark. A token that is
 * identical in both is almost always a mistake — it means one theme was
 * updated and the other was not.
 */
export const THEME_DEPENDENT_TOKENS = [
  '--tk-ground',
  '--tk-surface',
  '--tk-sunken',
  '--tk-text-primary',
  '--tk-text-secondary',
  '--tk-text-tertiary',
  '--tk-border-default',
  '--tk-border-strong',
  '--tk-accent',
  '--tk-accent-soft',
  '--tk-accent-contrast',
  '--tk-status-pass',
  '--tk-status-warn',
  '--tk-status-fail',
  '--tk-status-manual',
] as const;

export type ColorToken = (typeof COLOR_TOKENS)[number];
export type SpaceToken = (typeof SPACE_TOKENS)[number];
export type TextToken = (typeof TEXT_TOKENS)[number];
export type RadiusToken = (typeof RADIUS_TOKENS)[number];
export type ShadowToken = (typeof SHADOW_TOKENS)[number];

export interface TokenGroup {
  readonly heading: string;
  readonly tokens: readonly string[];
}

export const TOKEN_GROUPS: readonly TokenGroup[] = [
  { heading: 'Colour', tokens: COLOR_TOKENS },
  { heading: 'Spacing', tokens: SPACE_TOKENS },
  { heading: 'Type scale', tokens: TEXT_TOKENS },
  { heading: 'Radius', tokens: RADIUS_TOKENS },
  { heading: 'Shadow', tokens: SHADOW_TOKENS },
];
