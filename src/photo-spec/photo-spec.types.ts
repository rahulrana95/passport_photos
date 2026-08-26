import type { CountrySlug } from '@/constants/country.constants';
import type { DocumentType } from '@/constants/document-type.constants';
import type { PhotoSpec } from './photo-spec.schemas';

/**
 * Head height expressed in every unit the pipeline needs, derived once.
 *
 * Authorities publish in different units — the US in millimetres, the Schengen
 * standard as a proportion of the photo. Deriving both here means no downstream
 * consumer ever converts ad hoc, which is how a millimetre value ends up
 * compared against a ratio.
 */
export interface ResolvedHeadHeight {
  readonly minMm: number;
  readonly maxMm: number;
  readonly minRatio: number;
  readonly maxRatio: number;
  /** The unit the authority actually published, kept for display and citation. */
  readonly authoredUnit: 'mm' | 'ratio';
}

export interface ResolvedPhotoSpec extends Omit<PhotoSpec, 'headHeight'> {
  readonly headHeight: ResolvedHeadHeight;
  /** True when lastVerified is older than the re-verification window. */
  readonly isStale: boolean;
}

export type SpecKey = `${CountrySlug}:${DocumentType}`;

export type SpecLookupResult =
  | { readonly found: true; readonly spec: ResolvedPhotoSpec }
  | { readonly found: false; readonly reason: 'unknown-country' | 'unsupported-document' };
