/**
 * How wide the face box is, in inter-ocular distances.
 *
 * Roughly two and a half: an adult face is about that many eye-separations
 * across at the cheekbones. Generous rather than tight, because this selects
 * pixels to average over and clipping the cheeks off a wide face biases the
 * exposure reading toward whatever is behind them.
 */
export const FACE_BOX_WIDTHS = 2.5;

/**
 * How far above the eye line the box reaches, in inter-ocular distances.
 *
 * Stops short of the hairline on purpose. Hair is not skin, and on dark hair
 * it drags a face-exposure average down far enough to read as underexposed —
 * which is the failure mode a band on face luminance was removed to avoid.
 */
export const FACE_BOX_ABOVE_EYES = 0.6;
