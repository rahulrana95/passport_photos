import type { CountrySlug } from './country.constants';
import type { DocumentType } from './document-type.constants';

/**
 * Every internal URL is produced here. A literal route string anywhere else is
 * an ESLint error, so a path can never drift between a link, a canonical tag
 * and the sitemap.
 *
 * The builders take the branded slug and document-type unions, so an unknown
 * country or document is a compile error rather than a 404 discovered in
 * production.
 */
export const ROUTE_SEGMENTS = {
  home: '/',
  checker: '/passport-photo-checker',
  rejected: '/why-was-my-passport-photo-rejected',
  privacy: '/privacy',
  terms: '/terms',
} as const;

export type StaticRoute = (typeof ROUTE_SEGMENTS)[keyof typeof ROUTE_SEGMENTS];

export const homeRoute = (): StaticRoute => ROUTE_SEGMENTS.home;

/** e.g. countryDocumentRoute('us', 'passport') -> '/us/passport-photo' */
export const countryDocumentRoute = (country: CountrySlug, document: DocumentType): string =>
  `/${country}/${document}-photo`;

/** e.g. dimensionRoute(35, 45) -> '/35x45mm-photo' */
export const dimensionRoute = (widthMm: number, heightMm: number): string =>
  `/${widthMm}x${heightMm}mm-photo`;

/**
 * The URL a size family is published at.
 *
 * The slug is the phrase people search rather than a size this can compute:
 * 50.8x50.8mm and "2x2 inch" are the same square, and only one of them is ever
 * typed into a search box. So the catalogue owns the slug and this owns the
 * shape of the URL around it.
 */
export const dimensionFamilyRoute = (slug: string): string => `/${slug}`;

/**
 * Builds the absolute form used by canonical tags, Open Graph and the sitemap.
 *
 * `siteUrl` never ends in a slash (enforced in env.config.ts) and routes always
 * begin with one, so the join is unambiguous. The home route returns the bare
 * origin — appending '/' here would disagree with `trailingSlash: false` in
 * next.config.ts and produce two URLs for one page.
 */
export const absoluteUrl = (siteUrl: string, route: string): string =>
  route === ROUTE_SEGMENTS.home ? siteUrl : `${siteUrl}${route}`;
