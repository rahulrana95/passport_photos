import type { ToneStatistics } from './luminance.utils';

/**
 * EXPOSURE IS JUDGED WITHOUT REFERENCE TO ABSOLUTE BRIGHTNESS.
 *
 * This is the fairness requirement, and it is a design constraint rather than a
 * test to remember to write.
 *
 * The obvious exposure check is mean face luminance against a threshold: too
 * dark, too bright, about right. It is also unusable. Skin tone IS luminance —
 * a correctly exposed photograph of dark skin has a lower mean than a
 * correctly exposed photograph of pale skin, by definition and by a wide
 * margin. Any threshold on the mean therefore rejects darker-skinned people for
 * having been photographed accurately, and the rejection arrives as a
 * confident, official-sounding "your photo is too dark". That is the exact
 * failure that has made camera metering and photo-compliance tools notorious,
 * and shipping it would be worse than shipping nothing.
 *
 * What actually distinguishes a badly exposed photograph, at any skin tone:
 *
 *   CLIPPING — pixels pinned at pure black or pure white have no detail left
 *   in them. The information is gone, and it is gone whatever tone the subject
 *   is. This is the honest signal.
 *
 *   CRUSHED RANGE — a well-exposed face of any tone has a spread of tones
 *   across it: lit side, shadowed side, the modelling that makes it read as a
 *   face. An under- or over-exposed one collapses toward one end and the
 *   spread disappears. Measured as the gap between the 5th and 95th
 *   percentiles, which is a property of the exposure and not of the subject.
 *
 * The mean is deliberately never consulted. It is carried in the statistics
 * because the background checks need it, and reading it here would reintroduce
 * exactly what this file exists to avoid.
 */

export const EXPOSURE_VERDICTS = ['well-exposed', 'clipped-shadows', 'clipped-highlights', 'flat'] as const;

export type ExposureVerdict = (typeof EXPOSURE_VERDICTS)[number];

/**
 * Share of face pixels that may sit at an extreme before detail is lost.
 *
 * Not zero: a specular highlight on a nose or a pupil is pure black or white in
 * almost every photograph ever taken, and demanding none would fail everything.
 */
export const MAX_CLIPPED_RATIO = 0.02;

/**
 * Minimum spread between the 5th and 95th percentile of face luminance.
 *
 * Below this the face has no modelling left — it is a silhouette or a
 * blown-out shape. Chosen well under what any correctly exposed face shows, so
 * it catches genuine failure rather than dim lighting.
 */
export const MIN_TONAL_RANGE = 25;

export interface ExposureResult {
  readonly verdict: ExposureVerdict;
  /** The gap between the 5th and 95th percentiles. */
  readonly tonalRange: number;
  readonly clippedBlackRatio: number;
  readonly clippedWhiteRatio: number;
}

/**
 * Judges exposure from the face region's tones.
 *
 * Clipping is reported before flatness, because clipping names the specific
 * thing that went wrong and flatness only says the result is unusable. A photo
 * with blown highlights is told about its highlights.
 */
export const evaluateExposure = (face: ToneStatistics): ExposureResult => {
  const tonalRange = face.percentile95 - face.percentile5;
  const shared = {
    tonalRange,
    clippedBlackRatio: face.clippedBlackRatio,
    clippedWhiteRatio: face.clippedWhiteRatio,
  };

  if (face.clippedWhiteRatio > MAX_CLIPPED_RATIO) {
    return { verdict: 'clipped-highlights', ...shared };
  }
  if (face.clippedBlackRatio > MAX_CLIPPED_RATIO) {
    return { verdict: 'clipped-shadows', ...shared };
  }
  if (tonalRange < MIN_TONAL_RANGE) {
    return { verdict: 'flat', ...shared };
  }

  return { verdict: 'well-exposed', ...shared };
};
