import { DEGREES_PER_RADIAN } from '@/measurement/angle.constants';
import type { SourcePoint } from './geometry.types';

/**
 * Head tilt, from the line between the eyes.
 *
 * Signed, because "tilt left" and "tilt right" are different instructions and
 * a magnitude alone cannot say which. Zero is normalised away from negative
 * zero, which atan2 returns for a perfectly level line and which formats as
 * "-0°" — a broken tool rather than a level head.
 */
export const rollFromEyes = (leftEye: SourcePoint, rightEye: SourcePoint): number => {
  const degrees =
    Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * DEGREES_PER_RADIAN;

  return degrees === 0 ? 0 : degrees;
};
