import { evaluateBand } from '@/measurement/band.utils';
import { NO_EVIDENCE_INPUT } from '@/rules/no-evidence.constants';
import type { RuleInput } from '@/rules/rule.types';

/**
 * A measurement bundle for a photograph that meets every requirement.
 *
 * Built as a passing baseline and broken one field at a time, so each test
 * says exactly what it is about: override the exposure and the test is about
 * exposure, and nothing else in the bundle has quietly moved. A per-test
 * hand-built bundle drifts, and the drift shows up as a test that passes for
 * the wrong reason.
 *
 * The bands match the seeded US passport specification, which is the one the
 * rule tests resolve.
 */
export const HEAD_HEIGHT_BAND = { min: 25.4, max: 34.9 };
export const EYE_LINE_BAND = { min: 28.6, max: 34.9 };

const PASSING_BACKGROUND = {
  verdict: 'acceptable',
  sampleCount: 40_000,
  uniformity: 4,
  shadowGradient: 2,
  meanColour: { red: 246, green: 246, blue: 246 },
  hasEnoughSamples: true,
  colourWithinRange: true,
  isUniform: true,
  isEvenlyLit: true,
} as const satisfies NonNullable<RuleInput['background']>;

/**
 * Named separately so the helpers below can rebuild it without unpacking a
 * union. Reaching into PASSING_RULE_INPUT.geometry means narrowing an
 * `ok: true | false` back down, and the guard that does it is a branch no
 * fixture can take — dead code in the one place tests should not have any.
 */
const PASSING_GEOMETRY = {
  ok: true,
  crop: { x: 100, y: 80, widthPx: 900, heightPx: 900 },
  measurements: {
    headHeightMm: 30,
    headHeight: evaluateBand(30, HEAD_HEIGHT_BAND),
    eyeLineFromBottomMm: 31,
    eyeLine: evaluateBand(31, EYE_LINE_BAND),
    horizontalOffsetRatio: 0,
    rollDegrees: 0,
  },
} as const satisfies Extract<RuleInput['geometry'], { ok: true }>;

export const PASSING_RULE_INPUT: RuleInput = {
  detection: { ok: true, hadOtherFaces: false },
  geometry: PASSING_GEOMETRY,
  crown: { ok: true, crownY: 40, confidence: 0.9, mayIncludeCovering: false },
  exposure: {
    verdict: 'well-exposed',
    tonalRange: 82,
    clippedBlackRatio: 0.001,
    clippedWhiteRatio: 0.002,
  },
  background: PASSING_BACKGROUND,
  sharpness: { verdict: 'sharp', laplacianVariance: 640, sampleCount: 90_000 },
  blendshapes: { eyeBlinkLeft: 0.02, eyeBlinkRight: 0.03, jawOpen: 0.04, mouthSmile: 0.05 },
  pose: { yawDegrees: 0, pitchDegrees: 0 },
  interOcularPx: 140,
  outputPx: { widthPx: 900, heightPx: 900 },
  confidence: { landmarks: 0.95, crown: 0.9, segmentation: 0.9 },
};

/**
 * The bundle produced when nothing ran at all.
 *
 * Re-exported from the engine rather than declared again here. The interface
 * needs the same object to size its skeleton, and two copies of "nothing ran"
 * would drift the moment a field is added to RuleInput — leaving the test
 * asserting one shape and the product laying out another.
 */
export const EMPTY_RULE_INPUT = NO_EVIDENCE_INPUT;

export const buildRuleInput = (overrides: Partial<RuleInput> = {}): RuleInput => ({
  ...PASSING_RULE_INPUT,
  ...overrides,
});

/** Replaces one geometry measurement, keeping the rest of a passing crop. */
export const withMeasurements = (
  overrides: Partial<Extract<RuleInput['geometry'], { ok: true }>['measurements']>,
): RuleInput =>
  buildRuleInput({
    geometry: {
      ...PASSING_GEOMETRY,
      measurements: { ...PASSING_GEOMETRY.measurements, ...overrides },
    },
  });

/** The background of a passing photo, with one property spoiled. */
export const withBackground = (
  overrides: Partial<NonNullable<RuleInput['background']>>,
): RuleInput => buildRuleInput({ background: { ...PASSING_BACKGROUND, ...overrides } });

export const headHeightOf = (millimetres: number): RuleInput =>
  withMeasurements({
    headHeightMm: millimetres,
    headHeight: evaluateBand(millimetres, HEAD_HEIGHT_BAND),
  });

export const eyeLineOf = (millimetres: number): RuleInput =>
  withMeasurements({
    eyeLineFromBottomMm: millimetres,
    eyeLine: evaluateBand(millimetres, EYE_LINE_BAND),
  });
