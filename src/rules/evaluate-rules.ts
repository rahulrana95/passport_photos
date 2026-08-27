import { RULE_STATUS_SEVERITY } from '@/constants/rule-status.constants';
import { OVERALL_STATUS_PRECEDENCE } from './aggregation.constants';
import { COVERAGE_SUMMARY } from './coverage-map';
import { CONFIDENCE_FLOOR_BY_EVIDENCE } from './rule-threshold.constants';
import { ALL_RULES, AUTOMATIC_RULES, MANUAL_RULES, ruleOrder } from './rule-registry';
import type { RuleStatus } from '@/constants/rule-status.constants';
import type { ResolvedPhotoSpec } from '@/photo-spec/photo-spec.types';
import type { EvidenceSource, FixGroup, RuleId, RuleSeverity } from './rule-id.constants';
import type {
  ComplianceReport,
  EvidenceConfidence,
  RuleDefinition,
  RuleInput,
  RuleOutcome,
  RuleResult,
} from './rule.types';

/**
 * Which confidence figure governs a rule.
 *
 * 'pixels' maps to nothing on purpose. A Laplacian variance or a clipped-pixel
 * ratio is arithmetic over the image; there is no model to be unsure, and
 * attaching a confidence to it would invite a downgrade that means nothing.
 */
const EVIDENCE_CONFIDENCE_KEY: Readonly<
  Record<EvidenceSource, keyof EvidenceConfidence | undefined>
> = {
  landmarks: 'landmarks',
  crown: 'crown',
  segmentation: 'segmentation',
  pixels: undefined,
  none: undefined,
};

const confidenceFor = (
  evidence: EvidenceSource,
  confidence: EvidenceConfidence,
): number | undefined => {
  const key = EVIDENCE_CONFIDENCE_KEY[evidence];
  return key === undefined ? undefined : confidence[key];
};

/**
 * The statuses a low confidence can take away.
 *
 * Only the three that assert something about the photograph. 'manual' is
 * already an admission that we are not deciding, and 'undetectable' is already
 * an admission that we could not measure — downgrading either would turn "we
 * did not measure this" into "we measured it but are unsure", which claims
 * more than happened rather than less.
 */
const ASSERTIONS: readonly RuleStatus[] = ['pass', 'fail', 'warning'];

/**
 * LOW CONFIDENCE NEVER BECOMES A PASS, AND NEVER BECOMES A FAIL EITHER.
 *
 * The obvious reading of "degrade to manual-check" is that an unreliable pass
 * should not be a pass. That half is easy. The other half matters as much: an
 * unreliable FAILURE is just as damaging in the other direction — it sends
 * somebody to retake a photograph that was fine, on the strength of a
 * measurement we have already decided not to trust. Confidence is a property
 * of the evidence, not of the answer, so it takes away the verdict rather than
 * softening it in one direction.
 *
 * The measurement survives the downgrade and is still shown. It is what we
 * saw, and hiding it would leave the reader with an instruction to check
 * something and nothing to check it against.
 */
const applyConfidence = (
  outcome: RuleOutcome,
  confidence: number | undefined,
  floor: number | undefined,
): { readonly status: RuleStatus; readonly outcome: RuleOutcome } => {
  const unreliable =
    floor !== undefined &&
    confidence !== undefined &&
    confidence < floor &&
    ASSERTIONS.includes(outcome.status);

  return unreliable
    ? {
        status: 'manual',
        outcome: {
          ...outcome,
          status: 'manual',
          messageId: 'shared.uncertain',
          // The instruction goes with the verdict. "Move 20% closer" derived
          // from a measurement we do not trust is a precise number pointing
          // in a direction we are not sure about.
          fix: undefined,
        },
      }
    : { status: outcome.status, outcome };
};

const toResult = (
  definition: RuleDefinition,
  outcome: RuleOutcome,
  confidence: number | undefined,
): RuleResult => {
  const adjusted = applyConfidence(
    outcome,
    confidence,
    CONFIDENCE_FLOOR_BY_EVIDENCE[definition.evidence],
  );

  return {
    ruleId: definition.id,
    requirements: definition.requirements,
    severity: definition.severity,
    status: adjusted.status,
    computedStatus: outcome.status,
    messageId: adjusted.outcome.messageId,
    measurement: adjusted.outcome.measurement,
    band: adjusted.outcome.band,
    fix: adjusted.outcome.fix,
    fixDeferredTo: undefined,
    confidence,
  };
};

const FIX_GROUP_BY_RULE: ReadonlyMap<RuleId, FixGroup | undefined> = new Map(
  ALL_RULES.map((rule) => [rule.id, rule.fixGroup]),
);

/**
 * Keeps one fix instruction per group and points the rest at it.
 *
 * The framing group is the whole reason this exists. A photograph taken a
 * little too far away fails head height, and the same crop then puts the eye
 * line low and the face off centre — three failures, one cause. Handed three
 * instructions, a reader moves closer, then moves up, then moves sideways, and
 * the first of those already invalidated the other two measurements.
 *
 * The rule earlier in the registry keeps its instruction, because the registry
 * is ordered by what to deal with first. The others keep their verdict and
 * their measurement — the failure is real and is still reported — and carry a
 * pointer to the rule whose correction also covers them.
 */
const resolveFixGroups = (results: readonly RuleResult[]): readonly RuleResult[] => {
  const keeper = new Map<FixGroup, RuleId>();

  for (const result of results) {
    const group = FIX_GROUP_BY_RULE.get(result.ruleId);
    if (group === undefined || result.fix === undefined) continue;
    if (!keeper.has(group)) keeper.set(group, result.ruleId);
  }

  return results.map((result) => {
    if (result.fix === undefined) return result;

    // One lookup covering both cases that keep an instruction: a rule in no
    // group at all, and the rule its group chose. Asking whether the group
    // exists and then whether it has a keeper would add a second question the
    // first pass has already answered — every grouped rule holding a fix was
    // registered up there, so that branch could never be taken.
    const group = FIX_GROUP_BY_RULE.get(result.ruleId);
    const kept = group === undefined ? undefined : keeper.get(group);

    return kept === undefined || kept === result.ruleId
      ? result
      : { ...result, fix: undefined, fixDeferredTo: kept };
  });
};

/**
 * What one rule contributes to the headline verdict.
 *
 * An advisory rule can never make a report fail and can never make it read as
 * unmeasured. Its findings are real but uncertain by nature — see the head
 * covering rule — and a headline of "does not meet the requirements" resting
 * on a silhouette that might be thick hair would be the confident wrong answer
 * this engine is built to avoid.
 */
const contributionOf = (status: RuleStatus, severity: RuleSeverity): RuleStatus => {
  if (severity === 'blocking') return status;
  return status === 'pass' || status === 'undetectable' ? 'pass' : 'warning';
};

const aggregate = (results: readonly RuleResult[]): RuleStatus =>
  results.reduce<RuleStatus>((worst, result) => {
    const contribution = contributionOf(result.status, result.severity);
    return OVERALL_STATUS_PRECEDENCE[contribution] < OVERALL_STATUS_PRECEDENCE[worst]
      ? contribution
      : worst;
  }, 'pass');

/**
 * Worst first, then registry order.
 *
 * The second key is not decoration. Sorting on severity alone leaves rules
 * that share a status in whatever order the engine happened to produce them,
 * and a report whose rows move between two runs of the same photograph reads
 * as guesswork rather than as measurement.
 */
const byImportance = (left: RuleResult, right: RuleResult): number =>
  RULE_STATUS_SEVERITY[left.status] - RULE_STATUS_SEVERITY[right.status] ||
  ruleOrder(left.ruleId) - ruleOrder(right.ruleId);

const runRules = (
  definitions: readonly RuleDefinition[],
  input: RuleInput,
  spec: ResolvedPhotoSpec,
): readonly RuleResult[] =>
  definitions.flatMap((definition) => {
    const outcome = definition.evaluate(input, spec);
    // Undefined means the specification does not state this requirement at
    // all. Omitted rather than reported as a pass — see RuleDefinition.
    return outcome === undefined
      ? []
      : [toResult(definition, outcome, confidenceFor(definition.evidence, input.confidence))];
  });

/**
 * Measurements plus specification in, a report out.
 *
 * Pure, and deliberately so: the same bundle and the same spec produce the
 * same report, byte for byte, every time. Everything uncertain happened
 * upstream in the detectors; by the time anything reaches here it is a number
 * with a confidence attached, and what this file does with it is arithmetic
 * and ordering.
 */
export const evaluateRules = (input: RuleInput, spec: ResolvedPhotoSpec): ComplianceReport => {
  const automatic = resolveFixGroups(runRules(AUTOMATIC_RULES, input, spec));
  const manual = runRules(MANUAL_RULES, input, spec);

  return {
    overall: aggregate(automatic),
    results: [...automatic].sort(byImportance),
    // Presented in registry order rather than sorted. They are all 'manual',
    // so there is nothing to sort by, and a fixed order means a reader who
    // checks this list twice finds it the same way up.
    manualChecklist: manual,
    coverage: COVERAGE_SUMMARY,
    spec,
  };
};
