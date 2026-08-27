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
import type { Rgb } from '@/quality/luminance.utils';
import type { PixelBuffer } from './synthetic-head.types';

/**
 * Renders a face with tonal modelling, at a controllable skin tone.
 *
 * Built specifically for the fairness requirement. The existing head generator
 * paints a flat disc of one luminance, which has no modelling and therefore
 * cannot express whether a photograph was well exposed — every such face reads
 * as flat.
 *
 * The parameters here separate two things a naive check conflates:
 *
 *   baseTone       WHO is in the photograph. Skin tone, and nothing else.
 *   modellingRange HOW WELL it was lit. The spread of tones the lighting
 *                  produces across the face, which is what exposure is about.
 *
 * Holding modellingRange fixed and sweeping baseTone produces a set of
 * photographs that are equally well exposed and of visibly different people.
 * Any exposure check worth shipping returns the same verdict for all of them.
 */

export interface TonedFaceSpec {
  readonly widthPx: number;
  readonly heightPx: number;
  readonly centreX: number;
  readonly centreY: number;
  readonly faceRadiusX: number;
  readonly faceRadiusY: number;

  /** Mean face luminance before lighting. This is the skin tone. */
  readonly baseTone: number;
  /** Spread of luminance the lighting creates across the face. */
  readonly modellingRange: number;
  /** Added to every pixel, face and background. Over- or under-exposure. */
  readonly exposureBias: number;

  readonly background: Rgb;
  /** Luminance difference between the left and right edges of the background. */
  readonly backgroundGradient: number;
  /** Amplitude of a repeating pattern in the background, e.g. a textured wall. */
  readonly backgroundPatternAmplitude: number;
  /** Radius, in pixels, of a box blur applied at the end. Zero for sharp. */
  readonly blurRadius: number;
  readonly noiseAmplitude: number;
  readonly seed: number;
}

export const NEUTRAL_FACE_SPEC: TonedFaceSpec = {
  widthPx: 200,
  heightPx: 260,
  centreX: 100,
  centreY: 110,
  faceRadiusX: 55,
  faceRadiusY: 75,
  baseTone: 140,
  modellingRange: 60,
  exposureBias: 0,
  background: { red: 240, green: 240, blue: 240 },
  backgroundGradient: 0,
  backgroundPatternAmplitude: 0,
  blurRadius: 0,
  noiseAmplitude: 2,
  seed: 1,
};

/**
 * Skin tones spanning the range a real user base has.
 *
 * Six points rather than two, because a check can pass at the extremes and
 * fail in the middle. Chosen so that at neutral exposure none of them clips,
 * which is what makes a difference in verdict across them a fairness bug
 * rather than physics.
 */
export const SKIN_TONE_SWEEP: readonly number[] = [55, 80, 110, 145, 180, 205];

const clamp = (value: number): number =>
  Math.min(CHANNEL_MAX, Math.max(CHANNEL_MIN, Math.round(value)));

const insideFace = (x: number, y: number, spec: TonedFaceSpec): boolean => {
  const normalisedX = (x - spec.centreX) / spec.faceRadiusX;
  const normalisedY = (y - spec.centreY) / spec.faceRadiusY;
  return normalisedX * normalisedX + normalisedY * normalisedY <= 1;
};

/**
 * Lighting across the face, from -0.5 on the shadow side to +0.5 on the lit.
 *
 * A diagonal ramp rather than a flat value, because that is what a face lit
 * from one side looks like and it is the modelling an exposure check reads.
 */
const modellingAt = (x: number, y: number, spec: TonedFaceSpec): number => {
  const acrossFace = (x - (spec.centreX - spec.faceRadiusX)) / (spec.faceRadiusX * HALF);
  const downFace = (y - (spec.centreY - spec.faceRadiusY)) / (spec.faceRadiusY * HALF);

  return (acrossFace * 0.7 + downFace * 0.3) - 0.5;
};

const PATTERN_PERIOD_PX = 12;

const backgroundAt = (x: number, y: number, spec: TonedFaceSpec): Rgb => {
  // Divisor floored rather than branched on. A one-pixel-wide image is not a
  // fixture anyone builds, and guarding for it adds a case no test can reach.
  const acrossFrame = x / Math.max(1, spec.widthPx - 1);
  const gradient = (acrossFrame - 0.5) * spec.backgroundGradient;
  const pattern =
    spec.backgroundPatternAmplitude === 0
      ? 0
      : Math.sin((x / PATTERN_PERIOD_PX) * Math.PI) *
        Math.sin((y / PATTERN_PERIOD_PX) * Math.PI) *
        spec.backgroundPatternAmplitude;

  const shift = gradient + pattern;
  return {
    red: spec.background.red + shift,
    green: spec.background.green + shift,
    blue: spec.background.blue + shift,
  };
};

const boxBlur = (buffer: PixelBuffer, radius: number): PixelBuffer => {
  if (radius <= 0) return buffer;

  const output = new Uint8ClampedArray(buffer.data.length);

  for (let y = 0; y < buffer.height; y += 1) {
    for (let x = 0; x < buffer.width; x += 1) {
      let red = 0;
      let green = 0;
      let blue = 0;
      let samples = 0;

      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const sampleX = x + dx;
          const sampleY = y + dy;
          if (sampleX < 0 || sampleY < 0 || sampleX >= buffer.width || sampleY >= buffer.height) {
            continue;
          }

          const offset = (sampleY * buffer.width + sampleX) * CHANNELS_PER_PIXEL;
          red += Number(buffer.data[offset + CHANNEL_OFFSET_RED]);
          green += Number(buffer.data[offset + CHANNEL_OFFSET_GREEN]);
          blue += Number(buffer.data[offset + CHANNEL_OFFSET_BLUE]);
          samples += 1;
        }
      }

      const offset = (y * buffer.width + x) * CHANNELS_PER_PIXEL;
      output[offset + CHANNEL_OFFSET_RED] = red / samples;
      output[offset + CHANNEL_OFFSET_GREEN] = green / samples;
      output[offset + CHANNEL_OFFSET_BLUE] = blue / samples;
      output[offset + CHANNEL_OFFSET_ALPHA] = ALPHA_OPAQUE;
    }
  }

  return { width: buffer.width, height: buffer.height, data: output };
};

export const buildTonedFace = (overrides: Partial<TonedFaceSpec> = {}): PixelBuffer => {
  const spec = { ...NEUTRAL_FACE_SPEC, ...overrides };
  const random = createDeterministicRandom(spec.seed);
  const data = new Uint8ClampedArray(spec.widthPx * spec.heightPx * CHANNELS_PER_PIXEL);

  for (let y = 0; y < spec.heightPx; y += 1) {
    for (let x = 0; x < spec.widthPx; x += 1) {
      const noise = deterministicNoise(random, spec.noiseAmplitude);
      const colour = insideFace(x, y, spec)
        ? (() => {
            const lit = spec.baseTone + modellingAt(x, y, spec) * spec.modellingRange;
            return { red: lit, green: lit, blue: lit };
          })()
        : backgroundAt(x, y, spec);

      const offset = (y * spec.widthPx + x) * CHANNELS_PER_PIXEL;
      data[offset + CHANNEL_OFFSET_RED] = clamp(colour.red + spec.exposureBias + noise);
      data[offset + CHANNEL_OFFSET_GREEN] = clamp(colour.green + spec.exposureBias + noise);
      data[offset + CHANNEL_OFFSET_BLUE] = clamp(colour.blue + spec.exposureBias + noise);
      data[offset + CHANNEL_OFFSET_ALPHA] = ALPHA_OPAQUE;
    }
  }

  return boxBlur({ width: spec.widthPx, height: spec.heightPx, data }, spec.blurRadius);
};

/** True when the pixel at `index` falls inside the face ellipse. */
export const faceMembership = (
  spec: TonedFaceSpec = NEUTRAL_FACE_SPEC,
): ((index: number) => boolean) => {
  const merged = { ...NEUTRAL_FACE_SPEC, ...spec };

  return (index: number): boolean =>
    insideFace(index % merged.widthPx, Math.floor(index / merged.widthPx), merged);
};
