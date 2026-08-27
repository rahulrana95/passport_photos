/**
 * Where annotations sit within the crop, as proportions of it.
 *
 * Proportions rather than pixels, because the same overlay is drawn over a
 * 600-pixel scan and a 4000-pixel camera original, and a cap measured in
 * absolute pixels would be a thumbtack on one and invisible on the other.
 */

/**
 * How far in from the crop's left edge the crown-to-chin measure is drawn.
 *
 * Down the side rather than through the middle. A dimension line over the face
 * is a line over the thing being measured, and the first question anybody asks
 * of an annotated photo is whether the marks are covering something.
 */
export const HEAD_SPAN_INSET_RATIO = 0.12;

/** Width of the measure's end caps, as a share of the crop's width. */
export const HEAD_SPAN_CAP_RATIO = 0.08;

/** Halving a span. Named so the arithmetic reads as intent. */
export const HALF = 2;

/** A halo widens a stroke on both sides. Named so the arithmetic says why. */
export const BOTH_SIDES = 2;
