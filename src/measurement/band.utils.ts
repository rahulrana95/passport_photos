import { BAND_EDGE_COUNT, BAND_TOLERANCE_MM } from '@/constants/measurement.constants';
import type { Band, BandEvaluation } from './band.types';

export class InvalidBandError extends Error {
  constructor(band: Band) {
    super(`Invalid band: min (${band.min}) must not exceed max (${band.max}).`);
    this.name = 'InvalidBandError';
  }
}

/**
 * Every band in this product describes a physical quantity — a length, a
 * proportion, a standard deviation — so a negative edge is always a bug rather
 * than a legitimate range. Requiring min >= 0 makes that explicit, and it is
 * what lets the 'above' branch below assume a positive value.
 */
export const isValidBand = (band: Band): boolean =>
  Number.isFinite(band.min) && Number.isFinite(band.max) && band.min >= 0 && band.min <= band.max;

/**
 * Evaluates a measurement against a specification band.
 *
 * Two rules govern this function, and both exist to stop a correct photo being
 * failed by our own arithmetic:
 *
 * 1. THE VALUE IS NEVER ROUNDED HERE. Rounding is a display concern. A head
 *    measuring 24.996mm against a 25mm minimum is a genuine near-miss and the
 *    delta should say so; rounding it to 25.0 first would report a pass we did
 *    not actually measure.
 * 2. THE BAND IS WIDENED BY A TOLERANCE. Landmark detection carries sub-pixel
 *    jitter, and a measurement sitting exactly on a boundary must not flip
 *    between runs. The tolerance is far tighter than any published requirement,
 *    so it cannot let a genuinely wrong photo through.
 */
export const evaluateBand = (
  value: number,
  band: Band,
  tolerance: number = BAND_TOLERANCE_MM,
): BandEvaluation => {
  if (!isValidBand(band)) throw new InvalidBandError(band);
  if (!Number.isFinite(value)) throw new TypeError(`Measurement must be finite, received ${value}`);

  const lower = band.min - tolerance;
  const upper = band.max + tolerance;

  if (value < lower) {
    return {
      status: 'below',
      value,
      band,
      delta: value - band.min,
      scaleToBand: value === 0 ? Number.POSITIVE_INFINITY : band.min / value,
    };
  }
  if (value > upper) {
    // No zero guard here, unlike the branch above: a value greater than
    // `upper` is necessarily positive, because a band's edges are never
    // negative. Adding one would be unreachable code pretending to be caution.
    return { status: 'above', value, band, delta: value - band.max, scaleToBand: band.max / value };
  }
  return { status: 'within', value, band, delta: 0, scaleToBand: 1 };
};

/** The value at the centre of a band, which is what a crop should aim for. */
export const bandMidpoint = (band: Band): number => {
  if (!isValidBand(band)) throw new InvalidBandError(band);
  return (band.min + band.max) / BAND_EDGE_COUNT;
};

/**
 * Scales a band from one unit to another — millimetres to pixels, say.
 *
 * Both edges scale by the same factor, so a band can never invert through
 * conversion.
 */
export const scaleBand = (band: Band, factor: number): Band => {
  if (!isValidBand(band)) throw new InvalidBandError(band);
  if (!Number.isFinite(factor) || factor <= 0) {
    throw new RangeError(`Scale factor must be finite and positive, received ${factor}`);
  }
  return { min: band.min * factor, max: band.max * factor };
};
