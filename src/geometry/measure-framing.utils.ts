import { evaluateBand } from '@/measurement/band.utils';
import { aspectRatiosMatch } from '@/measurement/aspect-ratio.utils';
import type { ResolvedPhotoSpec } from '@/photo-spec/photo-spec.types';
import { HALF } from '@/measurement/angle.constants';
import { rollFromEyes } from './roll.utils';
import type { GeometryMeasurements, SubjectGeometry } from './geometry.types';


export type FramingResult =
  | {
      readonly ok: true;
      readonly measurements: GeometryMeasurements;
      /** False when the photo's shape does not match the specification's. */
      readonly aspectMatches: boolean;
    }
  | { readonly ok: false; readonly reason: 'crown-unmeasured' | 'head-not-in-frame' };

/**
 * Measures a photograph as it already is, against a specification.
 *
 * The other half of the product, and the half the crop planner cannot answer.
 * planCrop chooses where the crop goes, so it centres the face by construction
 * and horizontal centring is trivially satisfied. Someone checking a photo a
 * booth or a shop already produced has no such luxury: the framing is fixed,
 * and whether the head is centred is exactly the question.
 *
 * The whole image is treated as the printed photo, so every pixel measurement
 * converts through the specification's print size.
 */
export const measureFraming = (
  subject: SubjectGeometry,
  spec: ResolvedPhotoSpec,
): FramingResult => {
  if (subject.crownY === undefined) return { ok: false, reason: 'crown-unmeasured' };

  if (
    subject.crownY < 0 ||
    subject.chin.y > subject.sourceHeightPx ||
    subject.chin.y <= subject.crownY
  ) {
    return { ok: false, reason: 'head-not-in-frame' };
  }

  const millimetresPerPixel = spec.print.heightMm / subject.sourceHeightPx;
  const headHeightMm = (subject.chin.y - subject.crownY) * millimetresPerPixel;

  const eyeY = (subject.leftEye.y + subject.rightEye.y) / HALF;
  const eyeLineFromBottomMm = (subject.sourceHeightPx - eyeY) * millimetresPerPixel;

  const faceMidlineX = (subject.leftEye.x + subject.rightEye.x) / HALF;
  const headBand = { min: spec.headHeight.minMm, max: spec.headHeight.maxMm };

  return {
    ok: true,
    aspectMatches: aspectRatiosMatch(
      { width: subject.sourceWidthPx, height: subject.sourceHeightPx },
      { width: spec.print.widthMm, height: spec.print.heightMm },
    ),
    measurements: {
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
      // Signed, and against the photograph's own centre. Negative is left.
      horizontalOffsetRatio:
        (faceMidlineX - subject.sourceWidthPx / HALF) / subject.sourceWidthPx,
      rollDegrees: rollFromEyes(subject.leftEye, subject.rightEye),
    },
  };
};
