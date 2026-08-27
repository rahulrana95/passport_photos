import { createDeterministicRandom } from './deterministic-random.utils';
import { CHANNEL_MAX, CHANNEL_MIN, HALF } from './pixel-format.constants';

/**
 * Builds segmentation masks carrying specific, named defects.
 *
 * The plan calls crown detection the riskiest work in the project, and asks for
 * the hard cases before the implementation. This is that corpus.
 *
 * Real photographs were considered and rejected. The usable face datasets —
 * FFHQ, CelebA, UTKFace, FairFace — are all non-commercial licensed, and
 * beyond the licence, committing strangers' faces to a repository whose product
 * promises the photo never leaves the device is indefensible. More importantly
 * they would be the wrong test: hand-measuring a crown from a photograph gives
 * ground truth accurate to a few pixels and arguable at the edges, while a
 * constructed mask has a crown row that is exactly known. A failure here is
 * always the code, never a disputed measurement.
 *
 * What a constructed mask cannot tell us is whether the segmentation model
 * produces masks like these. That is a question for a real browser and a real
 * model, and it is recorded as owed rather than pretended.
 */

export interface MaskBuffer {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

export interface HeadMaskSpec {
  readonly widthPx: number;
  readonly heightPx: number;
  /** Row of the topmost point of the skull. May be negative — crown cropped. */
  readonly crownY: number;
  readonly chinY: number;
  readonly centreX: number;
  readonly headWidthPx: number;
  /** Extra rows of hat, turban or hijab sitting above the crown. */
  readonly coveringPx: number;
  /** Rows of hair volume above the skull — a halo, not part of the head. */
  readonly hairHaloPx: number;
  /** Shoulders below this row, joined to the head, as a real mask has. */
  readonly shouldersY: number;
  readonly seed: number;
}

export const BASE_MASK_SPEC: HeadMaskSpec = {
  widthPx: 300,
  heightPx: 400,
  crownY: 60,
  chinY: 260,
  centreX: 150,
  headWidthPx: 140,
  coveringPx: 0,
  hairHaloPx: 0,
  shouldersY: 320,
  seed: 1,
};

const setPixel = (mask: MaskBuffer, x: number, y: number, value: number): void => {
  if (x < 0 || y < 0 || x >= mask.width || y >= mask.height) return;
  mask.data[y * mask.width + x] = value;
};

/**
 * Reads a pixel, treating anything outside the frame as background.
 *
 * The bounds check is load-bearing, not defensive: at x = 0 the expression
 * `y * width + x - 1` is a perfectly valid index into the end of the previous
 * row, so an unchecked read wraps around the image instead of falling off it.
 *
 * The value is converted rather than defaulted. Inside the bounds it is always
 * a number; `Number()` says so without adding a branch for an absence the
 * check above has already ruled out.
 */
const pixelAt = (mask: MaskBuffer, x: number, y: number): number => {
  if (x < 0 || y < 0 || x >= mask.width || y >= mask.height) return CHANNEL_MIN;
  return Number(mask.data[y * mask.width + x]);
};

const insideHead = (x: number, y: number, spec: HeadMaskSpec): boolean => {
  const centreY = (spec.crownY + spec.chinY) / HALF;
  const semiMajor = (spec.chinY - spec.crownY) / HALF;
  const semiMinor = spec.headWidthPx / HALF;
  if (semiMajor <= 0 || semiMinor <= 0) return false;

  const normalisedX = (x - spec.centreX) / semiMinor;
  const normalisedY = (y - centreY) / semiMajor;
  return normalisedX * normalisedX + normalisedY * normalisedY <= 1;
};

/**
 * Renders a clean mask: head, optional covering, optional hair halo, shoulders.
 *
 * Shoulders matter. A head alone is separable by any algorithm; a head joined
 * to a torso is what a real mask looks like, and it is what makes "find the top
 * of the head" harder than "find the top of the mask".
 */
export const buildHeadMask = (overrides: Partial<HeadMaskSpec> = {}): MaskBuffer => {
  const spec = { ...BASE_MASK_SPEC, ...overrides };
  const mask: MaskBuffer = {
    width: spec.widthPx,
    height: spec.heightPx,
    data: new Uint8ClampedArray(spec.widthPx * spec.heightPx),
  };

  const halfWidth = spec.headWidthPx / HALF;

  for (let y = 0; y < spec.heightPx; y += 1) {
    for (let x = 0; x < spec.widthPx; x += 1) {
      const isHead = insideHead(x, y, spec);

      // A covering follows the head's widest section rather than tapering,
      // which is exactly why the topmost opaque row is the hat and not the
      // skull.
      const isCovering =
        spec.coveringPx > 0 &&
        y >= spec.crownY - spec.coveringPx &&
        y < spec.crownY &&
        Math.abs(x - spec.centreX) <= halfWidth;

      // A hair halo is a dome, narrowing as it rises. Built as a rectangle it
      // would be a flat-topped shape — which is a hat, whatever the variable
      // is called, and the detector would be right to say so.
      const haloRise = spec.crownY - y;
      const haloProgress = spec.hairHaloPx > 0 ? haloRise / spec.hairHaloPx : 1;
      const haloWidth = halfWidth * 0.9 * Math.sqrt(Math.max(0, 1 - haloProgress * haloProgress));
      const isHalo =
        spec.hairHaloPx > 0 &&
        y >= spec.crownY - spec.hairHaloPx &&
        y < spec.crownY &&
        Math.abs(x - spec.centreX) <= haloWidth;

      const isShoulders = y >= spec.shouldersY;

      if (isHead || isCovering || isHalo || isShoulders) {
        setPixel(mask, x, y, CHANNEL_MAX);
      }
    }
  }

  // Neck, so the head and shoulders are one connected component.
  const neckHalfWidth = spec.headWidthPx / 4;
  for (let y = spec.chinY; y < spec.shouldersY; y += 1) {
    for (let x = spec.centreX - neckHalfWidth; x <= spec.centreX + neckHalfWidth; x += 1) {
      setPixel(mask, Math.round(x), y, CHANNEL_MAX);
    }
  }

  return mask;
};

/** Scatters isolated subject pixels across the background. */
export const addSpeckle = (mask: MaskBuffer, count: number, seed: number): MaskBuffer => {
  const random = createDeterministicRandom(seed);
  const copy = { ...mask, data: new Uint8ClampedArray(mask.data) };

  for (let index = 0; index < count; index += 1) {
    const x = Math.floor(random() * mask.width);
    const y = Math.floor(random() * mask.height);
    // Only into background, so speckle never eats into the subject. Compared
    // rather than defaulted: an out-of-range read is undefined, which is not
    // equal to CHANNEL_MIN and is therefore skipped, with no branch to cover
    // for a case the coordinates cannot produce.
    if (copy.data[y * copy.width + x] === CHANNEL_MIN) setPixel(copy, x, y, CHANNEL_MAX);
  }

  return copy;
};

/** Punches a rectangular hole inside the subject, as a low-confidence model does. */
export const addHole = (
  mask: MaskBuffer,
  x: number,
  y: number,
  width: number,
  height: number,
): MaskBuffer => {
  const copy = { ...mask, data: new Uint8ClampedArray(mask.data) };

  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) {
      setPixel(copy, column, row, CHANNEL_MIN);
    }
  }

  return copy;
};

/**
 * Adds a detached blob — an earring, a glasses arm, a second person's head.
 *
 * Detached is the point. It is a separate connected component, and an
 * algorithm that takes the topmost subject pixel anywhere in the frame will
 * measure this instead of the head.
 */
export const addBlob = (
  mask: MaskBuffer,
  centreX: number,
  centreY: number,
  radius: number,
): MaskBuffer => {
  const copy = { ...mask, data: new Uint8ClampedArray(mask.data) };

  for (let y = centreY - radius; y <= centreY + radius; y += 1) {
    for (let x = centreX - radius; x <= centreX + radius; x += 1) {
      const dx = x - centreX;
      const dy = y - centreY;
      if (dx * dx + dy * dy <= radius * radius) setPixel(copy, x, y, CHANNEL_MAX);
    }
  }

  return copy;
};

/** Erodes the mask's edge, reproducing a model that under-segments hair. */
export const erodeEdge = (mask: MaskBuffer, passes: number): MaskBuffer => {
  let current = { ...mask, data: new Uint8ClampedArray(mask.data) };

  for (let pass = 0; pass < passes; pass += 1) {
    const next = { ...current, data: new Uint8ClampedArray(current.data) };

    for (let y = 0; y < current.height; y += 1) {
      for (let x = 0; x < current.width; x += 1) {
        if (pixelAt(current, x, y) === CHANNEL_MIN) continue;

        const hasBackgroundNeighbour =
          pixelAt(current, x - 1, y) === CHANNEL_MIN ||
          pixelAt(current, x + 1, y) === CHANNEL_MIN ||
          pixelAt(current, x, y - 1) === CHANNEL_MIN ||
          pixelAt(current, x, y + 1) === CHANNEL_MIN;

        if (hasBackgroundNeighbour) setPixel(next, x, y, CHANNEL_MIN);
      }
    }

    current = next;
  }

  return current;
};
