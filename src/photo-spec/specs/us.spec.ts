import type { PhotoSpec } from '../photo-spec.schemas';

/**
 * VERIFIED 2026-08-27 against the State Department's published requirements.
 *
 * HEAD HEIGHT IS AUTHORED AS A PROPORTION, not in millimetres, and that is the
 * correction that matters most here. State publishes three forms of the same
 * rule — "1 – 1 3/8 inches", "(25 – 35 mm)", and 50%–69% of the image height —
 * and they do not agree: 1 inch is 25.4mm, so enforcing the millimetre figure
 * rejects a photograph at 25.1mm that the inch figure accepts, and vice versa.
 * The proportion is what the biometric pipeline actually operates on, so that
 * is what is authored and the other two are presentations of it.
 */
export const US_PASSPORT: PhotoSpec = {
  country: 'us',
  document: 'passport',
  // 2 x 2 inches exactly. 50.8, not the 51 the page rounds to, because the
  // inch is the published unit and every proportion below divides into it.
  print: { widthMm: 50.8, heightMm: 50.8, dpi: 300 },
  /**
   * The online passport renewal limits, which are NOT the visa limits.
   *
   * 240KB is the DS-160 consular ceiling and it was on this spec by mistake —
   * a passport upload accepts up to 10MB, so the budget was being squeezed by
   * a factor of forty for no reason, costing quality on every photograph.
   */
  digital: { minEdgePx: 600, maxEdgePx: 1200, maxBytes: 10_000_000, format: 'jpeg' },
  headHeight: { unit: 'ratio', minRatio: 0.5, maxRatio: 0.69 },
  // 1 1/8 to 1 3/8 inches from the bottom edge, which is the 56%-69% the photo
  // composition template states. Published in both forms; these are the inches.
  eyeLine: { minFromBottomMm: 28.6, maxFromBottomMm: 34.9 },
  background: {
    colour: 'white',
    // "plain white or off-white" — one range, because those are one colour
    // family rather than two, unlike the United Kingdom's.
    hexRanges: [['#f2f2f2', '#ffffff']],
    uniformityTolerance: 12,
  },
  crownDefinition: 'visible-top',
  glasses: 'prohibited',
  headCovering: 'religious-only',
  expression: 'neutral-mouth-closed',
  aiEditingPolicy: 'prohibited',
  maxAgeMonths: 6,
  source: 'https://travel.state.gov/content/travel/en/passports/how-apply/photos.html',
  lastVerified: '2026-08-27',
  verification: 'verified',
  notes: [
    'Head height is measured to the top of the hair, not the skull: "the top of the head, including the hair, to the bottom of the chin".',
    'Glasses have been prohibited since November 2016, with a documented medical exception.',
    'Since 1 January 2026 photos showing signs of AI editing are automatically flagged.',
    'Uploads accept 54KB to 10MB. The floor is not enforced here because nothing reads it — see tasks.todo.',
  ],
};

/**
 * The consular photograph, which shares the geometry and not the file limits.
 *
 * Spread from the passport spec because the rules genuinely are the same rules,
 * and the two places they differ are stated here rather than left to be
 * inherited by accident — which is how the 240KB ceiling ended up on the
 * passport in the first place.
 */
export const US_VISA: PhotoSpec = {
  ...US_PASSPORT,
  document: 'visa',
  // The CEAC upload tool rejects anything larger, silently.
  digital: { minEdgePx: 600, maxEdgePx: 1200, maxBytes: 240_000, format: 'jpeg' },
  source: 'https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/photos.html',
  lastVerified: '2026-08-27',
  verification: 'verified',
  notes: [
    'Shares the passport geometry: head 50%-69% of image height, eyes 56%-69% from the bottom.',
    'The DS-160 upload ceiling is 240KB, and the tool rejects a larger file without saying why.',
  ],
};
