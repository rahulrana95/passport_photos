import { describe, expect, it } from 'vitest';
import { homeRoute } from '@/constants/routes.constants';
import { buildSitemap, SitemapTooLargeError } from './sitemap.utils';
import { SITEMAP_EXCLUDED_ROUTES, SITEMAP_MAX_ENTRIES } from './sitemap.constants';

const SITE = 'https://example.test';

describe('buildSitemap', () => {
  it('emits absolute URLs', () => {
    expect(buildSitemap([{ route: '/us/passport-photo' }])[0]?.url).toBe(
      `${SITE}/us/passport-photo`,
    );
  });

  it('emits the bare origin for the home route', () => {
    expect(buildSitemap([{ route: homeRoute() }])[0]?.url).toBe(SITE);
  });

  it('drops routes that are excluded from the index', () => {
    const excluded = SITEMAP_EXCLUDED_ROUTES[0]!;
    expect(buildSitemap([{ route: excluded }, { route: '/us/passport-photo' }])).toHaveLength(1);
  });

  it('de-duplicates a route listed twice', () => {
    expect(buildSitemap([{ route: '/a' }, { route: '/a' }])).toHaveLength(1);
  });

  it('carries a known lastModified date as a Date', () => {
    const [entry] = buildSitemap([{ route: '/a', lastModified: '2026-08-20' }]);
    expect(entry?.lastModified).toEqual(new Date('2026-08-20'));
  });

  it('omits lastModified entirely when unknown', () => {
    // Defaulting to the build date would tell crawlers the whole site changed on
    // every deploy, which makes the signal worthless.
    expect(buildSitemap([{ route: '/a' }])[0]).not.toHaveProperty('lastModified');
  });

  it('omits changeFrequency and priority when unset', () => {
    const [entry] = buildSitemap([{ route: '/a' }]);
    expect(entry).not.toHaveProperty('changeFrequency');
    expect(entry).not.toHaveProperty('priority');
  });

  it('carries changeFrequency and priority when set', () => {
    const [entry] = buildSitemap([{ route: '/a', changeFrequency: 'weekly', priority: 0.8 }]);
    expect(entry).toMatchObject({ changeFrequency: 'weekly', priority: 0.8 });
  });

  it('throws rather than truncating beyond the protocol limit', () => {
    // A silently shortened sitemap means pages stop being crawled with no error
    // anywhere — the kind of failure nobody notices for three months.
    const tooMany = Array.from({ length: SITEMAP_MAX_ENTRIES + 1 }, (_, index) => ({
      route: `/page-${index}`,
    }));
    expect(() => buildSitemap(tooMany)).toThrow(SitemapTooLargeError);
  });

  it('accepts exactly the limit', () => {
    const atLimit = Array.from({ length: SITEMAP_MAX_ENTRIES }, (_, index) => ({
      route: `/page-${index}`,
    }));
    expect(buildSitemap(atLimit)).toHaveLength(SITEMAP_MAX_ENTRIES);
  });
});
