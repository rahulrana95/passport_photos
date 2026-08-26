import type { CountrySlug } from '@/constants/country.constants';
import type { DocumentType } from '@/constants/document-type.constants';

export interface CountryLinkGridProps {
  readonly heading: string;
  readonly documentType: DocumentType;
  /** Defaults to every country served. */
  readonly countries?: readonly CountrySlug[];
  /** Omitted from the list, so a page never links to itself. */
  readonly currentCountry?: CountrySlug;
}
