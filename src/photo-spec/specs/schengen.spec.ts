import type { PhotoSpec } from '../photo-spec.schemas';
import type { DeepPartial } from '../photo-spec.utils';
import type { CountrySlug } from '@/constants/country.constants';

/**
 * VERIFIED 2026-08-27, and the citation is the part that changed.
 *
 * The Visa Code — Regulation (EC) No 810/2009, Article 13(4) — publishes no
 * dimensions at all. It delegates entirely to ICAO Doc 9303. The source on this
 * spec used to point at the Commission's general visa-policy page, which also
 * states neither the size nor the proportion, and a "verified on" line linking
 * to a page that does not contain the numbers is worse than no citation:
 * it looks checked. It now points at the Commission's own ICAO photograph
 * guidelines, which state the proportion in the words below.
 *
 * Authored as a ratio because that is how the standard states it — the face
 * must occupy 70-80% of the photograph — rather than as millimetres, which
 * would bake in a conversion the authority never published. On the 45mm height
 * that is 32-36mm, and member-state templates publish it that way.
 */
export const SCHENGEN_VISA: PhotoSpec = {
  country: 'schengen',
  document: 'visa',
  print: { widthMm: 35, heightMm: 45, dpi: 300 },
  digital: { minEdgePx: 600, maxBytes: 1_000_000, format: 'jpeg' },
  headHeight: { unit: 'ratio', minRatio: 0.7, maxRatio: 0.8 },
  background: {
    colour: 'light-grey',
    hexRanges: [['#d9d9d9', '#f2f2f2']],
    uniformityTolerance: 12,
  },
  // Chin to the top of the skull. High-volume hair is excluded, which is the
  // opposite of the United States' rule and the reason this is per-spec.
  crownDefinition: 'skull',
  glasses: 'permitted-no-glare',
  headCovering: 'religious-only',
  expression: 'neutral-mouth-closed',
  // The common standard governs the photograph, not who may press the shutter; member states differ, and where one restricts it that belongs on the member state's own spec.
  submission: 'self-service',
  aiEditingPolicy: 'discouraged',
  maxAgeMonths: 6,
  source:
    'https://home-affairs.ec.europa.eu/document/download/5bb16566-c8c2-4afb-b038-530f488cb72a_en?filename=icao_photograph_guidelines_en.pdf',
  lastVerified: '2026-08-27',
  verification: 'verified',
  notes: [
    'European Commission ICAO photograph guidelines: "A close up of your head and the top of your shoulders so that your face takes up 70-80% of the photograph."',
    'Regulation (EC) No 810/2009 Article 13(4) states no dimensions itself; it defers to ICAO Doc 9303.',
    'The Commission guidelines give a width of 35-40mm. 35mm is authored here because it is the width member-state templates use and the one that pairs with the 45mm height.',
    'Background: "plain light-coloured". Neutral light grey is the member-state norm.',
  ],
};

/**
 * Per-state deltas.
 *
 * Modelled as overrides rather than 29 copies so a change to the shared
 * standard is one edit, and so a state's genuine difference is visible as a
 * difference rather than buried in a duplicate.
 */
export const SCHENGEN_MEMBER_OVERRIDES: Partial<Record<CountrySlug, DeepPartial<PhotoSpec>>> = {};
