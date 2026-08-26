/**
 * The eight EXIF orientation values, as stored in tag 0x0112.
 *
 * Transcribed from the specification, which is why they live in a constants
 * file: 1 through 8 are the domain of a field, not numbers used in a
 * calculation, and naming each one individually would say less than the
 * specification reference above.
 */
export const EXIF_ORIENTATIONS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

/** The only rotations any orientation requires. */
export const NO_ROTATION = 0;
export const QUARTER_TURN_DEGREES = 90;
export const HALF_TURN_DEGREES = 180;
export const THREE_QUARTER_TURN_DEGREES = 270;
