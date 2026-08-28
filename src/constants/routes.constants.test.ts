import { describe, expect, it } from 'vitest';
import { servedSizeFamilies } from '@/dimension-page/size-family.utils';
import { COUNTRY_SLUGS } from './country.constants';
import { DOCUMENT_TYPES } from './document-type.constants';
import {
  absoluteUrl,
  countryDocumentRoute,
  dimensionFamilyRoute,
  dimensionRoute,
  homeRoute,
  ROUTE_SEGMENTS,
} from './routes.constants';

const SITE = 'https://example.com';

describe('homeRoute', () => {
  it('returns the root segment', () => {
    expect(homeRoute()).toBe('/');
  });
});

describe('countryDocumentRoute', () => {
  it('builds the documented shape', () => {
    expect(countryDocumentRoute('us', 'passport')).toBe('/us/passport-photo');
  });

  it.each(COUNTRY_SLUGS)('produces a valid path for %s', (country) => {
    for (const document of DOCUMENT_TYPES) {
      const route = countryDocumentRoute(country, document);
      expect(route.startsWith('/')).toBe(true);
      expect(route.endsWith('/')).toBe(false);
      expect(route).not.toContain('//');
    }
  });
});

describe('dimensionFamilyRoute', () => {
  it('publishes a size family at the phrase people search for', () => {
    // Not a size this can compute: 50.8x50.8mm and "2x2 inch" are the same
    // square and only one of them is ever typed into a search box.
    expect(dimensionFamilyRoute('2x2-inch-photo')).toBe('/2x2-inch-photo');
  });

  it('is what the size pages are generated at', () => {
    for (const served of servedSizeFamilies()) {
      expect(dimensionFamilyRoute(served.family.slug)).toBe(`/${served.family.slug}`);
    }
  });
});

describe('dimensionRoute', () => {
  it('builds the documented shape', () => {
    expect(dimensionRoute(35, 45)).toBe('/35x45mm-photo');
  });
});

describe('absoluteUrl', () => {
  it('returns the bare origin for home, never a trailing slash', () => {
    expect(absoluteUrl(SITE, ROUTE_SEGMENTS.home)).toBe(SITE);
  });

  it('joins a nested route onto the origin exactly once', () => {
    expect(absoluteUrl(SITE, countryDocumentRoute('uk', 'visa'))).toBe(
      'https://example.com/uk/visa-photo',
    );
  });

  it.each(Object.values(ROUTE_SEGMENTS))('produces a single-origin URL for %s', (route) => {
    const url = absoluteUrl(SITE, route);
    expect(url.startsWith(SITE)).toBe(true);
    expect(url.slice(SITE.length)).not.toContain(SITE);
  });
});
