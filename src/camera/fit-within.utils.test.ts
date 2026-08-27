import { describe, expect, it } from 'vitest';
import { fitWithin } from './fit-within.utils';

describe('fitWithin', () => {
  it('leaves a size that already fits alone', () => {
    expect(fitWithin(640, 480, 1_600)).toEqual({ width: 640, height: 480 });
  });

  it('never enlarges', () => {
    // Scaling a 320x240 webcam up to the budget would hand the detector four
    // times the pixels and not one extra bit of detail, on exactly the machine
    // that had the worst camera to begin with.
    expect(fitWithin(320, 240, 1_600)).toEqual({ width: 320, height: 240 });
  });

  it('scales by the longest edge, whichever one that is', () => {
    expect(fitWithin(1_920, 1_080, 960)).toEqual({ width: 960, height: 540 });
  });

  it('scales a portrait frame by its height', () => {
    expect(fitWithin(1_080, 1_920, 960)).toEqual({ width: 540, height: 960 });
  });

  it('leaves a size exactly at the budget alone', () => {
    expect(fitWithin(1_600, 900, 1_600)).toEqual({ width: 1_600, height: 900 });
  });

  it('returns whole pixels, because a canvas cannot be 0.4 wide', () => {
    const size = fitWithin(1_001, 333, 100);

    expect(Number.isInteger(size.width)).toBe(true);
    expect(Number.isInteger(size.height)).toBe(true);
  });

  it('never rounds an edge away to nothing', () => {
    // getImageData on a zero-sized canvas throws, so an extreme aspect ratio
    // has to floor at one pixel rather than at none.
    expect(fitWithin(4_000, 3, 100).height).toBe(1);
  });
});
