import type { CountrySlug } from '@/constants/country.constants';
import type { DocumentType } from '@/constants/document-type.constants';

export interface CountryLinkGridProps {
  readonly heading: string;
  readonly documentType: DocumentType;
  /** Defaults to every country with a served specification — never to a slug with no page. */
  readonly countries?: readonly CountrySlug[];
  /** Omitted from the list, so a page never links to itself. */
  readonly currentCountry?: CountrySlug;
}
