/**
 * Detection thresholds.
 *
 * Every value here is a judgement call that will be re-tuned against the
 * ground-truth fixture set built in PR #13. They live in one file so that
 * tuning is a single reviewable diff rather than a hunt through the codebase.
 */

/** Below this, the landmark result is not trustworthy enough to measure from. */
export const MIN_FACE_DETECTION_CONFIDENCE_RATIO = 0.5;

/** Below this, a crown estimate degrades to manual-check rather than a verdict. */
export const MIN_CROWN_CONFIDENCE_RATIO = 0.6;

/** Face must occupy at least this share of the frame to be measurable at all. */
export const MIN_FACE_FRAME_COVERAGE_RATIO = 0.05;

/** MediaPipe blendshape scores run 0–1. Above this, an eye counts as closed. */
export const EYE_CLOSED_BLENDSHAPE_RATIO = 0.5;

/** Above this, the mouth counts as open — most specifications require it closed. */
export const MOUTH_OPEN_BLENDSHAPE_RATIO = 0.25;

/** Above this, the expression counts as a smile rather than neutral. */
export const SMILE_BLENDSHAPE_RATIO = 0.3;

/**
 * Standard deviation of background luminance, 0–255. Above this the background
 * is not uniform enough. Tuned to tolerate sensor noise but not a patterned wall.
 */
export const MAX_BACKGROUND_LUMINANCE_STDDEV = 12;

/** Mean chroma spread permitted across the background region. */
export const MAX_BACKGROUND_CHROMA_STDDEV = 8;

/** Luminance gradient across the background above which a shadow is reported. */
export const MAX_BACKGROUND_GRADIENT_RATIO = 0.15;

/** Laplacian variance over the face region below which the photo reads as soft. */
export const MIN_FACE_SHARPNESS_VARIANCE = 100;

/** Share of pixels at 0 or 255 above which exposure is reported as clipped. */
export const MAX_CLIPPED_PIXEL_RATIO = 0.02;

/** Acceptable mean face luminance, 0–255. Outside this, exposure is flagged. */
export const MIN_FACE_LUMINANCE = 60;
export const MAX_FACE_LUMINANCE = 220;
