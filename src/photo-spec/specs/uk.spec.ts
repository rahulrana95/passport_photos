import type { PhotoSpec } from '../photo-spec.schemas';

/**
 * VERIFIED 2026-08-27 against gov.uk's published requirements.
 *
 * TWO BACKGROUND COLOURS, and they are not near each other. The printed-photo
 * guidance says "plain cream or light grey"; the digital guidance says "plain
 * light-coloured". Cream is warm and light grey is neutral, so a single range
 * wide enough to hold both would also accept every tint in between — a mint
 * wall would pass a check that HM Passport Office would fail. Two ranges accept
 * the two published colours and nothing in the gap.
 *
 * Pure white is deliberately outside both. It is one of the commonest reasons a
 * UK photograph is rejected, because a pale subject has no edge against it.
 */
export const UK_PASSPORT: PhotoSpec = {
  country: 'uk',
  document: 'passport',
  print: { widthMm: 35, heightMm: 45, dpi: 300 },
  // 600 x 750 minimum. minEdgePx governs the SHORTER edge, and at the 35:45
  // aspect a 600px width puts the height at 750 exactly.
  digital: { minEdgePx: 600, maxBytes: 10_000_000, format: 'jpeg' },
  headHeight: { unit: 'mm', minMm: 29, maxMm: 34 },
  background: {
    colour: 'light-grey',
    hexRanges: [
      ['#d9d9d9', '#f2f2f2'],
      ['#f4efea', '#fdfbf7'],
    ],
    uniformityTolerance: 12,
  },
  // "From the crown of your head to your chin" — the skull, not the hair.
  crownDefinition: 'skull',
  /**
   * Glasses are PERMITTED, with conditions, and this is worth stating plainly
   * because the opposite is widely repeated. gov.uk: "You should not wear
   * glasses unless you have to... they cannot be sunglasses or tinted glasses,
   * and you must make sure your eyes are not covered by the frames or any
   * glare, reflection or shadow." That is a materially different rule from the
   * United States' ban, and a check that copied the US rule here would send
   * people to retake a photograph that was fine.
   */
  glasses: 'permitted-no-glare',
  headCovering: 'religious-only',
  expression: 'neutral-mouth-closed',
  aiEditingPolicy: 'discouraged',
  maxAgeMonths: 1,
  source: 'https://www.gov.uk/photos-for-passports',
  lastVerified: '2026-08-27',
  verification: 'verified',
  notes: [
    'Printed guidance says "plain cream or light grey"; digital guidance says "plain light-coloured". Both are accepted here.',
    'Pure white is not accepted: it is a common rejection reason for lack of contrast against pale skin and clothing.',
    'The photo must have been taken in the last month, which is far stricter than the six months most authorities allow.',
    'Digital uploads accept 50KB to 10MB.',
  ],
};
