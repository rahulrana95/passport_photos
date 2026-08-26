import { describe, expect, it } from 'vitest';
import { MAX_SOURCE_DIMENSION_PX } from '@/constants/limits.constants';
import { evaluateResolution, requiredPixels } from './resolution.utils';
import { InvalidDimensionsError } from './aspect-ratio.utils';

const US_REQUIREMENT = { widthMm: 50.8, heightMm: 50.8, dpi: 300 };

describe('requiredPixels', () => {
  it('converts a print requirement into whole pixels', () => {
    const required = requiredPixels(US_REQUIREMENT);

    expect(required.width).toBe(600);
    expect(required.height).toBe(600);
    expect(Number.isInteger(required.width)).toBe(true);
  });

  it('scales with DPI', () => {
    expect(requiredPixels({ ...US_REQUIREMENT, dpi: 600 }).width).toBe(1200);
  });

  it('handles a non-integer DPI', () => {
    expect(Number.isInteger(requiredPixels({ ...US_REQUIREMENT, dpi: 300.5 }).width)).toBe(true);
  });
});

describe('evaluateResolution', () => {
  it('accepts a source with room to spare and reports the headroom', () => {
    const verdict = evaluateResolution({ width: 4032, height: 3024 }, US_REQUIREMENT);

    expect(verdict.sufficient).toBe(true);
    if (verdict.sufficient) expect(verdict.headroom).toBeGreaterThan(1);
  });

  it('accepts a source exactly at the requirement', () => {
    expect(evaluateResolution({ width: 600, height: 600 }, US_REQUIREMENT).sufficient).toBe(true);
  });

  it('rejects a source below the requirement and says by how much', () => {
    const verdict = evaluateResolution({ width: 300, height: 300 }, US_REQUIREMENT);

    expect(verdict.sufficient).toBe(false);
    if (!verdict.sufficient) {
      expect(verdict.reason).toBe('too-small');
      expect(verdict.shortfallFactor).toBeCloseTo(2, 5);
    }
  });

  it('never suggests upscaling to close the gap', () => {
    // An enlarged image reads as soft to a human reviewer while passing an
    // automated pixel check — compliant to us, rejected by them.
    const verdict = evaluateResolution({ width: 300, height: 300 }, US_REQUIREMENT);
    expect(verdict.sufficient).toBe(false);
  });

  it('is limited by the smaller of the two axes', () => {
    const verdict = evaluateResolution({ width: 4000, height: 400 }, US_REQUIREMENT);
    expect(verdict.sufficient).toBe(false);
  });

  it('refuses a requirement beyond the browser canvas limit', () => {
    // Past this, canvas throws or silently produces a blank bitmap, which would
    // surface as an unexplained failure rather than an honest message.
    const absurd = { widthMm: 5000, heightMm: 5000, dpi: 1200 };
    const verdict = evaluateResolution({ width: 8000, height: 8000 }, absurd);

    expect(verdict.sufficient).toBe(false);
    if (!verdict.sufficient) expect(verdict.reason).toBe('exceeds-canvas-limit');
    expect(requiredPixels(absurd).width).toBeGreaterThan(MAX_SOURCE_DIMENSION_PX);
  });

  it('rejects invalid source dimensions', () => {
    expect(() => evaluateResolution({ width: 0, height: 100 }, US_REQUIREMENT)).toThrow(
      InvalidDimensionsError,
    );
  });
});
