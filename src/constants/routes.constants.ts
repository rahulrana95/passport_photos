/**
 * Every internal URL is produced here. A literal route string anywhere else is
 * a lint error, so a path can never drift between a link, a canonical tag and
 * the sitemap.
 */
export const ROUTE_SEGMENTS = {
  home: '/',
} as const;

export type AppRoute = (typeof ROUTE_SEGMENTS)[keyof typeof ROUTE_SEGMENTS];

export const homeRoute = (): AppRoute => ROUTE_SEGMENTS.home;

/**
 * Builds the absolute form used by canonical tags, Open Graph and the sitemap.
 * `siteUrl` never ends in a slash (enforced in env.config.ts), and routes always
 * begin with one, so the join is unambiguous.
 */
export const absoluteUrl = (siteUrl: string, route: string): string =>
  route === ROUTE_SEGMENTS.home ? siteUrl : `${siteUrl}${route}`;
