import { describe, expect, it } from 'vitest';
import {
  ALPHA_OPAQUE,
  CHANNEL_OFFSET_ALPHA,
  CHANNEL_OFFSET_RED,
  CHANNELS_PER_PIXEL,
} from '@/testing/fixtures/pixel-format.constants';
import { resampleArea } from './resample-area.utils';
import type { PixelBuffer } from '@/testing/fixtures/synthetic-head.types';

/** A buffer whose every channel holds the value the callback returns. */
const grey = (width: number, height: number, at: (x: number, y: number) => number): PixelBuffer => {
  const data = new Uint8ClampedArray(width * height * CHANNELS_PER_PIXEL);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * CHANNELS_PER_PIXEL;
      const value = at(x, y);
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + CHANNEL_OFFSET_ALPHA] = ALPHA_OPAQUE;
    }
  }

  return { width, height, data };
};

const redAt = (buffer: PixelBuffer, x: number, y: number): number =>
  Number(buffer.data[(y * buffer.width + x) * CHANNELS_PER_PIXEL + CHANNEL_OFFSET_RED]);

describe('cropping and resizing in one pass', () => {
  it('produces the requested size', () => {
    const output = resampleArea(
      grey(100, 100, () => 128),
      { x: 10, y: 10, widthPx: 80, heightPx: 40 },
      { widthPx: 20, heightPx: 10 },
    );

    expect(output.width).toBe(20);
    expect(output.height).toBe(10);
  });

  it('leaves a flat region exactly as it found it', () => {
    // The simplest property, and the one that catches a weighting bug: an
    // average of identical values is that value, whatever the weights.
    const output = resampleArea(
      grey(64, 64, () => 200),
      { x: 0, y: 0, widthPx: 64, heightPx: 64 },
      { widthPx: 16, heightPx: 16 },
    );

    expect(redAt(output, 5, 5)).toBe(200);
  });

  it('averages the pixels each output pixel stands for', () => {
    // A two-to-one reduction of a checkerboard: every output pixel covers two
    // black and two white, so every one of them is mid grey. Sampling one of
    // the four instead would produce a checkerboard half the size.
    const checker = grey(8, 8, (x, y) => ((x + y) % 2 === 0 ? 0 : 200));
    const output = resampleArea(
      checker,
      { x: 0, y: 0, widthPx: 8, heightPx: 8 },
      { widthPx: 4, heightPx: 4 },
    );

    for (let y = 0; y < 4; y += 1) {
      for (let x = 0; x < 4; x += 1) {
        expect(redAt(output, x, y), `${x},${y}`).toBe(100);
      }
    }
  });

  it('reads only from inside the crop', () => {
    // Everything outside the crop is bright; everything inside is dark. A
    // sampler reaching past the crop's edge would lift the output.
    const source = grey(40, 40, (x, y) => (x >= 10 && x < 30 && y >= 10 && y < 30 ? 20 : 240));
    const output = resampleArea(
      source,
      { x: 10, y: 10, widthPx: 20, heightPx: 20 },
      { widthPx: 5, heightPx: 5 },
    );

    for (let index = 0; index < 5; index += 1) {
      expect(redAt(output, index, index)).toBe(20);
    }
  });

  it('takes the crop from the right place', () => {
    // Left half dark, right half bright. Cropping the right half must produce
    // the bright one — an off-by-one in the offset would blend the two.
    const source = grey(40, 40, (x) => (x < 20 ? 10 : 250));
    const output = resampleArea(
      source,
      { x: 20, y: 0, widthPx: 20, heightPx: 40 },
      { widthPx: 4, heightPx: 8 },
    );

    expect(redAt(output, 0, 0)).toBe(250);
  });

  it('writes every pixel opaque', () => {
    const output = resampleArea(
      grey(16, 16, () => 100),
      { x: 0, y: 0, widthPx: 16, heightPx: 16 },
      { widthPx: 4, heightPx: 4 },
    );

    expect(output.data[CHANNEL_OFFSET_ALPHA]).toBe(ALPHA_OPAQUE);
  });

  it('stays inside the source when the crop reaches its edge', () => {
    const output = resampleArea(
      grey(10, 10, () => 77),
      { x: 0, y: 0, widthPx: 10, heightPx: 10 },
      { widthPx: 3, heightPx: 3 },
    );

    expect(redAt(output, 2, 2)).toBe(77);
  });

  it('degrades to nearest-neighbour when asked to enlarge', () => {
    // Not a supported case: the geometry engine refuses to plan a crop that
    // would need upscaling, because inventing detail is itself a rejection
    // reason. Asserted so the behaviour is known rather than assumed.
    const source = grey(2, 2, (x) => (x === 0 ? 0 : 200));
    const output = resampleArea(
      source,
      { x: 0, y: 0, widthPx: 2, heightPx: 2 },
      { widthPx: 4, heightPx: 4 },
    );

    expect(redAt(output, 0, 0)).toBe(0);
    expect(redAt(output, 3, 0)).toBe(200);
  });
});
