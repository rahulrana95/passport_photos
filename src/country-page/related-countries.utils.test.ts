import { describe, expect, it } from 'vitest';
import { listServableSpecs } from '@/photo-spec/photo-spec.registry';
import { resolveSpec } from '@/photo-spec/photo-spec.utils';
import { RELATED_COUNTRY_LIMIT } from './country-page.constants';
import { relatedCountries } from './related-countries.utils';
import type { PhotoSpec } from '@/photo-spec/photo-spec.schemas';

const NOW = new Date('2026-01-01T00:00:00Z');

const spec = (country: string, document: string): PhotoSpec => {
  const found = listServableSpecs().find(
    (candidate) => candidate.country === country && candidate.document === document,
  );
  if (found === undefined) throw new Error(`No servable specification for ${country} ${document}.`);
  return found;
};

const fake = (country: string, document: string): PhotoSpec =>
  ({ ...spec('us', 'passport'), country, document }) as PhotoSpec;

describe('the countries a page links on to', () => {
  it('links only to countries that have a page', () => {
    // The sitemap made this mistake once and Search Console reported every
    // advertised 404 against the whole property. Repeated on every country
    // page it is worse: a broken link in a template is a broken site.
    const served = new Set(listServableSpecs().map((candidate) => candidate.country));

    for (const country of relatedCountries(resolveSpec(spec('us', 'passport'), NOW))) {
      expect(served.has(country)).toBe(true);
    }
  });

  it('never links a page to itself', () => {
    const links = relatedCountries(resolveSpec(spec('us', 'passport'), NOW));

    expect(links).not.toContain('us');
  });

  it('stays with the document the reader is applying for', () => {
    // Somebody on a passport page is applying for a passport. A visa page for
    // another country is a link nobody asked for, and it dilutes the rest.
    const links = relatedCountries(resolveSpec(spec('us', 'visa'), NOW), [
      fake('uk', 'visa'),
      fake('canada', 'passport'),
    ]);

    expect(links).toEqual(['uk']);
  });

  it('stops well short of a link farm', () => {
    const many = Array.from({ length: RELATED_COUNTRY_LIMIT * 2 }, (_, index) =>
      fake(`country-${index}`, 'passport'),
    );

    expect(relatedCountries(resolveSpec(spec('us', 'passport'), NOW), many)).toHaveLength(
      RELATED_COUNTRY_LIMIT,
    );
  });

  it('returns nothing rather than something wrong when it is the only page', () => {
    expect(relatedCountries(resolveSpec(spec('uk', 'passport'), NOW), [])).toEqual([]);
  });
});
