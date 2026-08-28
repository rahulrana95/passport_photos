import { describe, expect, it } from 'vitest';
import { listServableSpecs } from '@/photo-spec/photo-spec.registry';
import { FOOTER_FEATURED_COUNTRIES } from '@/constants/navigation.constants';
import { footerCountryLinks } from './footer-links.utils';
import type { PhotoSpec } from '@/photo-spec/photo-spec.schemas';

const template = (): PhotoSpec => {
  const [spec] = listServableSpecs();
  if (spec === undefined) throw new Error('The registry serves nothing.');
  return spec;
};

const fake = (country: string, document: string): PhotoSpec =>
  ({ ...template(), country, document }) as PhotoSpec;

describe('the countries the footer links to', () => {
  it('offers only countries with a page', () => {
    // The footer renders on every route, so a country with no page is not one
    // broken link — it is one on every page of the site.
    const served = new Set(listServableSpecs().map((spec) => spec.country));

    for (const link of footerCountryLinks()) {
      expect(served.has(link.country)).toBe(true);
    }
  });

  it('drops a featured country the registry does not serve', () => {
    const links = footerCountryLinks(['us', 'japan'], [fake('us', 'passport')]);

    expect(links).toEqual([{ country: 'us', document: 'passport' }]);
  });

  it('links a country to a document it actually issues', () => {
    // Schengen publishes a visa standard and no passport one. Hard-coding
    // `passport` pointed it at a page that does not exist.
    const links = footerCountryLinks(['schengen'], [fake('schengen', 'visa')]);

    expect(links).toEqual([{ country: 'schengen', document: 'visa' }]);
  });

  it('prefers the passport where a country publishes several', () => {
    // What most readers arrive looking for.
    const links = footerCountryLinks(
      ['us'],
      [fake('us', 'visa'), fake('us', 'passport'), fake('us', 'id-card')],
    );

    expect(links).toEqual([{ country: 'us', document: 'passport' }]);
  });

  it('keeps the featured order rather than the registry’s', () => {
    const links = footerCountryLinks(
      ['uk', 'us'],
      [fake('us', 'passport'), fake('uk', 'passport')],
    );

    expect(links.map((link) => link.country)).toEqual(['uk', 'us']);
  });

  it('returns nothing rather than something broken when nothing is served', () => {
    expect(footerCountryLinks(FOOTER_FEATURED_COUNTRIES, [])).toEqual([]);
  });
});
