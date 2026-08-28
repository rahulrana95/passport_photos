import type { PhotoSpec } from '../photo-spec.schemas';

/**
 * VERIFIED 2026-08-28 against the Interior Ministry's Fotomustertafel and the
 * adult Lichtbild-Schablone, both published by the BMI and distributed by the
 * Bundesdruckerei, both dated July 2025 (BMI24037 and BMI24048).
 *
 * PUBLISHED ONLY AS A PDF, which is the first spec here that is. The web pages
 * that would carry the same rules are the ones a reader is sent to, but the
 * numbers live on a printable template — so the template is what is cited.
 *
 * The German and French photographs are the same size, taken to the same
 * proportion, and are not interchangeable: France measures to the top of the
 * skull with hair excluded, Germany to the "oberes Kopfende", the top of the
 * head as it appears. On anyone with volume that is several millimetres, and
 * the whole tolerance is four.
 */
export const GERMANY_PASSPORT: PhotoSpec = {
  country: 'germany',
  document: 'passport',
  // "Bildgröße 35 × 45 mm?" — the first check on the template.
  print: { widthMm: 35, heightMm: 45 },
  // No digital requirement is published, because since May 2025 there is no
  // upload: see `submission`.
  /**
   * "Optimale Gesichtshöhe, minimal (32 mm)" to "maximal (36 mm)", from the
   * chin line to the upper end of the head. The Fotomustertafel states the same
   * band as a proportion — "Das Gesicht nimmt 70 bis 80 % der Höhe des Fotos
   * ein" — and 32 and 36 against a 45mm photo are 71 and 80 per cent, so the
   * two published forms agree. Authored in millimetres because that is the
   * figure on the template a clerk actually holds against the photograph.
   */
  headHeight: { unit: 'mm', minMm: 32, maxMm: 36 },
  /**
   * "Hintergrund einfarbig (vorzugsweise hellgrau)" — a single colour,
   * preferably light grey, shadow-free, contrasting with face and hair.
   *
   * Germany states a preference where others state a rule, so the range is the
   * light grey it names. White is not forbidden the way it is in France, but it
   * is not the colour the template asks for either.
   */
  background: {
    colour: 'light-grey',
    hexRanges: [['#d0d0d0', '#ededed']],
    uniformityTolerance: 12,
  },
  // "Schablone so verschieben, dass die Kinnunterkante auf der Kinnlinie liegt
  // ... Oberes Kopfende im blau markierten Bereich" — the top of the head as
  // photographed, not the skull beneath the hair.
  crownDefinition: 'visible-top',
  // Faults illustrated: "Brillenrahmen verdeckt Augen", "Brillengläser zu
  // dunkel, Spiegelung".
  glasses: 'permitted-no-glare',
  // "Kopfbedeckungen sind nur aus religiösen Gründen zulässig."
  headCovering: 'religious-only',
  // "Gesichtsausdruck neutral? Lippen geschlossen?"
  expression: 'neutral-mouth-closed',
  /**
   * Since 1 May 2025 only digital photographs captured at the authority itself,
   * or sent to it by a photographer over a secure channel, may be used for a
   * passport or identity card. A photograph you took is not submissible on any
   * medium — which is precisely why knowing whether it would have passed is
   * still worth something: you can find out what is wrong before the
   * appointment rather than during it.
   */
  submission: 'authority-capture',
  // "Mit Retuschen/Filter", "Weichzeichnen" and "verpixeltes Gesicht" are all
  // illustrated as faults.
  aiEditingPolicy: 'prohibited',
  // No maximum age appears anywhere on either published document. Left unset
  // rather than filled with the six months everybody repeats.
  // The Bundesdruckerei copy of the ministry's own Fotomustertafel. Cited in
  // preference to the BMI landing page for it, which refuses the audit and
  // which a reader following the citation may not reach either.
  source: 'https://www.bundesdruckerei-gmbh.de/files/dokumente/pdf/fotomustertafel.pdf',
  lastVerified: '2026-08-28',
  verification: 'verified',
  notes: [
    'Since 1 May 2025 the photo must be taken at the passport office or sent there directly by a photographer. A photo you took yourself cannot be submitted.',
    'Head height is measured to the top of the head as photographed, hair included — unlike France, which measures to the skull.',
    'The published standard names no maximum photo age, only that the picture must be a true likeness.',
    'Retouching, soft-focus and filters are all illustrated as reasons for rejection.',
    'For children under 10 the face may fill 50 to 80 per cent of the height, and under 6 there are further allowances.',
  ],
};
