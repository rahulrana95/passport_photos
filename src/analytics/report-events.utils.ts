import type { AnalyticsEvent, SpecIdentity } from './analytics-event.types';
import type { ComplianceReport } from '@/rules/rule.types';

/**
 * What a finished check is worth knowing about, as events.
 *
 * Pure, and separate from the component, because this is the decision — which
 * facts about a report may be transmitted — and a decision that lives inside a
 * click handler can only be tested by clicking.
 *
 * The manual checklist is deliberately not counted. Those items appear on
 * every report ever produced, so folding them in would make every check look
 * identical and the failure rates would carry no information at all.
 */
export const reportEvents = (
  report: ComplianceReport,
  spec: SpecIdentity,
): readonly AnalyticsEvent[] => {
  const failed = report.results.filter((result) => result.status === 'fail');

  return [
    { name: 'check-completed', spec, overall: report.overall, failedRules: failed.length },
    ...failed.map(
      (result): AnalyticsEvent => ({ name: 'rule-failed', ruleId: result.ruleId, spec }),
    ),
  ];
};
