import { describe, expect, it } from 'vitest';
import { SPEC_REVERIFICATION_DAYS } from './photo-spec.constants';
import {
  deepFreeze,
  isSpecStale,
  mergeSpecOverride,
  resolveHeadHeight,
  resolveSpec,
} from './photo-spec.utils';
import { US_PASSPORT } from './specs/us.spec';
import { SCHENGEN_VISA } from './specs/schengen.spec';

const NOW = new Date('2026-08-26T12:00:00Z');

describe('resolveHeadHeight', () => {
  it('derives a ratio from a millimetre specification', () => {
    const resolved = resolveHeadHeight({ unit: 'mm', minMm: 25.4, maxMm: 34.9 }, 50.8);

    expect(resolved.minMm).toBe(25.4);
    expect(resolved.minRatio).toBeCloseTo(0.5, 3);
    expect(resolved.authoredUnit).toBe('mm');
  });

  it('derives millimetres from a ratio specification', () => {
    const resolved = resolveHeadHeight({ unit: 'ratio', minRatio: 0.7, maxRatio: 0.8 }, 45);

    expect(resolved.minMm).toBe(31.5);
    expect(resolved.maxMm).toBe(36);
    expect(resolved.authoredUnit).toBe('ratio');
  });

  it('records the authored unit, so the citation can quote what was published', () => {
    // Losing this would mean telling a reader "25.4mm" when the authority said
    // "70% of the photo", which is not the same claim.
    expect(resolveHeadHeight({ unit: 'ratio', minRatio: 0.7, maxRatio: 0.8 }, 45).authoredUnit).toBe(
      'ratio',
    );
  });

  it('round-trips a ratio back to itself', () => {
    const resolved = resolveHeadHeight({ unit: 'ratio', minRatio: 0.7, maxRatio: 0.8 }, 45);
    expect(resolved.minMm / 45).toBeCloseTo(0.7, 3);
  });
});

describe('isSpecStale', () => {
  it('accepts a specification verified today', () => {
    expect(isSpecStale('2026-08-26', NOW)).toBe(false);
  });

  it('accepts one verified just inside the window', () => {
    const inside = new Date(NOW.getTime() - (SPEC_REVERIFICATION_DAYS - 1) * 86_400_000);
    expect(isSpecStale(inside.toISOString().slice(0, 10), NOW)).toBe(false);
  });

  it('flags one verified beyond the window', () => {
    const outside = new Date(NOW.getTime() - (SPEC_REVERIFICATION_DAYS + 5) * 86_400_000);
    expect(isSpecStale(outside.toISOString().slice(0, 10), NOW)).toBe(true);
  });
});

describe('resolveSpec', () => {
  it('resolves head height and staleness together', () => {
    const resolved = resolveSpec(US_PASSPORT, NOW);

    expect(resolved.headHeight.minRatio).toBeGreaterThan(0);
    expect(resolved.isStale).toBe(false);
  });

  it('preserves provenance untouched', () => {
    const resolved = resolveSpec(US_PASSPORT, NOW);

    expect(resolved.source).toBe(US_PASSPORT.source);
    expect(resolved.lastVerified).toBe(US_PASSPORT.lastVerified);
  });
});

describe('mergeSpecOverride', () => {
  it('replaces a scalar', () => {
    const merged = mergeSpecOverride(SCHENGEN_VISA, { maxAgeMonths: 3 });
    expect(merged.maxAgeMonths).toBe(3);
  });

  it('merges a nested object without dropping its siblings', () => {
    // A shallow spread would replace the whole print object and lose widthMm
    // and dpi. The spec would still parse; it would just be wrong.
    const merged = mergeSpecOverride(SCHENGEN_VISA, { print: { dpi: 600 } });

    expect(merged.print.dpi).toBe(600);
    expect(merged.print.widthMm).toBe(SCHENGEN_VISA.print.widthMm);
    expect(merged.print.heightMm).toBe(SCHENGEN_VISA.print.heightMm);
  });

  it('ignores an explicitly undefined key rather than erasing the base value', () => {
    const merged = mergeSpecOverride(SCHENGEN_VISA, { maxAgeMonths: undefined });
    expect(merged.maxAgeMonths).toBe(SCHENGEN_VISA.maxAgeMonths);
  });

  it('replaces an array wholesale rather than concatenating', () => {
    const merged = mergeSpecOverride(SCHENGEN_VISA, { notes: ['State-specific note'] });
    expect(merged.notes).toEqual(['State-specific note']);
  });

  it('leaves the base untouched', () => {
    const before = SCHENGEN_VISA.print.dpi;
    mergeSpecOverride(SCHENGEN_VISA, { print: { dpi: 600 } });
    expect(SCHENGEN_VISA.print.dpi).toBe(before);
  });
});

describe('deepFreeze', () => {
  it('freezes nested objects', () => {
    const frozen = deepFreeze({ a: { b: { c: 1 } } });
    expect(Object.isFrozen(frozen.a.b)).toBe(true);
  });

  it('returns primitives untouched', () => {
    expect(deepFreeze(5)).toBe(5);
    expect(deepFreeze(null)).toBeNull();
  });

  it('is safe to call twice', () => {
    const once = deepFreeze({ a: 1 });
    expect(deepFreeze(once)).toBe(once);
  });
});
