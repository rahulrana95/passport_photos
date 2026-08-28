import type { PhotoSpec } from '../photo-spec.schemas';

/**
 * VERIFIED 2026-08-28 against service-public.fr, which the Interior Ministry
 * maintains and which states the norms as a table. That page carries its own
 * verification date of 11 March 2026.
 *
 * WHITE IS FORBIDDEN, in as many words: "Le fond blanc est interdit." France is
 * the clearest case in the registry of a rule that is the exact opposite of a
 * neighbour's — the United States requires white and rejects everything else.
 * A single "plain background" check would fail one country or the other, and
 * somebody applying for both in the same month needs two photographs.
 *
 * The two accepted colours are given as examples rather than a closed list
 * ("de couleur claire (bleu clair ou gris clair par exemple)"), so the ranges
 * cover the two named colours and the label says light-coloured. A range wide
 * enough for every "light colour" would also accept the white the page bans.
 */
export const FRANCE_PASSPORT: PhotoSpec = {
  country: 'france',
  document: 'passport',
  // "Largeur : 3,5 cm / Hauteur : 4,5 cm". No print resolution is published.
  print: { widthMm: 35, heightMm: 45 },
  // No digital requirement, because there is no upload: see `submission`.
  headHeight: { unit: 'mm', minMm: 32, maxMm: 36 },
  background: {
    colour: 'light-grey',
    hexRanges: [
      ['#d9d9d9', '#f0f0f0'],
      ['#cfe0f0', '#e8f2fb'],
    ],
    uniformityTolerance: 12,
  },
  /**
   * "du bas du menton au sommet du crâne (hors cheveux)" — to the top of the
   * skull, hair excluded, and the page says so parenthetically because it is
   * the measurement people get wrong.
   */
  crownDefinition: 'skull',
  // "vous n'êtes pas obligé de les porter... La monture ne doit pas être épaisse
  // et ne pas masquer les yeux. Les verres ne doivent être ni teintés, ni
  // colorés et sans reflet."
  glasses: 'permitted-no-glare',
  /**
   * "La tête doit être nue (pas de chapeau, foulard ou serre-tête par exemple)."
   *
   * No religious exemption appears on the page, and foulard is named
   * explicitly. Recorded as published rather than softened to match the
   * neighbours: a reader who covers their head needs to know before they book
   * the appointment, not after.
   */
  headCovering: 'prohibited',
  expression: 'neutral-mouth-closed',
  /**
   * The photo must come from a photographer authorised by the Interior
   * Ministry or a booth running a system it has certified. A photograph taken at home cannot be
   * submitted at all — which makes checking one before you pay for a session
   * the only thing this product can usefully do here.
   */
  submission: 'authorised-photographer',
  aiEditingPolicy: 'discouraged',
  // "prise il y a moins de 6 mois"
  maxAgeMonths: 6,
  source: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F10619',
  lastVerified: '2026-08-28',
  verification: 'verified',
  notes: [
    'A plain white background is explicitly forbidden — the opposite of the United States requirement.',
    'The head must be bare: hats, scarves and headbands are all named as unacceptable, with no exemption published.',
    'The photo must be taken by a photographer or booth authorised by the Interior Ministry, so a self-taken photo cannot be submitted.',
    'The face must fill 70 to 80 per cent of the height, which is the same band the 32 to 36 millimetre range describes.',
  ],
};
