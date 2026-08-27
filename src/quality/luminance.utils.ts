import {
  CHANNEL_MAX,
  CHANNEL_MIN,
  CHANNEL_OFFSET_BLUE,
  CHANNEL_OFFSET_GREEN,
  CHANNEL_OFFSET_RED,
  CHANNELS_PER_PIXEL,
} from '@/testing/fixtures/pixel-format.constants';
import type { PixelBuffer } from '@/testing/fixtures/synthetic-head.types';

/**
 * Rec. 709 luma coefficients, which is what a display and a printer weight by.
 * Averaging the three channels instead would call a saturated blue as bright as
 * a mid grey, and no eye or press agrees.
 */
const LUMA_RED = 0.2126;
const LUMA_GREEN = 0.7152;
const LUMA_BLUE = 0.0722;

export const HISTOGRAM_BINS = CHANNEL_MAX + 1;

export interface Rgb {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
}

export const rgbAt = (buffer: PixelBuffer, index: number): Rgb => {
  const offset = index * CHANNELS_PER_PIXEL;

  return {
    red: Number(buffer.data[offset + CHANNEL_OFFSET_RED]),
    green: Number(buffer.data[offset + CHANNEL_OFFSET_GREEN]),
    blue: Number(buffer.data[offset + CHANNEL_OFFSET_BLUE]),
  };
};

export const lumaOf = (colour: Rgb): number =>
  LUMA_RED * colour.red + LUMA_GREEN * colour.green + LUMA_BLUE * colour.blue;

/**
 * A summary of one region's tones, in the form every quality check needs.
 *
 * The percentiles are the load-bearing part. Mean luminance is the number a
 * naive exposure check reaches for, and it is exactly the number that encodes
 * skin tone — see exposure.utils.ts for why that matters.
 */
export interface ToneStatistics {
  readonly sampleCount: number;
  readonly mean: number;
  readonly standardDeviation: number;
  /** Share of samples pinned to the very bottom of the range. */
  readonly clippedBlackRatio: number;
  /** Share of samples pinned to the very top. */
  readonly clippedWhiteRatio: number;
  readonly percentile5: number;
  readonly percentile95: number;
}

const EMPTY_STATISTICS: ToneStatistics = {
  sampleCount: 0,
  mean: 0,
  standardDeviation: 0,
  clippedBlackRatio: 0,
  clippedWhiteRatio: 0,
  percentile5: 0,
  percentile95: 0,
};

/** Variance is the mean of the squared deviations. */
const SQUARED = 2;

const PERCENTILE_LOW = 0.05;
const PERCENTILE_HIGH = 0.95;

const percentileFromHistogram = (
  histogram: readonly number[],
  sampleCount: number,
  fraction: number,
): number => {
  const target = sampleCount * fraction;
  let seen = 0;
  let bin = 0;

  // Iterated by value and terminated by break rather than by an early return.
  // Returning from inside leaves a final return the loop can never reach — the
  // histogram sums to sampleCount, so the target is always met — and an
  // unreachable branch is worse than no branch.
  for (const count of histogram) {
    seen += count;
    if (seen >= target) break;
    bin += 1;
  }

  return Math.min(bin, CHANNEL_MAX);
};

/**
 * Summarises the tones of whichever pixels a predicate selects.
 *
 * Built from a histogram rather than a sorted array: a full-frame region is
 * hundreds of thousands of samples, and sorting them to find two percentiles
 * costs more than every other quality check put together.
 */
export const summariseTones = (
  buffer: PixelBuffer,
  includes: (index: number) => boolean,
): ToneStatistics => {
  const histogram = new Array<number>(HISTOGRAM_BINS).fill(0);
  const pixelCount = buffer.width * buffer.height;
  let sampleCount = 0;
  let total = 0;

  for (let index = 0; index < pixelCount; index += 1) {
    if (!includes(index)) continue;

    const luma = Math.round(lumaOf(rgbAt(buffer, index)));
    const bin = Math.min(CHANNEL_MAX, Math.max(CHANNEL_MIN, luma));
    // Read through Number rather than defaulted. The array is created full of
    // zeroes and every bin is clamped into range above, so an absent element
    // cannot occur — and defaulting for it would add four branches across this
    // function that no input can reach.
    histogram[bin] = Number(histogram[bin]) + 1;
    total += bin;
    sampleCount += 1;
  }

  if (sampleCount === 0) return EMPTY_STATISTICS;

  const mean = total / sampleCount;
  let varianceTotal = 0;
  for (const [bin, count] of histogram.entries()) {
    if (count === 0) continue;
    varianceTotal += count * (bin - mean) ** SQUARED;
  }

  return {
    sampleCount,
    mean,
    standardDeviation: Math.sqrt(varianceTotal / sampleCount),
    clippedBlackRatio: Number(histogram[CHANNEL_MIN]) / sampleCount,
    clippedWhiteRatio: Number(histogram[CHANNEL_MAX]) / sampleCount,
    percentile5: percentileFromHistogram(histogram, sampleCount, PERCENTILE_LOW),
    percentile95: percentileFromHistogram(histogram, sampleCount, PERCENTILE_HIGH),
  };
};

/** Mean colour of the selected pixels, for comparing against a specified hue. */
export const meanColour = (buffer: PixelBuffer, includes: (index: number) => boolean): Rgb => {
  const pixelCount = buffer.width * buffer.height;
  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;

  for (let index = 0; index < pixelCount; index += 1) {
    if (!includes(index)) continue;

    const colour = rgbAt(buffer, index);
    red += colour.red;
    green += colour.green;
    blue += colour.blue;
    count += 1;
  }

  return count === 0
    ? { red: 0, green: 0, blue: 0 }
    : { red: red / count, green: green / count, blue: blue / count };
};
