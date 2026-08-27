import { describe, expect, it } from 'vitest';
import { UK_PASSPORT } from './specs/uk.spec';
import { photoSpecSchema } from './photo-spec.schemas';
import type { PhotoSpec } from './photo-spec.schemas';
import {
  buildRegistry,
  findSpec,
  findSpecIn,
  listAuthoredSpecs,
  listServableSpecs,
  specKey,
} from './photo-spec.registry';

const NOW = new Date('2026-08-26T12:00:00Z');

describe('the authored registry', () => {
  it('holds at least one specification per seeded country', () => {
    const countries = new Set(listAuthoredSpecs().map((spec) => spec.country));
    expect([...countries].sort()).toEqual(['schengen', 'uk', 'us']);
  });

  it.each(listAuthoredSpecs())('$country:$document parses against the schema', (spec) => {
    expect(() => photoSpecSchema.parse(spec)).not.toThrow();
  });

  it.each(listAuthoredSpecs())('$country:$document cites a government source', (spec) => {
    expect(spec.source).toMatch(/^https:\/\//);
    expect(spec.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('has no duplicate country and document pairs', () => {
    const keys = listAuthoredSpecs().map((spec) => specKey(spec.country, spec.document));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('freezes every specification, so a caller cannot mutate a shared record', () => {
    for (const spec of listAuthoredSpecs()) {
      expect(Object.isFrozen(spec)).toBe(true);
      expect(Object.isFrozen(spec.print)).toBe(true);
    }
  });
});

describe('serving rules', () => {
  /**
   * The RULE, not the current state of the registry.
   *
   * These two used to assert that nothing was servable, because at the time
   * every seeded spec was provisional. That is a fact about the data, and it
   * stopped being true the moment the specifications were verified — so two
   * tests failed that were describing the world rather than the behaviour.
   * A provisional spec is built here instead, so the gate is tested whatever
   * the shipped registry happens to contain.
   */
  const provisional: PhotoSpec = { ...UK_PASSPORT, verification: 'provisional' };
  const mixed = buildRegistry([provisional]);

  it('serves nothing that has not been verified against its source', () => {
    // Presenting an unverified government requirement as authoritative is the
    // exact failure this product exists to prevent.
    expect(findSpecIn(mixed, 'uk', 'passport', NOW)).toEqual({
      found: false,
      reason: 'unknown-country',
    });
  });

  it('serves a specification once it has been verified', () => {
    const verified = buildRegistry([{ ...UK_PASSPORT, verification: 'verified' }]);

    expect(findSpecIn(verified, 'uk', 'passport', NOW).found).toBe(true);
  });

  it('serves every specification the shipped registry has verified', () => {
    // The other direction: a spec that is marked verified and still does not
    // reach a reader would be a silent outage of the whole product.
    const verified = listAuthoredSpecs().filter((spec) => spec.verification === 'verified');

    expect(listServableSpecs()).toHaveLength(verified.length);
  });
});

describe('findSpec', () => {
  it('distinguishes an unknown country from an unsupported document', () => {
    expect(findSpec('atlantis', 'passport', NOW).found).toBe(false);
    expect(findSpec('atlantis', 'passport', NOW)).toMatchObject({ reason: 'unknown-country' });
  });

  it('returns a typed result rather than undefined', () => {
    // A caller cannot accidentally render a page for a country we do not cover,
    // because there is no falsy value to forget to check.
    const result = findSpec('atlantis', 'passport', NOW);
    expect(result).toHaveProperty('found');
    expect(result).toHaveProperty('reason');
  });
});

describe('buildRegistry', () => {
  it('rejects two specifications claiming the same country and document', () => {
    // Silently keeping the last one would mean a country served requirements
    // nobody realised had been overwritten.
    const spec = listAuthoredSpecs()[0]!;
    expect(() => buildRegistry([spec, spec])).toThrow(/Duplicate specification/);
  });

  it('reports which pair collided', () => {
    const spec = listAuthoredSpecs()[0]!;
    expect(() => buildRegistry([spec, spec])).toThrow(
      new RegExp(specKey(spec.country, spec.document)),
    );
  });

  it('rejects a malformed specification at registry construction, not at use', () => {
    const spec = { ...listAuthoredSpecs()[0]!, source: 'not-a-url' };
    expect(() => buildRegistry([spec])).toThrow();
  });
});

describe('findSpec distinguishes the two kinds of miss', () => {
  it('reports an unsupported document for a country we do cover', () => {
    // "We do not do driving licences for the US" is a different message from
    // "we have never heard of Atlantis", and the page needs to say the right one.
    expect(findSpec('us', 'licence', NOW)).toEqual({
      found: false,
      reason: 'unsupported-document',
    });
  });
});

describe('findSpecIn, against a verified registry', () => {
  const verified = { ...listAuthoredSpecs()[0]!, verification: 'verified' as const };
  const registry = buildRegistry([verified]);

  it('resolves a verified specification', () => {
    const result = findSpecIn(registry, verified.country, verified.document, NOW);

    expect(result.found).toBe(true);
    expect(result).toMatchObject({ spec: { country: verified.country } });
  });

  it('returns head height in both units, derived once at this boundary', () => {
    const result = findSpecIn(registry, verified.country, verified.document, NOW);

    if (!result.found) throw new Error('expected the specification to resolve');
    expect(result.spec.headHeight.minMm).toBeGreaterThan(0);
    expect(result.spec.headHeight.minRatio).toBeGreaterThan(0);
    expect(result.spec.headHeight.authoredUnit).toBe(verified.headHeight.unit);
  });

  it('reports staleness so the page can say when it was last checked', () => {
    const result = findSpecIn(registry, verified.country, verified.document, NOW);

    if (!result.found) throw new Error('expected the specification to resolve');
    expect(result.spec.isStale).toBe(false);
  });

  it('reports a long-unchecked specification as stale rather than hiding it', () => {
    const muchLater = new Date('2028-01-01T00:00:00Z');
    const result = findSpecIn(registry, verified.country, verified.document, muchLater);

    if (!result.found) throw new Error('expected the specification to resolve');
    expect(result.spec.isStale).toBe(true);
  });
});
