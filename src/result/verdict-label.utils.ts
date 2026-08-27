import type { ContentTree } from '@/content/content.types';
import type { RuleStatus } from '@/constants/rule-status.constants';

/**
 * The headline sentence for an overall verdict.
 *
 * A record keyed by the status union, so a new status cannot be added without
 * its headline: the type fails rather than the panel rendering a blank banner
 * where the answer should be. Separate from the per-row label because they do
 * different work — a row says "Fails" next to what failed, and the headline
 * has to stand alone at the top of a page and still mean something.
 */
const VERDICT_BY_STATUS: Readonly<
  Record<RuleStatus, keyof Pick<
    ContentTree['result'],
    'verdictPass' | 'verdictFail' | 'verdictWarning' | 'verdictManual' | 'verdictUndetectable'
  >>
> = {
  pass: 'verdictPass',
  fail: 'verdictFail',
  warning: 'verdictWarning',
  manual: 'verdictManual',
  undetectable: 'verdictUndetectable',
};

export const verdictLabel = (status: RuleStatus, content: ContentTree): string =>
  content.result[VERDICT_BY_STATUS[status]];
