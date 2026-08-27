import type { RuleStatus } from '@/constants/rule-status.constants';
import type { ContentTree } from '@/content/content.types';

/**
 * The verdict in words.
 *
 * Its own module rather than living beside the row component, because the
 * downloadable report needs it too and the component's constants file also
 * carries icons — a report that pulled an icon library in to spell "pass"
 * would be paying for a dependency it never renders.
 */
export const ruleStatusLabel = (status: RuleStatus, content: ContentTree): string => {
  const labels: Readonly<Record<RuleStatus, string>> = {
    pass: content.result.verdictPass,
    fail: content.result.verdictFail,
    warning: content.result.verdictWarning,
    manual: content.result.verdictManual,
    undetectable: content.result.verdictUndetectable,
  };

  return labels[status];
};
