import { ALL_RULES } from '@/rules/rule-registry';
import type { ContentTree } from '@/content/content.types';
import type { FaqEntry } from '@/components/content/FaqList/FaqList.types';

/**
 * Every reason a photo comes back, in the order worth dealing with them.
 *
 * Built from the rule registry rather than written as a list. Two things
 * follow, and both matter more than the convenience:
 *
 * The page cannot describe a rule the engine does not measure, and cannot fall
 * silent about one it does. A rejection page that omits a reason is a page
 * that sends somebody away still not knowing, and one that invents a reason is
 * worse than that.
 *
 * The order is the registry's own — which is ordered by what to deal with
 * first: whether we are looking at the right face at all, then the framing
 * everything else is measured against, then the capture, then the pose. That
 * is the order a person should read them in too.
 */
export const rejectionReasons = (content: ContentTree): readonly FaqEntry[] =>
  ALL_RULES.map((rule) => ({
    question: content.rules.labels[rule.id],
    answer: content.problem.rejected.reasons[rule.id],
  }));
