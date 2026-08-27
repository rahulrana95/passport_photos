import { contrastRatio, parseHexColour } from '@/theme/colour-contrast.utils';
import { lumaOf, meanColour, summariseTones } from './luminance.utils';
import type { Rgb } from './luminance.utils';
import { HALF } from '@/measurement/angle.constants';
import type { PixelBuffer } from '@/testing/fixtures/synthetic-head.types';

/** Base and width for rendering a channel back to a two-digit hex pair. */
const HEX_RADIX = 16;
const HEX_PAIR_WIDTH = 2;

export const BACKGROUND_VERDICTS = [
  'acceptable',
  'not-uniform',
  'wrong-colour',
  'shadowed',
  'too-little-background',
] as const;

export type BackgroundVerdict = (typeof BACKGROUND_VERDICTS)[number];

/**
 * Fewest background pixels worth drawing a conclusion from.
 *
 * A tightly cropped photo leaves slivers at the corners, and a standard
 * deviation over two hundred pixels says nothing about a wall. Reporting
 * "not uniform" from that would be a confident answer to a question the image
 * cannot settle.
 */
export const MIN_BACKGROUND_SAMPLES = 2_000;

/**
 * Difference in mean luminance between the left and right halves, above which
 * the background reads as shadowed rather than evenly lit.
 *
 * Measured as a side-to-side difference rather than an overall spread, because
 * that is what a shadow cast by the subject actually looks like: one side
 * darker than the other. An evenly textured wall has spread and no gradient.
 */
export const MAX_SHADOW_GRADIENT = 12;

export interface BackgroundResult {
  readonly verdict: BackgroundVerdict;
  readonly sampleCount: number;
  readonly uniformity: number;
  readonly shadowGradient: number;
  readonly meanColour: Rgb;
}

export interface BackgroundRequirement {
  /** Inclusive hex range the mean background colour must sit within. */
  readonly hexRange: readonly [string, string];
  readonly uniformityTolerance: number;
}

const withinHexRange = (colour: Rgb, range: readonly [string, string]): boolean => {
  const [low, high] = range;
  const [lowRed, lowGreen, lowBlue] = parseHexColour(low);
  const [highRed, highGreen, highBlue] = parseHexColour(high);

  return (
    colour.red >= Math.min(lowRed, highRed) &&
    colour.red <= Math.max(lowRed, highRed) &&
    colour.green >= Math.min(lowGreen, highGreen) &&
    colour.green <= Math.max(lowGreen, highGreen) &&
    colour.blue >= Math.min(lowBlue, highBlue) &&
    colour.blue <= Math.max(lowBlue, highBlue)
  );
};

/**
 * Mean luminance of the background pixels on one side of the frame.
 *
 * Returns undefined when a side has no background at all, which happens when
 * the subject runs off one edge — a real framing, and one where a gradient
 * cannot be computed rather than being zero.
 */
const meanLumaOfSide = (
  buffer: PixelBuffer,
  isBackground: (index: number) => boolean,
  keepLeftHalf: boolean,
): number | undefined => {
  const midpoint = buffer.width / HALF;
  const stats = summariseTones(buffer, (index) => {
    if (!isBackground(index)) return false;
    const x = index % buffer.width;
    return keepLeftHalf ? x < midpoint : x >= midpoint;
  });

  return stats.sampleCount === 0 ? undefined : stats.mean;
};

/**
 * Judges the background behind the subject.
 *
 * Ordered so the most fundamental problem is reported first. Being unable to
 * see enough background outranks everything: no other verdict from a handful
 * of corner pixels would mean anything. Colour outranks uniformity because a
 * blue wall is wrong however evenly it is lit, and telling someone their
 * background is uneven when the real problem is that it is blue sends them to
 * fix the wrong thing.
 */
export const evaluateBackground = (
  buffer: PixelBuffer,
  isBackground: (index: number) => boolean,
  requirement: BackgroundRequirement,
): BackgroundResult => {
  const stats = summariseTones(buffer, isBackground);
  const colour = meanColour(buffer, isBackground);

  const left = meanLumaOfSide(buffer, isBackground, true);
  const right = meanLumaOfSide(buffer, isBackground, false);
  const shadowGradient =
    left === undefined || right === undefined ? 0 : Math.abs(left - right);

  const shared = {
    sampleCount: stats.sampleCount,
    uniformity: stats.standardDeviation,
    shadowGradient,
    meanColour: colour,
  };

  if (stats.sampleCount < MIN_BACKGROUND_SAMPLES) {
    return { verdict: 'too-little-background', ...shared };
  }
  if (!withinHexRange(colour, requirement.hexRange)) {
    return { verdict: 'wrong-colour', ...shared };
  }
  if (shadowGradient > MAX_SHADOW_GRADIENT) {
    return { verdict: 'shadowed', ...shared };
  }
  if (stats.standardDeviation > requirement.uniformityTolerance) {
    return { verdict: 'not-uniform', ...shared };
  }

  return { verdict: 'acceptable', ...shared };
};

/**
 * How far the subject stands out from the background.
 *
 * Not a rule any authority publishes, and not reported as one. It is the
 * confidence signal for everything else in this module: white clothing on a
 * white wall, or dark hair on a dark wall, produces a mask that bleeds, and
 * every measurement taken through that mask is suspect. Knowing the two are
 * hard to tell apart is worth more than any single measurement made anyway.
 */
export const subjectBackgroundSeparation = (
  buffer: PixelBuffer,
  isBackground: (index: number) => boolean,
): number => {
  const background = meanColour(buffer, isBackground);
  const subject = meanColour(buffer, (index) => !isBackground(index));

  return Math.abs(lumaOf(background) - lumaOf(subject));
};

/** Contrast ratio between the mean subject and background, for reporting. */
export const subjectBackgroundContrast = (
  buffer: PixelBuffer,
  isBackground: (index: number) => boolean,
): number => {
  const toHex = (colour: Rgb): string =>
    `#${[colour.red, colour.green, colour.blue]
      .map((channel) => Math.round(channel).toString(HEX_RADIX).padStart(HEX_PAIR_WIDTH, '0'))
      .join('')}`;

  return contrastRatio(
    toHex(meanColour(buffer, isBackground)),
    toHex(meanColour(buffer, (index) => !isBackground(index))),
  );
};
