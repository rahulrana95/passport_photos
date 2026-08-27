import { lumaOf, rgbAt } from './luminance.utils';
import type { PixelBuffer } from '@/testing/fixtures/synthetic-head.types';

export const SHARPNESS_VERDICTS = ['sharp', 'soft', 'too-small-to-judge'] as const;

export type SharpnessVerdict = (typeof SHARPNESS_VERDICTS)[number];

/**
 * Laplacian variance below which the region reads as soft.
 *
 * Measured against the synthetic corpus rather than guessed:
 *
 *   sharp                676
 *   one-pixel box blur    36
 *   two-pixel box blur    10
 *   three-pixel box blur   5
 *
 * The gap between sharp and even the mildest blur is nineteenfold, so the
 * threshold sits in the middle of a wide empty space rather than beside a
 * boundary. An earlier value of 40 was only four away from the one-pixel
 * figure, which a different noise seed could have crossed.
 */
export const MIN_LAPLACIAN_VARIANCE = 100;

/** Fewer samples than this and the variance is noise rather than a measurement. */
export const MIN_SHARPNESS_SAMPLES = 500;

/**
 * The four-neighbour Laplacian kernel weights its centre by the number of
 * neighbours it subtracts, so a flat region sums to zero.
 */
const LAPLACIAN_NEIGHBOUR_COUNT = 4;

export interface SharpnessResult {
  readonly verdict: SharpnessVerdict;
  readonly laplacianVariance: number;
  readonly sampleCount: number;
}

/**
 * Measures focus over a region, by the variance of its Laplacian.
 *
 * A sharp edge has a large second derivative; a blurred one does not. Taking
 * the variance rather than the mean is what makes it work: the Laplacian of a
 * smooth region averages to roughly zero whether it is sharp or blurred, and
 * only its spread distinguishes them.
 *
 * WHAT THIS CANNOT TELL YOU, and does not pretend to: motion blur, camera
 * shake and a missed focus all reduce it identically, and so does a shallow
 * depth of field that happens to be sharp elsewhere. The verdict is "soft",
 * never a diagnosis of why — because the pixels genuinely do not say, and a
 * confident wrong reason sends someone to fix the wrong thing.
 */
export const evaluateSharpness = (
  buffer: PixelBuffer,
  includes: (index: number) => boolean,
): SharpnessResult => {
  let sampleCount = 0;
  let total = 0;
  let totalSquares = 0;

  const lumaAt = (x: number, y: number): number => lumaOf(rgbAt(buffer, y * buffer.width + x));

  // The border is skipped rather than clamped. Clamping invents a neighbour
  // equal to the edge pixel, which reads as a perfectly flat region and drags
  // the variance down by exactly as much as the perimeter is long — worse on
  // small regions, which are the ones already hardest to judge.
  for (let y = 1; y < buffer.height - 1; y += 1) {
    for (let x = 1; x < buffer.width - 1; x += 1) {
      const index = y * buffer.width + x;
      if (!includes(index)) continue;

      const laplacian =
        lumaAt(x - 1, y) +
        lumaAt(x + 1, y) +
        lumaAt(x, y - 1) +
        lumaAt(x, y + 1) -
        LAPLACIAN_NEIGHBOUR_COUNT * lumaAt(x, y);

      total += laplacian;
      totalSquares += laplacian * laplacian;
      sampleCount += 1;
    }
  }

  if (sampleCount < MIN_SHARPNESS_SAMPLES) {
    return { verdict: 'too-small-to-judge', laplacianVariance: 0, sampleCount };
  }

  const mean = total / sampleCount;
  const laplacianVariance = totalSquares / sampleCount - mean * mean;

  return {
    verdict: laplacianVariance < MIN_LAPLACIAN_VARIANCE ? 'soft' : 'sharp',
    laplacianVariance,
    sampleCount,
  };
};
