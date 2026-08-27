/**
 * Encoder settings.
 *
 * The quality range is mozjpeg's own 1..100 scale. The bounds are not the
 * scale's extremes: below 40 a face acquires visible blocking around the eyes
 * and mouth, which is a rejection reason of its own, so a file that can only
 * be made small enough by going lower is a file we should be telling the
 * reader about rather than quietly shipping.
 */
export const MIN_JPEG_QUALITY = 40;
export const MAX_JPEG_QUALITY = 95;

/**
 * Used when a specification sets no byte ceiling at all.
 *
 * High enough that the compression is invisible at print size, low enough that
 * a 600x600 photograph lands around 100KB rather than 400KB — nobody's upload
 * form is helped by the difference.
 */
export const DEFAULT_JPEG_QUALITY = 88;

/** Both edges of a box filter contribute; a span needs both its ends. */
export const SPAN_ENDS = 2;
