import { evaluateBand } from '@/measurement/band.utils';
import { millimetresToPixels } from '@/measurement/format-measurement.utils';
import type { ResolvedPhotoSpec } from '@/photo-spec/photo-spec.types';
import { HALF } from '@/measurement/angle.constants';
import { planRawCrop } from './crop-geometry.utils';
import { rollFromEyes } from './roll.utils';
import type { GeometryMeasurements, GeometryResult, SubjectGeometry } from './geometry.types';

/**
 * Plans the crop that would satisfy the specification, and measures the result.
 *
 * Where the crop goes is planRawCrop's decision, shared with the live camera so
 * the preview and the analyser can never disagree about the same photograph.
 * What is left here is the part the live camera does NOT want: refusing.
 */
export const planCrop = (subject: SubjectGeometry, spec: ResolvedPhotoSpec): GeometryResult => {
  const attempt = planRawCrop(subject, spec);
  if (!attempt.ok) return { ok: false, reason: attempt.reason };

  const { crop, headPixels, millimetresPerPixel, faceMidlineX, eyeY } = attempt.plan;

  if (
    crop.x < 0 ||
    crop.y < 0 ||
    crop.x + crop.widthPx > subject.sourceWidthPx ||
    crop.y + crop.heightPx > subject.sourceHeightPx
  ) {
    return { ok: false, reason: 'crop-outside-source' };
  }

  // Never upscale. The crop is what will be printed, and enlarging it to reach
  // the required pixel count invents detail that the printer then renders as
  // softness — which is itself a rejection reason.
  const requiredHeightPx = millimetresToPixels(spec.print.heightMm, spec.print.dpi);
  if (crop.heightPx < requiredHeightPx) {
    return { ok: false, reason: 'source-resolution-too-low' };
  }

  const headHeightMm = headPixels * millimetresPerPixel;
  const eyeLineFromBottomMm = (crop.y + crop.heightPx - eyeY) * millimetresPerPixel;

  const measurements: GeometryMeasurements = {
    headHeightMm,
    headHeight: evaluateBand(headHeightMm, {
      min: spec.headHeight.minMm,
      max: spec.headHeight.maxMm,
    }),
    eyeLineFromBottomMm: spec.eyeLine === undefined ? undefined : eyeLineFromBottomMm,
    eyeLine:
      spec.eyeLine === undefined
        ? undefined
        : evaluateBand(eyeLineFromBottomMm, {
            min: spec.eyeLine.minFromBottomMm,
            max: spec.eyeLine.maxFromBottomMm,
          }),
    horizontalOffsetRatio: (faceMidlineX - (crop.x + crop.widthPx / HALF)) / crop.widthPx,
    rollDegrees: rollFromEyes(subject.leftEye, subject.rightEye),
  };

  return { ok: true, crop, measurements };
};
