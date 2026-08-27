import type { RuleInput } from './rule.types';

/**
 * The bundle produced when nothing has run.
 *
 * Two jobs, and it is the same object for both. It is the input behind the
 * most important single assertion in the engine's suite — a report built from
 * it must not contain a pass anywhere — and it is what the interface has
 * before an analysis returns, which is how the result panel knows how many
 * rows a specification is going to produce before it has any results to put
 * in them.
 *
 * That second use is why it lives here rather than in the test fixtures: a
 * skeleton whose shape came from a test helper would be a production layout
 * decided by a file nobody ships.
 */
export const NO_EVIDENCE_INPUT: RuleInput = {
  detection: undefined,
  geometry: undefined,
  crown: undefined,
  exposure: undefined,
  background: undefined,
  sharpness: undefined,
  blendshapes: undefined,
  pose: undefined,
  interOcularPx: undefined,
  outputPx: undefined,
  confidence: { landmarks: undefined, crown: undefined, segmentation: undefined },
};
