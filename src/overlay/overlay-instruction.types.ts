import type { OverlayRole } from './overlay-role.constants';

/**
 * WHAT TO DRAW, SEPARATED FROM HOW TO DRAW IT.
 *
 * Every instruction is expressed in SOURCE IMAGE PIXELS — the same coordinate
 * space the geometry engine measured in — and never in canvas pixels. That one
 * decision buys most of this module's edge cases at once:
 *
 *   - a resize is a new transform applied to the same instructions, so the
 *     overlay redraws without re-running an analysis that took seconds;
 *   - portrait and landscape sources need no special case, because fitting is
 *     the transform's job and the instructions never knew the shape;
 *   - a retina display is the same drawing at a different device pixel ratio;
 *   - and the builder is a pure function over numbers, so every annotation can
 *     be asserted exactly without a canvas anywhere near the test.
 */

export interface OverlayRect {
  readonly kind: 'rect';
  readonly role: OverlayRole;
  readonly x: number;
  readonly y: number;
  readonly widthPx: number;
  readonly heightPx: number;
}

/** A translucent fill. Always accompanied by lines — see buildOverlay. */
export interface OverlayShade {
  readonly kind: 'shade';
  readonly role: OverlayRole;
  readonly x: number;
  readonly y: number;
  readonly widthPx: number;
  readonly heightPx: number;
}

export interface OverlayLine {
  readonly kind: 'line';
  readonly role: OverlayRole;
  readonly fromX: number;
  readonly fromY: number;
  readonly toX: number;
  readonly toY: number;
}

/**
 * A measured extent with a cap at each end, like a dimension on a drawing.
 *
 * Vertical only, because the two things worth showing this way — crown to chin,
 * and the eye line above the bottom edge — are both vertical, and a general
 * two-axis version would be a case with no caller.
 */
export interface OverlaySpan {
  readonly kind: 'span';
  readonly role: OverlayRole;
  readonly x: number;
  readonly fromY: number;
  readonly toY: number;
  /** Total width of the end caps, in source pixels. */
  readonly capWidthPx: number;
}

export type OverlayInstruction = OverlayRect | OverlayShade | OverlayLine | OverlaySpan;
