import {
  CHANNEL_MAX,
  CHANNEL_MIN,
  CHANNEL_OFFSET_RED,
  CHANNELS_PER_PIXEL,
} from './pixel-format.constants';
import type { PixelBuffer } from './synthetic-head.types';

export const luminanceAt = (buffer: PixelBuffer, x: number, y: number): number =>
  buffer.data[(y * buffer.width + x) * CHANNELS_PER_PIXEL + CHANNEL_OFFSET_RED] ?? 0;

/**
 * Finds the topmost row whose luminance differs from the background by more
 * than `threshold`.
 *
 * This is the naive crown detector — the exact approach the real segmentation
 * work must beat. Keeping it here lets the fixtures verify themselves, and lets
 * PR #14 measure its own improvement against a stated baseline rather than a
 * vague sense that it got better.
 */
export const findTopmostSubjectRow = (
  buffer: PixelBuffer,
  backgroundLuminance: number,
  threshold: number,
): number | undefined => {
  for (let y = 0; y < buffer.height; y += 1) {
    for (let x = 0; x < buffer.width; x += 1) {
      if (Math.abs(luminanceAt(buffer, x, y) - backgroundLuminance) > threshold) return y;
    }
  }
  return undefined;
};

export const findBottommostSubjectRow = (
  buffer: PixelBuffer,
  backgroundLuminance: number,
  threshold: number,
): number | undefined => {
  for (let y = buffer.height - 1; y >= 0; y -= 1) {
    for (let x = 0; x < buffer.width; x += 1) {
      if (Math.abs(luminanceAt(buffer, x, y) - backgroundLuminance) > threshold) return y;
    }
  }
  return undefined;
};

export const meanLuminance = (buffer: PixelBuffer): number => {
  let total = 0;
  const pixelCount = buffer.width * buffer.height;

  for (let index = 0; index < pixelCount; index += 1) {
    total += buffer.data[index * CHANNELS_PER_PIXEL + CHANNEL_OFFSET_RED] ?? 0;
  }
  return total / pixelCount;
};

/** Share of pixels at the extremes of the range — the exposure-clipping check. */
export const clippedPixelRatio = (buffer: PixelBuffer): number => {
  const pixelCount = buffer.width * buffer.height;
  let clipped = 0;

  for (let index = 0; index < pixelCount; index += 1) {
    const value = buffer.data[index * CHANNELS_PER_PIXEL + CHANNEL_OFFSET_RED] ?? 0;
    if (value === CHANNEL_MIN || value === CHANNEL_MAX) clipped += 1;
  }
  return clipped / pixelCount;
};
