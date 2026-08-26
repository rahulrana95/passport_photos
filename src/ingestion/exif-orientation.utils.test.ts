import { describe, expect, it } from 'vitest';
import { EXIF_ORIENTATIONS } from './exif-orientation.constants';
import {
  DEFAULT_ORIENTATION,
  isExifOrientation,
  orientedDimensions,
  transformForOrientation,
} from './exif-orientation.utils';

describe('isExifOrientation', () => {
  it('accepts the eight defined values', () => {
    for (const orientation of EXIF_ORIENTATIONS) {
      expect(isExifOrientation(orientation), String(orientation)).toBe(true);
    }
  });

  it('rejects everything else, including the tempting neighbours', () => {
    for (const value of [0, 9, -1, 1.5, Number.NaN, 65_536]) {
      expect(isExifOrientation(value), String(value)).toBe(false);
    }
  });
});

describe('the transform for each orientation', () => {
  it('treats orientation 1 as no work at all', () => {
    expect(transformForOrientation(DEFAULT_ORIENTATION)).toEqual({
      rotateDegrees: 0,
      mirrorHorizontally: false,
      swapsAxes: false,
    });
  });

  it('mirrors exactly the four mirrored orientations', () => {
    // 2, 4, 5 and 7 are the ones every naive implementation drops: rotating by
    // the obvious angle produces a picture that looks upright and is laterally
    // flipped, so every asymmetry in the face is on the wrong side.
    const mirrored = EXIF_ORIENTATIONS.filter(
      (orientation) => transformForOrientation(orientation).mirrorHorizontally,
    );

    expect(mirrored).toEqual([2, 4, 5, 7]);
  });

  it('swaps the axes for exactly the quarter-turn orientations', () => {
    const swapping = EXIF_ORIENTATIONS.filter(
      (orientation) => transformForOrientation(orientation).swapsAxes,
    );

    expect(swapping).toEqual([5, 6, 7, 8]);
  });

  it('gives every orientation a distinct transform', () => {
    // 5 and 7 differ only in rotation direction after the same mirror. A
    // collision here means two different photos correct to the same wrong
    // result.
    const seen = EXIF_ORIENTATIONS.map((orientation) => {
      const transform = transformForOrientation(orientation);
      return `${transform.rotateDegrees}:${String(transform.mirrorHorizontally)}`;
    });

    expect(new Set(seen).size).toBe(EXIF_ORIENTATIONS.length);
  });

  it('only ever rotates by a right angle', () => {
    for (const orientation of EXIF_ORIENTATIONS) {
      expect([0, 90, 180, 270]).toContain(transformForOrientation(orientation).rotateDegrees);
    }
  });
});

describe('orientedDimensions', () => {
  it('leaves dimensions alone for the upright orientations', () => {
    for (const orientation of [1, 2, 3, 4] as const) {
      expect(orientedDimensions(4032, 3024, orientation), String(orientation)).toEqual({
        widthPx: 4032,
        heightPx: 3024,
      });
    }
  });

  it('exchanges width and height for the quarter turns', () => {
    // A portrait phone photo is stored 4032x3024 with orientation 6. Measuring
    // head height against the stored height rather than the corrected one is
    // wrong by the whole aspect ratio.
    for (const orientation of [5, 6, 7, 8] as const) {
      expect(orientedDimensions(4032, 3024, orientation), String(orientation)).toEqual({
        widthPx: 3024,
        heightPx: 4032,
      });
    }
  });

  it('is its own inverse when applied twice for a quarter turn', () => {
    const once = orientedDimensions(4032, 3024, 6);
    const twice = orientedDimensions(once.widthPx, once.heightPx, 6);

    expect(twice).toEqual({ widthPx: 4032, heightPx: 3024 });
  });

  it('leaves a square image square whatever the orientation', () => {
    for (const orientation of EXIF_ORIENTATIONS) {
      expect(orientedDimensions(1000, 1000, orientation), String(orientation)).toEqual({
        widthPx: 1000,
        heightPx: 1000,
      });
    }
  });
});
