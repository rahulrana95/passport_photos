import { describe, expect, it } from 'vitest';
import { BAND_TOLERANCE_MM } from '@/constants/measurement.constants';
import { bandMidpoint, evaluateBand, InvalidBandError, isValidBand, scaleBand } from './band.utils';

const HEAD_HEIGHT: { min: number; max: number } = { min: 25.4, max: 34.9 };

describe('evaluateBand', () => {
  it('passes a measurement inside the band', () => {
    const result = evaluateBand(30, HEAD_HEIGHT);

    expect(result.status).toBe('within');
    expect(result.delta).toBe(0);
    expect(result.scaleToBand).toBe(1);
  });

  it('reports how far below the band a measurement falls', () => {
    const result = evaluateBand(21.4, HEAD_HEIGHT);

    expect(result.status).toBe('below');
    expect(result.delta).toBeCloseTo(-4, 5);
  });

  it('reports how far above the band a measurement falls', () => {
    const result = evaluateBand(40, HEAD_HEIGHT);

    expect(result.status).toBe('above');
    expect(result.delta).toBeCloseTo(5.1, 5);
  });

  it('gives a multiplier that turns the measurement into a physical instruction', () => {
    // A head that must grow by ~1.19x means the subject moves roughly 19%
    // closer to the camera. That is the whole point of scaleToBand.
    const result = evaluateBand(21.4, HEAD_HEIGHT);

    expect(result.scaleToBand).toBeCloseTo(HEAD_HEIGHT.min / 21.4, 5);
    expect(result.scaleToBand).toBeGreaterThan(1);
  });

  it('never rounds the measurement it was given', () => {
    // Rounding 24.996 up to 25.0 would report a pass we did not measure.
    const result = evaluateBand(24.996, HEAD_HEIGHT, 0);

    expect(result.value).toBe(24.996);
    expect(result.status).toBe('below');
  });

  it('admits a measurement sitting just outside the band, within tolerance', () => {
    // Landmark detection carries sub-pixel jitter. A value on the boundary must
    // not flip between runs.
    const justBelow = HEAD_HEIGHT.min - BAND_TOLERANCE_MM / 2;

    expect(evaluateBand(justBelow, HEAD_HEIGHT).status).toBe('within');
  });

  it('still fails a measurement beyond the tolerance', () => {
    const wellBelow = HEAD_HEIGHT.min - BAND_TOLERANCE_MM * 10;

    expect(evaluateBand(wellBelow, HEAD_HEIGHT).status).toBe('below');
  });

  it('keeps the tolerance far tighter than any published requirement', () => {
    const bandWidth = HEAD_HEIGHT.max - HEAD_HEIGHT.min;
    expect(BAND_TOLERANCE_MM).toBeLessThan(bandWidth / 10);
  });

  it('accepts exactly the lower and upper edges', () => {
    expect(evaluateBand(HEAD_HEIGHT.min, HEAD_HEIGHT).status).toBe('within');
    expect(evaluateBand(HEAD_HEIGHT.max, HEAD_HEIGHT).status).toBe('within');
  });

  it('handles a zero measurement without producing NaN', () => {
    const result = evaluateBand(0, HEAD_HEIGHT);

    expect(result.status).toBe('below');
    expect(result.scaleToBand).toBe(Number.POSITIVE_INFINITY);
  });

  it('rejects an inverted band rather than silently evaluating against it', () => {
    expect(() => evaluateBand(30, { min: 40, max: 20 })).toThrow(InvalidBandError);
  });

  it('rejects a non-finite measurement', () => {
    expect(() => evaluateBand(Number.NaN, HEAD_HEIGHT)).toThrow(TypeError);
    expect(() => evaluateBand(Number.POSITIVE_INFINITY, HEAD_HEIGHT)).toThrow(TypeError);
  });

  it('accepts a degenerate band where min equals max', () => {
    expect(evaluateBand(30, { min: 30, max: 30 }).status).toBe('within');
  });

  it('accepts a band starting at zero, such as a shadow gradient limit', () => {
    expect(evaluateBand(0.2, { min: 0, max: 0.15 }, 0).status).toBe('above');
    expect(evaluateBand(0.1, { min: 0, max: 0.15 }, 0).status).toBe('within');
  });

  it('rejects a band with a negative edge', () => {
    expect(() => evaluateBand(5, { min: -10, max: 10 })).toThrow(InvalidBandError);
  });

  it('never fails a value it reports as within, across the whole band', () => {
    // The property that matters most: our own arithmetic must not reject a
    // photo the authority would accept. Swept rather than sampled.
    const steps = 500;
    for (let i = 0; i <= steps; i += 1) {
      const value = HEAD_HEIGHT.min + ((HEAD_HEIGHT.max - HEAD_HEIGHT.min) * i) / steps;
      expect(evaluateBand(value, HEAD_HEIGHT).status).toBe('within');
    }
  });

  it('is monotonic: a larger value never moves from above back to within', () => {
    let seenAbove = false;
    for (let value = 0; value <= 60; value += 0.05) {
      const status = evaluateBand(value, HEAD_HEIGHT).status;
      if (status === 'above') seenAbove = true;
      if (seenAbove) expect(status).toBe('above');
    }
  });
});

describe('isValidBand', () => {
  it.each([
    [{ min: 1, max: 2 }, true],
    [{ min: 2, max: 2 }, true],
    [{ min: 3, max: 2 }, false],
    [{ min: Number.NaN, max: 2 }, false],
    [{ min: 1, max: Number.POSITIVE_INFINITY }, false],
    // A negative edge cannot describe a length, a proportion or a standard
    // deviation, so it is a bug rather than a legitimate range.
    [{ min: -5, max: 10 }, false],
    [{ min: 0, max: 0.15 }, true],
  ])('%o -> %s', (band, expected) => {
    expect(isValidBand(band)).toBe(expected);
  });
});

describe('bandMidpoint', () => {
  it('returns the centre, which is what a crop should aim for', () => {
    expect(bandMidpoint(HEAD_HEIGHT)).toBeCloseTo(30.15, 5);
  });

  it('rejects an inverted band', () => {
    expect(() => bandMidpoint({ min: 5, max: 1 })).toThrow(InvalidBandError);
  });
});

describe('scaleBand', () => {
  it('scales both edges by the same factor', () => {
    expect(scaleBand({ min: 10, max: 20 }, 2)).toEqual({ min: 20, max: 40 });
  });

  it('cannot invert a band through conversion', () => {
    const scaled = scaleBand(HEAD_HEIGHT, 11.811);
    expect(scaled.min).toBeLessThan(scaled.max);
  });

  it('rejects a zero or negative factor', () => {
    expect(() => scaleBand(HEAD_HEIGHT, 0)).toThrow(RangeError);
    expect(() => scaleBand(HEAD_HEIGHT, -1)).toThrow(RangeError);
  });

  it('rejects an inverted band', () => {
    expect(() => scaleBand({ min: 5, max: 1 }, 2)).toThrow(InvalidBandError);
  });
});
