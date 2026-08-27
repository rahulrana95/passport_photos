/**
 * How the guide is drawn over the camera feed.
 *
 * COLOURS ARE LITERAL HERE, for the same reason they are literal in
 * src/overlay/overlay-role.constants.ts: these sit on the live picture, which
 * has no theme. An oval drawn over somebody's face must look the same whether
 * the page around it is light or dark, and a token would invert the guide
 * while the camera feed underneath it did not.
 *
 * They are also drawn against an unknown background — a bright window, a dark
 * hallway — so the guide is a light stroke over a darkened surround rather
 * than a bare outline. The scrim is doing the contrast work; the stroke only
 * has to be visible against the scrim.
 */
export const GUIDE_SCRIM_COLOUR = 'rgba(0, 0, 0, 0.55)';
export const GUIDE_STROKE_COLOUR = '#ffffff';
export const GUIDE_STROKE_READY_COLOUR = '#3ddc84';

/** Stroke width of the oval, in the overlay's own viewBox units. */
export const GUIDE_STROKE_WIDTH = 0.6;

/**
 * The oval's size, as a share of the shorter and longer frame edges.
 *
 * A TARGET, not a measurement. It is deliberately not derived from the
 * specification: the reader is being asked to put their head somewhere, and
 * an oval that resized itself as they moved would be a target that runs away.
 * The exact judgement is the guidance engine's, which is measured, and this is
 * the thing to aim at while it decides.
 */
export const GUIDE_OVAL_WIDTH_RATIO = 0.46;
export const GUIDE_OVAL_HEIGHT_RATIO = 0.68;

/** The overlay's coordinate space. Square, so ratios read directly as percent. */
export const GUIDE_VIEWBOX = 100;
