import { listServableSpecs } from '@/photo-spec/photo-spec.registry';
import { RELATED_COUNTRY_LIMIT } from './country-page.constants';
import type { CountrySlug } from '@/constants/country.constants';
import type { PhotoSpec } from '@/photo-spec/photo-spec.schemas';
import type { ResolvedPhotoSpec } from '@/photo-spec/photo-spec.types';

/**
 * The other countries this page links to, and only ones with a page.
 *
 * Linked from the SERVABLE registry rather than from the country list. Every
 * unserved country in that list would be a link to a 404 — repeated on every
 * page, which is how a whole property gets marked as broken rather than one
 * URL. The same mistake the sitemap made, in a place that is harder to notice.
 *
 * Same document type only. A reader on a passport page is applying for a
 * passport; sending them to a visa page for another country is a link nobody
 * asked for, and it dilutes the ones that matter.
 */
export const relatedCountries = (
  current: ResolvedPhotoSpec,
  specs: readonly PhotoSpec[] = listServableSpecs(),
): readonly CountrySlug[] =>
  specs
    .filter((spec) => spec.document === current.document && spec.country !== current.country)
    .map((spec) => spec.country)
    .slice(0, RELATED_COUNTRY_LIMIT);
