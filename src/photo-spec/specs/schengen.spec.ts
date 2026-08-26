import type { PhotoSpec } from '../photo-spec.schemas';
import type { DeepPartial } from '../photo-spec.utils';
import type { CountrySlug } from '@/constants/country.constants';

/**
 * The base specification the Schengen member states share, derived from ICAO
 * 9303 / ISO-IEC 19794-5.
 *
 * Authored as a ratio because that is how the standard states it — the face
 * must occupy 70-80% of the photograph — rather than as millimetres, which
 * would bake in a conversion the authority never published.
 *
 * PROVISIONAL — not confirmed against a member state's own page by a human.
 */
export const SCHENGEN_VISA: PhotoSpec = {
  country: 'schengen',
  document: 'visa',
  print: { widthMm: 35, heightMm: 45, dpi: 300 },
  digital: { minEdgePx: 600, maxBytes: 1_000_000, format: 'jpeg' },
  headHeight: { unit: 'ratio', minRatio: 0.7, maxRatio: 0.8 },
  background: { colour: 'light-grey', hexRange: ['#d9d9d9', '#f5f5f5'], uniformityTolerance: 12 },
  glasses: 'permitted-no-glare',
  headCovering: 'religious-only',
  expression: 'neutral-mouth-closed',
  aiEditingPolicy: 'discouraged',
  maxAgeMonths: 6,
  source: 'https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en',
  lastVerified: '2026-08-26',
  verification: 'provisional',
  notes: ['Face must occupy 70-80% of the photograph, per ICAO 9303.'],
};

/**
 * Per-state deltas.
 *
 * Modelled as overrides rather than 29 copies so a change to the shared
 * standard is one edit, and so a state's genuine difference is visible as a
 * difference rather than buried in a duplicate.
 */
export const SCHENGEN_MEMBER_OVERRIDES: Partial<Record<CountrySlug, DeepPartial<PhotoSpec>>> = {};
