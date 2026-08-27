import type { RuleStatus } from '@/constants/rule-status.constants';

/**
 * Which status wins when a report has to say one thing overall.
 *
 * A different ordering from RULE_STATUS_SEVERITY, and the difference is the
 * point. That one sorts rows for a reader scanning a list, where the most
 * actionable finding belongs at the top. This one decides the single
 * statement at the head of the report, where the question is not "what should
 * they read first" but "what is the strongest claim we are entitled to make".
 *
 * So 'undetectable' ranks second here and fourth there. A row saying we could
 * not measure something is less urgent to read than a warning; a report that
 * could not measure something is not entitled to summarise itself as a
 * warning, because the thing it failed to measure might have been a failure.
 * Anything else would be a pass by omission — the exact way a compliance tool
 * comes to tell somebody their photograph is fine when it never checked.
 */
export const OVERALL_STATUS_PRECEDENCE: Readonly<Record<RuleStatus, number>> = {
  fail: 0,
  undetectable: 1,
  manual: 2,
  warning: 3,
  pass: 4,
};
