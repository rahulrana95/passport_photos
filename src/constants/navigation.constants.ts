import type { CountrySlug } from './country.constants';
import { ROUTE_SEGMENTS } from './routes.constants';

export interface NavLink {
  readonly label: string;
  readonly href: string;
}

export const PRIMARY_NAV: readonly NavLink[] = [
  { label: 'Check a photo', href: ROUTE_SEGMENTS.checker },
  { label: 'Why was mine rejected?', href: ROUTE_SEGMENTS.rejected },
];

/**
 * A curated subset, not every country.
 *
 * Linking all 100+ from the footer would put the same wall of links on every
 * page: it dilutes the value each link passes, and it adds weight to a template
 * that renders on every route. These are the highest-demand destinations; the
 * full list lives on its own index page.
 */
export const FOOTER_FEATURED_COUNTRIES: readonly CountrySlug[] = [
  'us',
  'uk',
  'schengen',
  'canada',
  'australia',
  'india',
];

export const LEGAL_NAV: readonly NavLink[] = [
  { label: 'Privacy', href: ROUTE_SEGMENTS.privacy },
  { label: 'Terms', href: ROUTE_SEGMENTS.terms },
];

export const SKIP_LINK_TARGET_ID = 'main-content';
