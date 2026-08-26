import type { SyntheticHeadFixture, SyntheticHeadSpec } from './synthetic-head.types';

/**
 * The easy case, exported by name.
 *
 * Named rather than reached through SYNTHETIC_HEAD_FIXTURES[0]: an indexed
 * lookup is optional under noUncheckedIndexedAccess, which forces every caller
 * to handle an absence that cannot happen.
 */
export const NOMINAL_HEAD_SPEC: SyntheticHeadSpec = {
  widthPx: 600,
  heightPx: 600,
  crownY: 90,
  chinY: 450,
  centreX: 300,
  headWidthPx: 260,
  eyeY: 240,
  backgroundLuminance: 245,
  headLuminance: 120,
  headCoveringPx: 0,
  noiseAmplitude: 2,
  seed: 1,
};

const withSpec = (overrides: Partial<SyntheticHeadSpec>): SyntheticHeadSpec => ({
  ...NOMINAL_HEAD_SPEC,
  ...overrides,
});

/**
 * The hard-case corpus.
 *
 * These are the documented failure modes from the crown-detection task, built
 * deliberately rather than hoped for. A general face dataset does not reliably
 * contain a bald head against a light wall or dark hair against a dark one, and
 * those are precisely the cases that decide whether this product works.
 */
export const SYNTHETIC_HEAD_FIXTURES: readonly SyntheticHeadFixture[] = [
  {
    name: 'nominal',
    description: 'Well-lit head on a plain light background. The easy case.',
    spec: NOMINAL_HEAD_SPEC,
  },
  {
    name: 'dark-hair-on-dark-background',
    description:
      'Head luminance within a few levels of the background. The classic segmentation failure: naive thresholding finds no edge at all.',
    spec: withSpec({ backgroundLuminance: 60, headLuminance: 52, seed: 2 }),
  },
  {
    name: 'bald-on-light-background',
    description: 'No hair mass above the crown, so the silhouette tapers where a detector expects volume.',
    spec: withSpec({ headWidthPx: 210, crownY: 120, seed: 3 }),
  },
  {
    name: 'head-covering',
    description:
      'A hat or hijab extends 45px above the crown. The topmost opaque pixel is the covering, not the skull — measuring to it overstates head height.',
    spec: withSpec({ headCoveringPx: 45, seed: 4 }),
  },
  {
    name: 'crown-above-frame',
    description: 'The top of the head is cropped out. Head height is unmeasurable and must not be guessed.',
    spec: withSpec({ crownY: -40, seed: 5 }),
  },
  {
    name: 'chin-below-frame',
    description: 'The chin is cropped out. Same requirement in the other direction.',
    spec: withSpec({ chinY: 640, seed: 6 }),
  },
  {
    name: 'off-centre',
    description: 'Subject well left of the midline; horizontal centring must fail.',
    spec: withSpec({ centreX: 180, seed: 7 }),
  },
  {
    name: 'head-too-small',
    description: 'Head occupies far less of the frame than any specification allows.',
    spec: withSpec({ crownY: 220, chinY: 380, headWidthPx: 120, eyeY: 285, seed: 8 }),
  },
  {
    name: 'head-too-large',
    description: 'Head overfills the frame; the crop needed would fall outside the source.',
    spec: withSpec({ crownY: 10, chinY: 590, headWidthPx: 460, eyeY: 260, seed: 9 }),
  },
  {
    name: 'overexposed',
    description: 'Highlights clipped to pure white; the background and the face merge.',
    spec: withSpec({ backgroundLuminance: 255, headLuminance: 250, noiseAmplitude: 1, seed: 10 }),
  },
  {
    name: 'underexposed',
    description: 'Shadows crushed to black. Exposure must be flagged before geometry is trusted.',
    spec: withSpec({ backgroundLuminance: 12, headLuminance: 4, noiseAmplitude: 1, seed: 11 }),
  },
  {
    name: 'noisy-sensor',
    description: 'Heavy sensor noise. Uniformity checks must tolerate this without calling it a patterned wall.',
    spec: withSpec({ noiseAmplitude: 18, seed: 12 }),
  },
];

/** Threshold used by the naive baseline detector in the fixtures' self-test. */
export const BASELINE_EDGE_THRESHOLD = 24;
