import type { CountrySlug } from './country.constants';
import { ROUTE_SEGMENTS } from './routes.constants';

export interface NavLink {
  readonly label: string;
  readonly href: string;
}

/**
 * ONLY ROUTES THAT EXIST.
 *
 * Every entry here is rendered in the header AND the footer, so a link to a
 * page nobody has built is not one broken link — it is two on every page of the
 * site. `/why-was-my-passport-photo-rejected` was exactly that until a crawl of
 * the country pages caught it: the sitemap had already dropped it for 404ing
 * and the navigation kept pointing at it. It is back because the page is.
 */
export const PRIMARY_NAV: readonly NavLink[] = [
  { label: 'Check a photo', href: ROUTE_SEGMENTS.checker },
  { label: 'Why was mine rejected?', href: ROUTE_SEGMENTS.rejected },
];

/**
 * The countries the footer offers, in preference order.
 *
 * A curated subset rather than every country: linking all 100+ from the footer
 * would put the same wall of links on every page, which dilutes what each one
 * passes and adds weight to a template that renders on every route. The full
 * list lives on its own index page.
 *
 * ORDER ONLY — the footer intersects this with the specifications that actually
 * have a page. Half of these had none, so the footer was advertising four 404s
 * from every route on the site.
 */
export const FOOTER_FEATURED_COUNTRIES: readonly CountrySlug[] = [
  'us',
  'uk',
  'schengen',
  'canada',
  'australia',
  'india',
];

/**
 * Empty until the pages exist, and deliberately not deleted.
 *
 * A site that states government requirements needs a privacy page and terms,
 * and both are planned. What it must not have in the meantime is a footer
 * linking to two 404s from every route — the reader who clicks Privacy on a
 * page promising their photo never leaves their device is exactly the reader
 * who cannot be shown a missing page.
 */
export const LEGAL_NAV: readonly NavLink[] = [];

export const SKIP_LINK_TARGET_ID = 'main-content';
