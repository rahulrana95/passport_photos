/**
 * The verdict a single compliance rule can produce.
 *
 * `manual` and `undetectable` are deliberately distinct. "You need to check this
 * yourself" (glasses, head covering) is a different message from "we tried and
 * could not measure it" (a face we failed to detect) — collapsing them would
 * either nag people about things we could have checked, or quietly imply we
 * checked something we did not.
 */
export const RULE_STATUSES = ['pass', 'fail', 'warning', 'manual', 'undetectable'] as const;

export type RuleStatus = (typeof RULE_STATUSES)[number];

/**
 * The colour token each status maps to. Under forced-colors these all collapse
 * to CanvasText, which is exactly why every status also carries a distinct icon
 * and a text label — colour is never the only signal.
 */
export const RULE_STATUS_TOKENS: Readonly<Record<RuleStatus, string>> = {
  pass: '--tk-status-pass',
  fail: '--tk-status-fail',
  warning: '--tk-status-warn',
  manual: '--tk-status-manual',
  undetectable: '--tk-status-manual',
};

/** Ordering used when a report lists mixed results: worst first. */
export const RULE_STATUS_SEVERITY: Readonly<Record<RuleStatus, number>> = {
  fail: 0,
  warning: 1,
  manual: 2,
  undetectable: 3,
  pass: 4,
};

export const isRuleStatus = (value: string): value is RuleStatus =>
  (RULE_STATUSES as readonly string[]).includes(value);
