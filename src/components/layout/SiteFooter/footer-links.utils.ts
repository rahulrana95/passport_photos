import { listServableSpecs } from '@/photo-spec/photo-spec.registry';
import { FOOTER_FEATURED_COUNTRIES } from '@/constants/navigation.constants';
import { PREFERRED_FOOTER_DOCUMENT } from './SiteFooter.constants';
import type { CountrySlug } from '@/constants/country.constants';
import type { DocumentType } from '@/constants/document-type.constants';
import type { PhotoSpec } from '@/photo-spec/photo-spec.schemas';

export interface FooterCountryLink {
  readonly country: CountrySlug;
  readonly document: DocumentType;
}

/**
 * The countries the footer links, each to a document it actually issues.
 *
 * TWO MISTAKES LIVED HERE, and both were invisible because a footer looks
 * right whatever it points at. The list was a hand-written six of which four
 * had no page at all; and every link was hard-coded to `passport`, so the
 * Schengen entry pointed at a passport page that does not exist — the Schengen
 * specification is a visa. A footer renders on every route, so each of those
 * was a broken link on every page of the site.
 *
 * Built from the servable registry, in the featured order, preferring a
 * passport where a country has one because that is what most readers came for.
 */
export const footerCountryLinks = (
  featured: readonly string[] = FOOTER_FEATURED_COUNTRIES,
  specs: readonly PhotoSpec[] = listServableSpecs(),
): readonly FooterCountryLink[] => {
  const links: FooterCountryLink[] = [];

  for (const country of featured) {
    const forCountry = specs.filter((spec) => spec.country === country);

    // One guard, not two. An empty list and a missing element are the same
    // case — the country has no page — and checking the length as well would
    // leave a branch no input can take.
    const preferred =
      forCountry.find((spec) => spec.document === PREFERRED_FOOTER_DOCUMENT) ?? forCountry.at(0);

    if (preferred === undefined) continue;

    links.push({ country: preferred.country, document: preferred.document });
  }

  return links;
};
