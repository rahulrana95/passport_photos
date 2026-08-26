import { describe, expect, it } from 'vitest';
import {
  clippedPixelRatio,
  findBottommostSubjectRow,
  findTopmostSubjectRow,
  luminanceAt,
  meanLuminance,
} from './measure-buffer.utils';
import type { PixelBuffer } from './synthetic-head.types';

const uniformBuffer = (width: number, height: number, value: number): PixelBuffer => {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    data[index * 4] = value;
    data[index * 4 + 1] = value;
    data[index * 4 + 2] = value;
    data[index * 4 + 3] = 255;
  }
  return { width, height, data };
};

describe('luminanceAt', () => {
  it('reads the red channel of the addressed pixel', () => {
    expect(luminanceAt(uniformBuffer(4, 4, 128), 2, 2)).toBe(128);
  });

  it('returns zero for a coordinate outside the buffer rather than undefined', () => {
    expect(luminanceAt(uniformBuffer(4, 4, 128), 99, 99)).toBe(0);
  });
});

describe('subject row detection on a blank image', () => {
  it('finds no topmost row when nothing differs from the background', () => {
    expect(findTopmostSubjectRow(uniformBuffer(8, 8, 200), 200, 10)).toBeUndefined();
  });

  it('finds no bottommost row either', () => {
    expect(findBottommostSubjectRow(uniformBuffer(8, 8, 200), 200, 10)).toBeUndefined();
  });
});

describe('meanLuminance', () => {
  it('averages a uniform buffer to its own value', () => {
    expect(meanLuminance(uniformBuffer(6, 6, 90))).toBe(90);
  });
});

describe('clippedPixelRatio', () => {
  it('reports nothing clipped in the middle of the range', () => {
    expect(clippedPixelRatio(uniformBuffer(6, 6, 128))).toBe(0);
  });

  it('reports everything clipped at pure white', () => {
    expect(clippedPixelRatio(uniformBuffer(6, 6, 255))).toBe(1);
  });

  it('reports everything clipped at pure black', () => {
    expect(clippedPixelRatio(uniformBuffer(6, 6, 0))).toBe(1);
  });
});

describe('a truncated buffer', () => {
  /**
   * A real failure mode, not a coverage exercise: a partial decode or a
   * mis-sized allocation produces a buffer shorter than its declared
   * dimensions. These must degrade rather than throw, so the caller sees an
   * implausible measurement instead of a crash mid-analysis.
   */
  const truncated: PixelBuffer = {
    width: 8,
    height: 8,
    data: new Uint8ClampedArray(8 * 4),
  };

  it('averages missing pixels as zero rather than throwing', () => {
    expect(meanLuminance(truncated)).toBe(0);
  });

  it('counts missing pixels as clipped-dark rather than throwing', () => {
    expect(clippedPixelRatio(truncated)).toBe(1);
  });
});
