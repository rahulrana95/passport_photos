import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/constants/routes.constants';
import { env } from '@/config/env.config';
import { SITEMAP_EXCLUDED_ROUTES, SITEMAP_MAX_ENTRIES } from './sitemap.constants';
import type { SitemapEntryInput } from './sitemap.types';

export class SitemapTooLargeError extends Error {
  constructor(count: number) {
    super(
      `Sitemap has ${count} entries, over the ${SITEMAP_MAX_ENTRIES} limit. Split it into a sitemap index.`,
    );
    this.name = 'SitemapTooLargeError';
  }
}

/**
 * Builds the sitemap, dropping excluded routes and de-duplicating.
 *
 * Throws rather than truncating when over the limit: a silently shortened
 * sitemap means pages stop being crawled with no error anywhere, which is
 * exactly the kind of failure nobody notices for three months.
 */
export const buildSitemap = (entries: readonly SitemapEntryInput[]): MetadataRoute.Sitemap => {
  const seen = new Set<string>();
  const included: SitemapEntryInput[] = [];

  for (const entry of entries) {
    if (SITEMAP_EXCLUDED_ROUTES.includes(entry.route)) continue;
    if (seen.has(entry.route)) continue;
    seen.add(entry.route);
    included.push(entry);
  }

  if (included.length > SITEMAP_MAX_ENTRIES) throw new SitemapTooLargeError(included.length);

  return included.map((entry) => ({
    url: absoluteUrl(env.NEXT_PUBLIC_SITE_URL, entry.route),
    ...(entry.lastModified === undefined ? {} : { lastModified: new Date(entry.lastModified) }),
    ...(entry.changeFrequency === undefined ? {} : { changeFrequency: entry.changeFrequency }),
    ...(entry.priority === undefined ? {} : { priority: entry.priority }),
  }));
};
