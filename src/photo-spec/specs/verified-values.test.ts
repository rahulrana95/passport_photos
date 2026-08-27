import { describe, expect, it } from 'vitest';
import { listAuthoredSpecs } from '../photo-spec.registry';
import { SCHENGEN_VISA } from './schengen.spec';
import { UK_PASSPORT } from './uk.spec';
import { US_PASSPORT, US_VISA } from './us.spec';

/**
 * The published numbers, pinned.
 *
 * Not a restatement of the source file — a guard on the handful of values that
 * were WRONG before they were checked against the authority, and on the two
 * that are easy to get backwards. Every one of these has a story: it was
 * either found to be incorrect on 2026-08-27, or it is the value a plausible
 * "tidy-up" would break.
 */

describe('United States', () => {
  it('states head height as a proportion, because three published forms disagree', () => {
    // "1 - 1 3/8 inches", "(25 - 35 mm)" and 50%-69% are the same rule stated
    // three ways, and 1 inch is 25.4mm — so the millimetre form rejects a
    // photograph at 25.1mm that the inch form accepts. The proportion is what
    // the biometric pipeline runs on.
    expect(US_PASSPORT.headHeight).toEqual({ unit: 'ratio', minRatio: 0.5, maxRatio: 0.69 });
  });

  it('measures to the top of the hair, not the skull', () => {
    // "The top of the head, including the hair, to the bottom of the chin."
    expect(US_PASSPORT.crownDefinition).toBe('visible-top');
  });

  it('gives the passport its own upload ceiling, not the consular one', () => {
    // 240KB is the DS-160 limit and it was on this spec by mistake, squeezing
    // the byte budget by a factor of forty on every passport photograph.
    expect(US_PASSPORT.digital.maxBytes).toBe(10_000_000);
  });

  it('keeps the 240KB ceiling on the visa, where it belongs', () => {
    expect(US_VISA.digital.maxBytes).toBe(240_000);
  });

  it('does not let the visa inherit the passport ceiling', () => {
    // The spread that created the original mistake, guarded in the direction
    // it actually failed.
    expect(US_VISA.digital.maxBytes).not.toBe(US_PASSPORT.digital.maxBytes);
  });

  it('shares the passport geometry with the visa', () => {
    expect(US_VISA.headHeight).toEqual(US_PASSPORT.headHeight);
    expect(US_VISA.eyeLine).toEqual(US_PASSPORT.eyeLine);
  });
});

describe('United Kingdom', () => {
  it('permits glasses, with conditions', () => {
    // The opposite is widely repeated and wrong. gov.uk permits them so long
    // as they are not tinted and the eyes are not covered by frames or glare.
    // Copying the United States' ban here would send people to retake a
    // photograph that was fine.
    expect(UK_PASSPORT.glasses).toBe('permitted-no-glare');
  });

  it('accepts two background colours that are nowhere near each other', () => {
    // "Plain cream or light grey": one warm, one neutral.
    expect(UK_PASSPORT.background.hexRanges).toHaveLength(2);
  });

  it('measures to the crown, meaning the skull', () => {
    expect(UK_PASSPORT.crownDefinition).toBe('skull');
  });

  it('allows one month, not six', () => {
    // Far stricter than most authorities, and the kind of value that gets
    // "corrected" to the common case.
    expect(UK_PASSPORT.maxAgeMonths).toBe(1);
  });
});

describe('Schengen', () => {
  it('states head height as a proportion, because that is how the standard states it', () => {
    expect(SCHENGEN_VISA.headHeight).toEqual({ unit: 'ratio', minRatio: 0.7, maxRatio: 0.8 });
  });

  it('cites a document that actually contains the numbers', () => {
    // The Visa Code publishes no dimensions at all — it defers to ICAO 9303 —
    // so the source used to point at a page stating neither the size nor the
    // proportion. A citation to a page without the numbers is worse than none:
    // it looks checked.
    expect(SCHENGEN_VISA.source).toContain('icao_photograph_guidelines');
  });

  it('measures to the crown, excluding high-volume hair', () => {
    expect(SCHENGEN_VISA.crownDefinition).toBe('skull');
  });
});

describe('every authored specification', () => {
  it('says where the top of the head is', () => {
    // Several millimetres apart on anyone with volume, which is most of the
    // tolerance on a head-height rule.
    for (const spec of listAuthoredSpecs()) {
      expect(spec.crownDefinition).toBeDefined();
    }
  });

  it('cites a source and the date it was checked', () => {
    for (const spec of listAuthoredSpecs()) {
      expect(spec.source).toMatch(/^https:\/\//);
      expect(spec.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('has been verified, so the registry serves something', () => {
    // The state that blocked every country page for four plan items.
    for (const spec of listAuthoredSpecs()) {
      expect(spec.verification).toBe('verified');
    }
  });
});
