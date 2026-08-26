import { MAX_SOURCE_DIMENSION_PX } from '@/constants/limits.constants';
import { millimetresToPixels } from './format-measurement.utils';
import { areValidDimensions, InvalidDimensionsError, type Dimensions } from './aspect-ratio.utils';

export interface ResolutionRequirement {
  readonly widthMm: number;
  readonly heightMm: number;
  readonly dpi: number;
}

export type ResolutionVerdict =
  | { readonly sufficient: true; readonly requiredPx: Dimensions; readonly headroom: number }
  | {
      readonly sufficient: false;
      readonly requiredPx: Dimensions;
      readonly reason: 'too-small' | 'exceeds-canvas-limit';
      /** How much larger the source would need to be, as a multiplier. */
      readonly shortfallFactor: number;
    };

export const requiredPixels = (requirement: ResolutionRequirement): Dimensions => ({
  width: millimetresToPixels(requirement.widthMm, requirement.dpi),
  height: millimetresToPixels(requirement.heightMm, requirement.dpi),
});

/**
 * Whether a source image can produce the required print at the required
 * resolution.
 *
 * Deliberately never upscales. An image enlarged to hit a pixel count reads as
 * soft to a human reviewer and passes an automated pixel check, which is the
 * worst combination: it looks compliant to us and gets rejected by them.
 */
export const evaluateResolution = (
  source: Dimensions,
  requirement: ResolutionRequirement,
): ResolutionVerdict => {
  if (!areValidDimensions(source)) throw new InvalidDimensionsError(source);

  const requiredPx = requiredPixels(requirement);

  if (requiredPx.width > MAX_SOURCE_DIMENSION_PX || requiredPx.height > MAX_SOURCE_DIMENSION_PX) {
    return {
      sufficient: false,
      requiredPx,
      reason: 'exceeds-canvas-limit',
      shortfallFactor: 1,
    };
  }

  const widthRatio = source.width / requiredPx.width;
  const heightRatio = source.height / requiredPx.height;
  const limiting = Math.min(widthRatio, heightRatio);

  return limiting >= 1
    ? { sufficient: true, requiredPx, headroom: limiting }
    : { sufficient: false, requiredPx, reason: 'too-small', shortfallFactor: 1 / limiting };
};
