import { bandMidpoint } from '@/measurement/band.utils';
import { HALF } from '@/measurement/angle.constants';
import type { ResolvedPhotoSpec } from '@/photo-spec/photo-spec.types';
import type { CropRect, SubjectGeometry } from './geometry.types';

/**
 * Where the eye line sits when a specification does not state one.
 *
 * Measured from the bottom of the crop as a share of its height. Most
 * authorities that omit an eye-line rule still expect the head centred with a
 * little more space above than below, which this reproduces — and unlike a
 * stated rule it is never reported as a measurement, only used to place the
 * crop.
 */
export const DEFAULT_EYE_LINE_RATIO = 0.56;

/**
 * Minimum plausible head height in source pixels.
 *
 * Below this the arithmetic still produces a crop, and every millimetre in it
 * is noise: a crown and chin a few pixels apart divide into a crop size larger
 * than any camera ever produced.
 */
export const MIN_HEAD_PIXELS = 24;

export interface PlannedCrop {
  /**
   * The crop the specification asks for. MAY LIE OUTSIDE THE SOURCE — that is
   * the point of this type. Whether it fits is a separate question, and the
   * two callers answer it differently: the still pipeline refuses, and the
   * live camera turns the overflow into "step back" or "move left".
   */
  readonly crop: CropRect;
  readonly headPixels: number;
  readonly millimetresPerPixel: number;
  readonly faceMidlineX: number;
  readonly eyeY: number;
}

export type CropPlanAttempt =
  | { readonly ok: true; readonly plan: PlannedCrop }
  | {
      readonly ok: false;
      readonly reason: 'crown-unmeasured' | 'degenerate-geometry' | 'head-not-in-frame';
    }

/**
 * Where the crop goes, and nothing about whether it is allowed there.
 *
 * Extracted so the live camera and the still pipeline compute the SAME
 * rectangle. If they each derived their own, the preview could tell somebody
 * to hold still for a frame the analyser then rejects — which is worse than no
 * guidance, because they would have followed it.
 *
 * The crop size is derived from the head, not chosen and then checked.
 * Printing a crop of height H at the spec's physical height fixes the scale, so
 * a target head height in millimetres names exactly one crop height:
 *
 *     cropHeightPx = headPixels x printHeightMm / targetHeadMm
 *
 * Aiming at the middle of the band rather than an edge is deliberate. The band
 * edges are where a rejection lives, and landmark jitter of a pixel or two
 * between runs would otherwise flip a photo from pass to fail without anything
 * about it changing.
 */
export const planRawCrop = (
  subject: SubjectGeometry,
  spec: ResolvedPhotoSpec,
): CropPlanAttempt => {
  if (subject.crownY === undefined) return { ok: false, reason: 'crown-unmeasured' };

  const headPixels = subject.chin.y - subject.crownY;
  if (headPixels < MIN_HEAD_PIXELS) return { ok: false, reason: 'degenerate-geometry' };

  // The head must be inside the frame for the measurement to mean anything.
  // A crown above the top edge or a chin below the bottom is a photograph of
  // part of a head, and the part that is missing is the part being measured.
  if (
    subject.crownY < 0 ||
    subject.chin.y > subject.sourceHeightPx ||
    subject.chin.y <= subject.crownY
  ) {
    return { ok: false, reason: 'head-not-in-frame' };
  }

  const targetHeadMm = bandMidpoint({ min: spec.headHeight.minMm, max: spec.headHeight.maxMm });

  const cropHeightPx = (headPixels * spec.print.heightMm) / targetHeadMm;
  const cropWidthPx = (cropHeightPx * spec.print.widthMm) / spec.print.heightMm;
  const millimetresPerPixel = spec.print.heightMm / cropHeightPx;

  // Vertical placement follows the eye line when the authority states one,
  // because that is the rule that will be checked. Otherwise it follows the
  // default proportion, which places the head rather than claiming a rule.
  const eyeY = (subject.leftEye.y + subject.rightEye.y) / HALF;
  const eyeFromBottomPx =
    spec.eyeLine === undefined
      ? cropHeightPx * DEFAULT_EYE_LINE_RATIO
      : bandMidpoint({
          min: spec.eyeLine.minFromBottomMm,
          max: spec.eyeLine.maxFromBottomMm,
        }) / millimetresPerPixel;

  const faceMidlineX = (subject.leftEye.x + subject.rightEye.x) / HALF;

  return {
    ok: true,
    plan: {
      crop: {
        x: faceMidlineX - cropWidthPx / HALF,
        y: eyeY + eyeFromBottomPx - cropHeightPx,
        widthPx: cropWidthPx,
        heightPx: cropHeightPx,
      },
      headPixels,
      millimetresPerPixel,
      faceMidlineX,
      eyeY,
    },
  };
};
