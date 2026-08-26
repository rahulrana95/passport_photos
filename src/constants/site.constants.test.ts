import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from './site.constants';

/**
 * These assert product invariants, not string equality. The disclaimer wording
 * is a legal position: we never claim a photo will be accepted.
 */
describe('site copy invariants', () => {
  const allCopy = [SITE_NAME, SITE_TAGLINE, SITE_DESCRIPTION];

  it.each(allCopy)('never promises acceptance: %s', (copy) => {
    expect(copy.toLowerCase()).not.toMatch(/guarantee|approved|will pass|certified/);
  });

  it('tells the visitor the photo is not uploaded', () => {
    expect(SITE_DESCRIPTION.toLowerCase()).toContain('never uploaded');
  });

  it('uses a two-letter locale so the html lang attribute is valid', () => {
    expect(DEFAULT_LOCALE).toMatch(/^[a-z]{2}$/);
  });
});
