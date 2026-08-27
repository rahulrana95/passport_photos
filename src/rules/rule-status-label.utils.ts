import type { RuleStatus } from '@/constants/rule-status.constants';
import type { ContentTree } from '@/content/content.types';

/**
 * One row's verdict, in words, beside the thing it is about.
 *
 * SHORT ON PURPOSE, and not the same words as the headline. A row gets its
 * meaning from the pairing — "Head height: Does not meet it" — so the sentence
 * the headline needs would be twenty repetitions of the same clause down a
 * column, burying the two rows that are the only reason anybody is reading it.
 * See verdictLabel in src/result for the standalone version.
 *
 * Its own module rather than living beside the row component, because the
 * downloadable report needs it too and the component's constants file also
 * carries icons — a report that pulled an icon library in to spell "pass"
 * would be paying for a dependency it never renders.
 */
export const ruleStatusLabel = (status: RuleStatus, content: ContentTree): string =>
  content.result.statuses[status];
