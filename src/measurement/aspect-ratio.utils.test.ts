import { describe, expect, it } from 'vitest';
import {
  areValidDimensions,
  aspectRatio,
  aspectRatiosMatch,
  InvalidDimensionsError,
  largestInscribedRect,
} from './aspect-ratio.utils';

const UK_PHOTO = { width: 35, height: 45 };
const US_PHOTO = { width: 50.8, height: 50.8 };
const PHONE_4_3 = { width: 4032, height: 3024 };

describe('aspectRatio', () => {
  it('computes width over height', () => {
    expect(aspectRatio(UK_PHOTO)).toBeCloseTo(35 / 45, 6);
  });

  it('returns 1 for a square', () => {
    expect(aspectRatio(US_PHOTO)).toBe(1);
  });

  it.each([
    { width: 0, height: 10 },
    { width: 10, height: 0 },
    { width: -5, height: 10 },
    { width: Number.NaN, height: 10 },
  ])('rejects %o', (dimensions) => {
    expect(() => aspectRatio(dimensions)).toThrow(InvalidDimensionsError);
  });
});

describe('areValidDimensions', () => {
  it('accepts positive finite dimensions', () => {
    expect(areValidDimensions(UK_PHOTO)).toBe(true);
  });

  it('rejects an infinite dimension', () => {
    expect(areValidDimensions({ width: Number.POSITIVE_INFINITY, height: 1 })).toBe(false);
  });
});

describe('aspectRatiosMatch', () => {
  it('matches a shape against itself', () => {
    expect(aspectRatiosMatch(UK_PHOTO, UK_PHOTO)).toBe(true);
  });

  it('matches the same proportion at a different scale', () => {
    // The tolerance must mean the same thing for a 35x45mm photo and a
    // 413x531px one, which is why this compares ratios rather than absolutes.
    expect(aspectRatiosMatch(UK_PHOTO, { width: 350, height: 450 })).toBe(true);
  });

  it('rejects a different proportion', () => {
    expect(aspectRatiosMatch(UK_PHOTO, US_PHOTO)).toBe(false);
  });

  it('admits a near-miss inside the tolerance', () => {
    expect(aspectRatiosMatch(UK_PHOTO, { width: 35.2, height: 45 })).toBe(true);
  });
});

describe('largestInscribedRect', () => {
  it('crops the width when the source is wider than the target', () => {
    const result = largestInscribedRect(PHONE_4_3, 35 / 45);

    expect(result.height).toBe(PHONE_4_3.height);
    expect(result.width).toBeLessThan(PHONE_4_3.width);
  });

  it('crops the height when the source is taller than the target', () => {
    const portrait = { width: 3024, height: 4032 };
    const result = largestInscribedRect(portrait, 1);

    expect(result.width).toBe(portrait.width);
    expect(result.height).toBe(portrait.width);
  });

  it('returns the source unchanged when proportions already match', () => {
    const result = largestInscribedRect(US_PHOTO, 1);

    expect(result.width).toBe(US_PHOTO.width);
    expect(result.height).toBe(US_PHOTO.height);
  });

  it('always fits inside the source', () => {
    // A crop larger than the image it came from is the failure that produces a
    // black band down one edge of a passport photo.
    for (const ratio of [0.5, 35 / 45, 1, 1.5, 16 / 9]) {
      const result = largestInscribedRect(PHONE_4_3, ratio);
      expect(result.width).toBeLessThanOrEqual(PHONE_4_3.width);
      expect(result.height).toBeLessThanOrEqual(PHONE_4_3.height);
    }
  });

  it('produces the requested proportion', () => {
    const result = largestInscribedRect(PHONE_4_3, 35 / 45);
    expect(aspectRatio(result)).toBeCloseTo(35 / 45, 3);
  });

  it('rejects an invalid target ratio', () => {
    expect(() => largestInscribedRect(PHONE_4_3, 0)).toThrow(RangeError);
    expect(() => largestInscribedRect(PHONE_4_3, Number.NaN)).toThrow(RangeError);
  });

  it('rejects invalid source dimensions', () => {
    expect(() => largestInscribedRect({ width: 0, height: 10 }, 1)).toThrow(InvalidDimensionsError);
  });
});
