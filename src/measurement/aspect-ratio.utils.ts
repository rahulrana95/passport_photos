import { ASPECT_RATIO_TOLERANCE_RATIO } from '@/constants/measurement.constants';
import { roundMeasurement } from './format-measurement.utils';

export interface Dimensions {
  readonly width: number;
  readonly height: number;
}

export class InvalidDimensionsError extends Error {
  constructor(dimensions: Dimensions) {
    super(
      `Invalid dimensions: width (${dimensions.width}) and height (${dimensions.height}) must both be finite and positive.`,
    );
    this.name = 'InvalidDimensionsError';
  }
}

export const areValidDimensions = (dimensions: Dimensions): boolean =>
  Number.isFinite(dimensions.width) &&
  Number.isFinite(dimensions.height) &&
  dimensions.width > 0 &&
  dimensions.height > 0;

export const aspectRatio = (dimensions: Dimensions): number => {
  if (!areValidDimensions(dimensions)) throw new InvalidDimensionsError(dimensions);
  return dimensions.width / dimensions.height;
};

/**
 * Whether two shapes match in proportion, within a tolerance.
 *
 * Compared as a ratio rather than by absolute difference, so the tolerance
 * means the same thing for a 35x45mm photo and a 600x600px one.
 */
export const aspectRatiosMatch = (
  a: Dimensions,
  b: Dimensions,
  tolerance: number = ASPECT_RATIO_TOLERANCE_RATIO,
): boolean => {
  const ratioA = aspectRatio(a);
  const ratioB = aspectRatio(b);
  return Math.abs(ratioA - ratioB) / Math.max(ratioA, ratioB) <= tolerance;
};

/**
 * The largest region of the target proportion that fits inside `source`.
 *
 * Used to find the crop rectangle for a specification whose shape differs from
 * the photo's — which is most of them, since phones shoot 4:3 and 16:9 while
 * every passport standard is closer to square.
 */
export const largestInscribedRect = (source: Dimensions, targetRatio: number): Dimensions => {
  if (!areValidDimensions(source)) throw new InvalidDimensionsError(source);
  if (!Number.isFinite(targetRatio) || targetRatio <= 0) {
    throw new RangeError(`Target ratio must be finite and positive, received ${targetRatio}`);
  }

  const sourceRatio = aspectRatio(source);

  return sourceRatio > targetRatio
    ? { width: roundMeasurement(source.height * targetRatio), height: source.height }
    : { width: source.width, height: roundMeasurement(source.width / targetRatio) };
};
