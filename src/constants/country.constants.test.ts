import { describe, expect, it } from 'vitest';
import { COUNTRY_NAMES, COUNTRY_SLUGS, isCountrySlug } from './country.constants';

describe('country slugs', () => {
  it('names every slug it serves', () => {
    for (const slug of COUNTRY_SLUGS) {
      expect(COUNTRY_NAMES[slug]).toBeTruthy();
    }
  });

  it('contains no duplicates', () => {
    expect(new Set(COUNTRY_SLUGS).size).toBe(COUNTRY_SLUGS.length);
  });

  it.each(COUNTRY_SLUGS)('%s is URL-safe and lowercase', (slug) => {
    expect(slug).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });

  it('accepts a known slug', () => {
    expect(isCountrySlug('us')).toBe(true);
  });

  it('rejects an unknown slug', () => {
    expect(isCountrySlug('atlantis')).toBe(false);
  });
});
