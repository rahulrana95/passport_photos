import type { PhotoSpec } from '../photo-spec.schemas';

/**
 * VERIFIED 2026-08-28 against netherlandsworldwide.nl, the government's own
 * English-language service, which publishes the same table the Dutch pages do.
 *
 * THE SMALLEST HEAD IN THE REGISTRY, and by a distance: 26 to 30 millimetres
 * from chin to crown against France's 32 to 36 on an identically sized
 * photograph. A French photograph put into a Dutch application is not slightly
 * out, it is four millimetres past the top of the band, and the reverse is a
 * face too small to be measured. These two neighbours are the sharpest evidence
 * that "European passport photo" is not one requirement.
 *
 * The Netherlands also publishes a face WIDTH — 16 to 20 millimetres ear to ear
 * — which no other authority here states. It is recorded in the notes rather
 * than the schema: one authority's extra measurement does not earn a field
 * every other spec would leave empty.
 */
export const NETHERLANDS_PASSPORT: PhotoSpec = {
  country: 'netherlands',
  document: 'passport',
  // "Standard format: 35 mm x 45 mm (width x height)" and "minimum 400 dpi
  // resolution" — one of the few authorities that states a print resolution,
  // and a higher one than the 300 the others use.
  print: { widthMm: 35, heightMm: 45, dpi: 400 },
  // No pixel requirement is published: the photo is printed and handed over.
  // "Ages 11 and above: between 26 mm and 30 mm from chin to crown."
  headHeight: { unit: 'mm', minMm: 26, maxMm: 30 },
  /**
   * "light grey, light blue or white" — three colours, plain, one colour, no
   * fade, with sufficient contrast against the head.
   *
   * Three ranges rather than one, for the reason the United Kingdom needed two:
   * a single range spanning grey to blue to white would also accept every tint
   * between them.
   */
  background: {
    colour: 'light-grey',
    hexRanges: [
      ['#d9d9d9', '#f0f0f0'],
      ['#cfe0f0', '#e8f2fb'],
      ['#f7f7f7', '#ffffff'],
    ],
    uniformityTolerance: 12,
  },
  // "from chin to crown" — the kruin, the crown of the skull.
  crownDefinition: 'skull',
  // "eyes fully visible, fully transparent lenses, no glare on the glasses".
  glasses: 'permitted-no-glare',
  // Permitted only where religion or belief does not allow the head to be
  // uncovered, or where medical treatment has caused hair loss.
  headCovering: 'religious-only',
  // "neutral expression, looking straight at the camera, mouth closed".
  expression: 'neutral-mouth-closed',
  // The photo is printed and submitted in person; the authority does not
  // restrict who may take it.
  submission: 'self-service',
  // "unaltered by computer software", listed among the quality requirements.
  aiEditingPolicy: 'prohibited',
  // "no more than six months old when the application is submitted".
  maxAgeMonths: 6,
  source: 'https://www.netherlandsworldwide.nl/passport-id-card/photo-requirements',
  lastVerified: '2026-08-28',
  verification: 'verified',
  notes: [
    'The head must measure 26 to 30 millimetres from chin to crown — markedly smaller than France or Germany on the same size photo.',
    'The face must also measure 16 to 20 millimetres from ear to ear, a width requirement no other authority here publishes.',
    'Three background colours are accepted: light grey, light blue or white.',
    'Black and white photos are not allowed, and the print must be at least 400 dpi on smooth photo paper.',
    'For children aged 10 and under the head may measure 19 to 30 millimetres.',
  ],
};
