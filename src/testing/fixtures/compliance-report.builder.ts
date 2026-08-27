import { evaluateRules } from '@/rules/evaluate-rules';
import { listAuthoredSpecs } from '@/photo-spec/photo-spec.registry';
import { resolveSpec } from '@/photo-spec/photo-spec.utils';
import {
  EMPTY_RULE_INPUT,
  PASSING_RULE_INPUT,
  headHeightOf,
} from './rule-input.builder';
import type { ComplianceReport } from '@/rules/rule.types';
import type { PhotoSpec } from '@/photo-spec/photo-spec.schemas';
import type { ResolvedPhotoSpec } from '@/photo-spec/photo-spec.types';

/** Fixed, so a report built twice is the same report. */
const NOW = new Date('2026-01-01T00:00:00Z');

/**
 * A real specification, resolved.
 *
 * The authored registry rather than a hand-rolled object: a fixture assembled
 * here would drift the moment a rule started reading a field it never had, and
 * the drift would show up as a test that passes against a spec nobody ships.
 */
export const fixtureSpec = (
  specs: readonly PhotoSpec[] = listAuthoredSpecs(),
): ResolvedPhotoSpec => {
  const [spec] = specs;
  // Loud rather than silent. An empty registry would otherwise produce a
  // report with no rows, and every panel test would pass against a screen
  // showing nothing.
  if (spec === undefined) throw new Error('The specification registry is empty.');

  return resolveSpec(spec, NOW);
};

/** Every automatic rule passing. */
export const passingReport = (): ComplianceReport =>
  evaluateRules(PASSING_RULE_INPUT, fixtureSpec());

/** Nothing measured at all — the report where not one rule can assert a pass. */
export const undetectableReport = (): ComplianceReport =>
  evaluateRules(EMPTY_RULE_INPUT, fixtureSpec());

/**
 * A head well outside the band, which fails the single most common rule.
 *
 * Built by moving one measurement rather than by hand-writing statuses: a
 * fixture that asserted its own verdicts would let the engine and the panel
 * disagree without any test noticing.
 */
export const failingReport = (): ComplianceReport =>
  evaluateRules({ ...PASSING_RULE_INPUT, ...headHeightOf(12) }, fixtureSpec());
