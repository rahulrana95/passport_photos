import type { PhotoSpec } from '../photo-spec.schemas';

/** PROVISIONAL — not confirmed against gov.uk by a human. */
export const UK_PASSPORT: PhotoSpec = {
  country: 'uk',
  document: 'passport',
  print: { widthMm: 35, heightMm: 45, dpi: 300 },
  digital: { minEdgePx: 600, maxBytes: 10_000_000, format: 'jpeg' },
  headHeight: { unit: 'mm', minMm: 29, maxMm: 34 },
  background: { colour: 'light-grey', hexRange: ['#d9d9d9', '#f2f2f2'], uniformityTolerance: 12 },
  // The UK permits glasses provided the eyes are clearly visible and unobscured
  // by glare or frames, which is a materially different rule from the US ban.
  glasses: 'permitted-no-glare',
  headCovering: 'religious-only',
  expression: 'neutral-mouth-closed',
  aiEditingPolicy: 'discouraged',
  maxAgeMonths: 1,
  source: 'https://www.gov.uk/photos-for-passports',
  lastVerified: '2026-08-26',
  verification: 'provisional',
  notes: ['Digital photos submitted online must have been taken within the last month.'],
};
