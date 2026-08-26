import type { PhotoSpec } from '../photo-spec.schemas';

/**
 * PROVISIONAL. Values are believed correct but have not been confirmed against
 * travel.state.gov by a human. Not served until that happens.
 */
export const US_PASSPORT: PhotoSpec = {
  country: 'us',
  document: 'passport',
  print: { widthMm: 50.8, heightMm: 50.8, dpi: 300 },
  digital: { minEdgePx: 600, maxEdgePx: 1200, maxBytes: 240_000, format: 'jpeg' },
  headHeight: { unit: 'mm', minMm: 25.4, maxMm: 34.9 },
  eyeLine: { minFromBottomMm: 28.6, maxFromBottomMm: 34.9 },
  background: { colour: 'white', hexRange: ['#f2f2f2', '#ffffff'], uniformityTolerance: 12 },
  glasses: 'prohibited',
  headCovering: 'religious-only',
  expression: 'neutral-mouth-closed',
  aiEditingPolicy: 'prohibited',
  maxAgeMonths: 6,
  source: 'https://travel.state.gov/content/travel/en/passports/how-apply/photos.html',
  lastVerified: '2026-08-26',
  verification: 'provisional',
  notes: [
    'Glasses have been prohibited since November 2016, including without glare.',
    'Since 1 January 2026 photos showing signs of AI editing are automatically flagged.',
  ],
};

export const US_VISA: PhotoSpec = {
  ...US_PASSPORT,
  document: 'visa',
  source: 'https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/photos.html',
  notes: ['Shares the passport photo standard.'],
};
