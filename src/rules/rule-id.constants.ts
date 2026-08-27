/**
 * Every rule the engine can evaluate, in the order a report presents them.
 *
 * ORDER IS MEANING HERE, in two ways that both matter.
 *
 * It is the tie-break for display: results sort by how bad they are first and
 * by this list second, so two failures always appear in the same order for the
 * same photo. A report whose rows shuffle between runs reads as guesswork.
 *
 * It is also the precedence for resolving fix instructions that contradict one
 * another — the rule earlier in this list keeps its instruction and the later
 * one defers. So the list is ordered by what a person should deal with first:
 * whether we are even looking at the right face, then the framing everything
 * else is measured against, then the capture, then the pose, then expression.
 */
export const AUTOMATIC_RULE_IDS = [
  'single-subject',
  'head-height',
  'eye-line',
  'horizontal-centring',
  'eye-distance',
  'resolution',
  'focus',
  'exposure',
  'background-colour',
  'background-uniformity',
  'background-shadow',
  'head-tilt',
  'head-turn',
  'head-pitch',
  'eyes-open',
  'mouth-closed',
  'neutral-expression',
  'head-covering-visible',
] as const;

/**
 * Rules that are always answered by the reader, never by us.
 *
 * These are not stubs for detection we intend to add. Each one asks about
 * something a person looking at their own photo settles in a second and a
 * model does not settle at all — whether those are their everyday glasses,
 * whether the print has a crease, when the photo was taken.
 */
export const MANUAL_RULE_IDS = [
  'glasses',
  'head-covering-policy',
  'veil-over-face',
  'hair-across-eyes',
  'ink-or-crease',
  'photo-age',
] as const;

export const RULE_IDS = [...AUTOMATIC_RULE_IDS, ...MANUAL_RULE_IDS] as const;

export type AutomaticRuleId = (typeof AUTOMATIC_RULE_IDS)[number];
export type ManualRuleId = (typeof MANUAL_RULE_IDS)[number];
export type RuleId = (typeof RULE_IDS)[number];

/**
 * Whether failing this rule means the photo does not meet the requirement, or
 * only that it is worth a look.
 *
 * Advisory exists for one honest reason: some findings are real but uncertain
 * by nature. A silhouette that looks flat-topped may be a hat or may be a
 * particular head of hair, and telling someone their photo is rejected on that
 * basis would be a confident answer to a question the pixels do not settle.
 */
export const RULE_SEVERITIES = ['blocking', 'advisory'] as const;

export type RuleSeverity = (typeof RULE_SEVERITIES)[number];

/**
 * Rules whose fixes are alternative descriptions of one physical action, so at
 * most one of their instructions may be shown.
 *
 * Only framing qualifies today, and it is the case the design exists for:
 * moving closer makes the head taller AND moves the eye line AND changes the
 * centring. Emitting all three instructions would have the reader move closer,
 * then move up, then move sideways, when the first action already changed the
 * other two measurements.
 *
 * Rules that are merely fixed at the same time do NOT belong here. "Retake in
 * sharper focus" and "retake with more light" are both retake instructions and
 * they compose perfectly well; suppressing one would lose a real finding.
 */
export const FIX_GROUPS = ['framing'] as const;

export type FixGroup = (typeof FIX_GROUPS)[number];

/**
 * Where a rule's confidence comes from, which decides what can undermine it.
 *
 * 'pixels' means the measurement is arithmetic over the image and carries no
 * model confidence at all — a Laplacian variance is what it is. Those rules
 * are never downgraded, because there is nothing to be unconfident about.
 */
export const EVIDENCE_SOURCES = ['landmarks', 'crown', 'segmentation', 'pixels', 'none'] as const;

export type EvidenceSource = (typeof EVIDENCE_SOURCES)[number];
