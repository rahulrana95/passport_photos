import { bandMidpoint, evaluateBand } from '@/measurement/band.utils';
import { millimetresToPixels } from '@/measurement/format-measurement.utils';
import type { ResolvedPhotoSpec } from '@/photo-spec/photo-spec.types';
import { HALF } from '@/measurement/angle.constants';
import { rollFromEyes } from './roll.utils';
import type {
  CropRect,
  GeometryMeasurements,
  GeometryResult,
  SubjectGeometry,
} from './geometry.types';


/**
 * Where the eye line sits when a specification does not state one.
 *
 * Measured from the bottom of the crop as a share of its height. Most
 * authorities that omit an eye-line rule still expect the head centred with a
 * little more space above than below, which this reproduces — and unlike a
 * stated rule it is never reported as a measurement, only used to place the
 * crop.
 */
const DEFAULT_EYE_LINE_RATIO = 0.56;

/**
 * Minimum plausible head height in source pixels.
 *
 * Below this the arithmetic still produces a crop, and every millimetre in it
 * is noise: a crown and chin a few pixels apart divide into a crop size larger
 * than any camera ever produced.
 */
const MIN_HEAD_PIXELS = 24;

/**
 * Plans the crop that would satisfy the specification, and measures the result.
 *
 * The crop size is derived from the head, not chosen and then checked. Printing
 * a crop of height H at the spec's physical height fixes the scale, so a target
 * head height in millimetres names exactly one crop height:
 *
 *     cropHeightPx = headPixels x printHeightMm / targetHeadMm
 *
 * Aiming at the middle of the band rather than an edge is deliberate. The band
 * edges are where a rejection lives, and landmark jitter of a pixel or two
 * between runs would otherwise flip a photo from pass to fail without anything
 * about it changing.
 */
export const planCrop = (subject: SubjectGeometry, spec: ResolvedPhotoSpec): GeometryResult => {
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

  const headBand = { min: spec.headHeight.minMm, max: spec.headHeight.maxMm };
  const targetHeadMm = bandMidpoint(headBand);

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

  const rawCrop: CropRect = {
    x: faceMidlineX - cropWidthPx / HALF,
    y: eyeY + eyeFromBottomPx - cropHeightPx,
    widthPx: cropWidthPx,
    heightPx: cropHeightPx,
  };

  if (
    rawCrop.x < 0 ||
    rawCrop.y < 0 ||
    rawCrop.x + rawCrop.widthPx > subject.sourceWidthPx ||
    rawCrop.y + rawCrop.heightPx > subject.sourceHeightPx
  ) {
    return { ok: false, reason: 'crop-outside-source' };
  }

  // Never upscale. The crop is what will be printed, and enlarging it to reach
  // the required pixel count invents detail that the printer then renders as
  // softness — which is itself a rejection reason.
  const requiredHeightPx = millimetresToPixels(spec.print.heightMm, spec.print.dpi);
  if (cropHeightPx < requiredHeightPx) {
    return { ok: false, reason: 'source-resolution-too-low' };
  }

  const headHeightMm = headPixels * millimetresPerPixel;
  const eyeLineFromBottomMm = (rawCrop.y + rawCrop.heightPx - eyeY) * millimetresPerPixel;

  const measurements: GeometryMeasurements = {
    headHeightMm,
    headHeight: evaluateBand(headHeightMm, headBand),
    eyeLineFromBottomMm: spec.eyeLine === undefined ? undefined : eyeLineFromBottomMm,
    eyeLine:
      spec.eyeLine === undefined
        ? undefined
        : evaluateBand(eyeLineFromBottomMm, {
            min: spec.eyeLine.minFromBottomMm,
            max: spec.eyeLine.maxFromBottomMm,
          }),
    horizontalOffsetRatio: (faceMidlineX - (rawCrop.x + rawCrop.widthPx / HALF)) / rawCrop.widthPx,
    rollDegrees: rollFromEyes(subject.leftEye, subject.rightEye),
  };

  return { ok: true, crop: rawCrop, measurements };
};
