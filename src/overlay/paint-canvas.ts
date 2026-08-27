import { clearOverlay, drawOverlay } from './draw-overlay';
import { backingStoreSize, fitTransform } from './overlay-transform.utils';
import type { OverlayDrawingContext } from './draw-overlay';
import type { OverlayInstruction } from './overlay-instruction.types';
import type { OverlaySize } from './overlay-transform.utils';

/**
 * A canvas element, reduced to what painting needs.
 *
 * The whole point of this file is that the component owns no drawing logic. A
 * React component that sizes a backing store, computes a transform and paints
 * is a component whose most breakable behaviour can only be tested in a
 * browser — and jsdom has no 2D context, so that behaviour would go untested
 * until somebody looked at a screenshot.
 */
export interface OverlayCanvas {
  width: number;
  height: number;
  getContext: (contextId: '2d') => OverlayDrawingContext | null;
}

/**
 * Sizes the canvas for the display it is on, then paints one frame.
 *
 * Returns false when there is nothing to paint — a container that has not been
 * laid out yet, or a browser that declined a 2D context. Both are ordinary
 * states rather than errors: the first resolves on the next frame, and the
 * second means the overlay simply does not appear over a photograph the reader
 * can still see.
 */
export const paintOverlayCanvas = (
  canvas: OverlayCanvas,
  instructions: readonly OverlayInstruction[],
  source: OverlaySize,
  container: OverlaySize,
  devicePixelRatio: number,
): boolean => {
  const transform = fitTransform(source, container);
  if (transform === undefined) return false;

  // Assigned every paint, not only when it changes. Writing width or height
  // resets the canvas — which is exactly what a redraw wants, and is why the
  // clear below is still needed for the case where neither changed.
  const backing = backingStoreSize(container, devicePixelRatio);
  canvas.width = backing.widthPx;
  canvas.height = backing.heightPx;

  const context = canvas.getContext('2d');
  if (context === null) return false;

  clearOverlay(context, container, devicePixelRatio);
  drawOverlay(context, instructions, transform, devicePixelRatio);

  return true;
};
