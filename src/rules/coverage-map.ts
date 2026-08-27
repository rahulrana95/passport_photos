import {
  APPLICATION_REQUIREMENT_DISPOSITION,
  APPLICATION_REQUIREMENT_IDS,
  ISO_REQUIREMENT_DISPOSITION,
  ISO_REQUIREMENT_IDS,
} from './iso-requirement.constants';
import { AUTOMATIC_RULE_IDS } from './rule-id.constants';
import { ALL_RULES } from './rule-registry';
import type { RequirementDisposition } from './iso-requirement.constants';
import type { RuleId } from './rule-id.constants';
import type { CoverageSummary, RequirementCoverage, RequirementReference } from './rule.types';

/**
 * THE COVERAGE MAP, WHICH IS PUBLISHED RATHER THAN KEPT.
 *
 * Every compliance tool lists what it checks. Almost none lists what it does
 * not, and the omission is doing real work: a reader who sees eighteen green
 * ticks and no mention of red-eye reasonably concludes that red-eye was fine.
 * It was never looked at.
 *
 * So this map covers all thirty requirements, and a reader can see that four
 * of them are not recoverable from a photograph by anyone, two are not built
 * yet, seven are theirs to check and seventeen are measured. That is a less
 * flattering number than "we check your photo against the requirements" and it
 * is the number that makes the seventeen worth believing.
 *
 * Derived from the rule registry, never authored alongside it. A map written
 * by hand is a map that drifts, and the direction it drifts is always the same
 * one: it keeps claiming a check that was removed.
 */

const referenceKey = (requirement: RequirementReference): string =>
  `${requirement.standard}:${requirement.id}`;

const isAutomatic = (id: RuleId): boolean => (AUTOMATIC_RULE_IDS as readonly string[]).includes(id);

const rulesAnswering = (requirement: RequirementReference): readonly RuleId[] =>
  ALL_RULES.filter((rule) =>
    rule.requirements.some((candidate) => referenceKey(candidate) === referenceKey(requirement)),
  ).map((rule) => rule.id);

const coverageFor = (
  requirement: RequirementReference,
  disposition: RequirementDisposition,
): RequirementCoverage => {
  if (disposition !== 'by-rule') return { requirement, kind: disposition, ruleIds: [] };

  const ruleIds = rulesAnswering(requirement);

  // A requirement answered by any automatic rule counts as measured, even
  // where a manual rule also touches it. Head coverings are the case: the
  // silhouette check reports what it can see and the checklist asks the reader
  // about their own hat, and calling that requirement "manual" would hide a
  // measurement we do make.
  return {
    requirement,
    kind: ruleIds.some(isAutomatic) ? 'checked' : 'manual',
    ruleIds,
  };
};

const countOf = (entries: readonly RequirementCoverage[], kind: RequirementCoverage['kind']): number =>
  entries.filter((entry) => entry.kind === kind).length;

export const buildCoverageSummary = (): CoverageSummary => {
  const entries: readonly RequirementCoverage[] = [
    ...ISO_REQUIREMENT_IDS.map((id) =>
      coverageFor({ standard: 'iso-19794-5', id }, ISO_REQUIREMENT_DISPOSITION[id]),
    ),
    ...APPLICATION_REQUIREMENT_IDS.map((id) =>
      coverageFor({ standard: 'issuing-authority', id }, APPLICATION_REQUIREMENT_DISPOSITION[id]),
    ),
  ];

  return {
    entries,
    checkedCount: countOf(entries, 'checked'),
    manualCount: countOf(entries, 'manual'),
    undetectableCount: countOf(entries, 'undetectable'),
    plannedCount: countOf(entries, 'planned'),
    totalCount: entries.length,
  };
};

/**
 * Built once. The registry and the disposition table are both compile-time
 * constants, so the map cannot change between reports, and rebuilding it for
 * every photograph would be recomputing a constant.
 */
export const COVERAGE_SUMMARY: CoverageSummary = buildCoverageSummary();
