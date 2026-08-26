/** The protocol's hard limit. Beyond this a sitemap index is required. */
export const SITEMAP_MAX_ENTRIES = 50_000;

export const PRIORITY_HOME = 1;
export const PRIORITY_PRIMARY = 0.8;
export const PRIORITY_SECONDARY = 0.6;

/**
 * Paths kept out of the index entirely. A sitemap is a statement about what is
 * worth crawling, so anything noindex must also be absent from it — listing a
 * page you have told crawlers to ignore is a contradiction they notice.
 */
export const SITEMAP_EXCLUDED_ROUTES: readonly string[] = ['/privacy', '/terms'];
