import { createDeterministicRandom, deterministicNoise } from './deterministic-random.utils';
import {
  ALPHA_OPAQUE,
  CHANNEL_MAX,
  CHANNEL_MIN,
  CHANNEL_OFFSET_ALPHA,
  CHANNEL_OFFSET_BLUE,
  CHANNEL_OFFSET_GREEN,
  CHANNEL_OFFSET_RED,
  CHANNELS_PER_PIXEL,
  HALF,
} from './pixel-format.constants';
import type { PixelBuffer, SyntheticHeadSpec } from './synthetic-head.types';

const clampChannel = (value: number): number =>
  Math.min(CHANNEL_MAX, Math.max(CHANNEL_MIN, Math.round(value)));

/**
 * True when (x, y) falls inside the head silhouette.
 *
 * The head is an ellipse spanning crown to chin. A covering, when present,
 * extends the silhouette upward from the crown — which is exactly the case that
 * breaks naive crown detection, since the topmost opaque pixel is then the hat
 * rather than the skull.
 */
const isInsideHead = (x: number, y: number, spec: SyntheticHeadSpec): boolean => {
  const top = spec.crownY - spec.headCoveringPx;
  if (y < top || y > spec.chinY) return false;

  const centreY = (spec.crownY + spec.chinY) / HALF;
  const semiMajor = (spec.chinY - spec.crownY) / HALF;
  const semiMinor = spec.headWidthPx / HALF;
  if (semiMajor <= 0 || semiMinor <= 0) return false;

  // Rows above the crown belong to the covering, which follows the head's
  // widest section rather than tapering.
  if (y < spec.crownY) return Math.abs(x - spec.centreX) <= semiMinor;

  const normalisedX = (x - spec.centreX) / semiMinor;
  const normalisedY = (y - centreY) / semiMajor;
  return normalisedX * normalisedX + normalisedY * normalisedY <= 1;
};

/**
 * Renders a fixture to an RGBA buffer.
 *
 * Produces pixel data rather than an encoded image on purpose: the analysis
 * pipeline consumes buffers, jsdom has no canvas, and skipping the encode keeps
 * generation dependency-free and identical in Node and the browser.
 */
export const generateSyntheticHead = (spec: SyntheticHeadSpec): PixelBuffer => {
  const random = createDeterministicRandom(spec.seed);
  const data = new Uint8ClampedArray(spec.widthPx * spec.heightPx * CHANNELS_PER_PIXEL);

  for (let y = 0; y < spec.heightPx; y += 1) {
    for (let x = 0; x < spec.widthPx; x += 1) {
      const base = isInsideHead(x, y, spec) ? spec.headLuminance : spec.backgroundLuminance;
      const value = clampChannel(base + deterministicNoise(random, spec.noiseAmplitude));
      const offset = (y * spec.widthPx + x) * CHANNELS_PER_PIXEL;

      data[offset + CHANNEL_OFFSET_RED] = value;
      data[offset + CHANNEL_OFFSET_GREEN] = value;
      data[offset + CHANNEL_OFFSET_BLUE] = value;
      data[offset + CHANNEL_OFFSET_ALPHA] = ALPHA_OPAQUE;
    }
  }

  return { width: spec.widthPx, height: spec.heightPx, data };
};
