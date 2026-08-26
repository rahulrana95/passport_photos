import { describe, expect, it } from 'vitest';
import { isCountrySlug } from './country.constants';
import {
  FOOTER_FEATURED_COUNTRIES,
  LEGAL_NAV,
  PRIMARY_NAV,
  SKIP_LINK_TARGET_ID,
} from './navigation.constants';

describe('navigation constants', () => {
  it.each([...PRIMARY_NAV, ...LEGAL_NAV])('$label points at an internal path', (link) => {
    expect(link.href.startsWith('/')).toBe(true);
    expect(link.label.length).toBeGreaterThan(0);
  });

  it('has no duplicate destinations in the primary nav', () => {
    const hrefs = PRIMARY_NAV.map((link) => link.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it.each(FOOTER_FEATURED_COUNTRIES)('%s is a real country slug', (slug) => {
    expect(isCountrySlug(slug)).toBe(true);
  });

  it('uses a valid HTML id for the skip-link target', () => {
    expect(SKIP_LINK_TARGET_ID).toMatch(/^[a-z][\w-]*$/);
  });
});
