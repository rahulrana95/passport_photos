/**
 * Physical measurement constants.
 *
 * Every exported number carries its unit in the name. A value called `headMin`
 * is ambiguous once it crosses a function boundary; `HEAD_HEIGHT_MIN_MM` is not.
 * measurement.constants.test.ts enforces that convention.
 */

export const MM_PER_INCH = 25.4;

/**
 * Dimensionless factors. These carry no unit, so by convention they end in
 * _RADIX, _SCALE or _FACTOR rather than a unit suffix — the naming test treats
 * those endings as an explicit declaration of dimensionlessness.
 */
export const DECIMAL_RADIX = 10;
export const PERCENT_SCALE = 100;

export const POINTS_PER_INCH = 72;

/** Print resolution assumed when a specification does not state one. */
export const DEFAULT_PRINT_DPI = 300;

/** Screen resolution assumed for on-screen preview rendering. */
export const PREVIEW_DPI = 96;

/**
 * Measurements are rounded once, at the boundary, to this many decimal places.
 * Rounding repeatedly at each step is how a passing measurement drifts into a
 * failing one.
 */
export const MEASUREMENT_PRECISION_DIGITS = 2;

/**
 * Slack applied when comparing a measurement against a specification band.
 * Absorbs sub-pixel landmark jitter without letting a genuinely wrong photo
 * through — deliberately far tighter than any published tolerance.
 */
export const BAND_TOLERANCE_MM = 0.2;

/**
 * How closely two shapes must match in proportion to count as the same aspect
 * ratio. One percent absorbs the rounding in a millimetre-to-pixel conversion
 * without admitting a genuinely different shape.
 */
export const ASPECT_RATIO_TOLERANCE_RATIO = 0.01;

/**
 * A midpoint is the mean of two edges. Dimensionless, so it declares itself
 * with a _COUNT suffix rather than claiming a unit it does not have.
 */
export const BAND_EDGE_COUNT = 2;

/** Largest head rotation still considered "facing the camera". */
export const MAX_HEAD_ROLL_DEGREES = 5;
export const MAX_HEAD_YAW_DEGREES = 5;
export const MAX_HEAD_PITCH_DEGREES = 5;
