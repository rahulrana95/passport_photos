import type { CSSProperties } from 'react';

/**
 * Gives the frame the photograph's own proportions.
 *
 * The frame has to be exactly the shape of the image for the canvas laid over
 * it to line up: the browser fits the photograph with object-fit, this module
 * fits the annotations with its own arithmetic, and the two agree only while
 * the box they are both fitting into has the same aspect ratio as the source.
 * Reserving the shape up front also means the page does not jump when the
 * photograph decodes.
 */
export const aspectStyle = (widthPx: number, heightPx: number): CSSProperties =>
  ({ '--overlay-aspect': `${widthPx} / ${heightPx}` }) as CSSProperties;
