import type { CSSProperties } from 'react';

/**
 * Passes an overlay colour into CSS as a custom property.
 *
 * The colour cannot come from a design token: it has to match the line drawn on
 * the photograph, and those are fixed rather than themed — see
 * overlay-role.constants.ts. Handing it to CSS as a variable keeps the actual
 * styling in the stylesheet where the rest of it lives, rather than growing an
 * inline style rule for the swatch.
 *
 * The cast is React's type for style objects not admitting custom properties,
 * which they have accepted at runtime for years.
 */
export const swatchStyle = (colour: string): CSSProperties =>
  ({ '--overlay-swatch-colour': colour }) as CSSProperties;
