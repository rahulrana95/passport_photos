import { AlertTriangle, Check, CircleHelp, Hand, X } from 'lucide-react';
import type { RuleStatus } from '@/constants/rule-status.constants';
import type { ContentTree } from '@/content/content.types';

/**
 * Every status gets a distinct icon shape, not just a distinct colour.
 *
 * Under Windows High Contrast all four status tokens resolve to CanvasText, and
 * roughly one in twelve men cannot separate the pass green from the fail red at
 * all. The shape and the text label are what actually communicate; the colour is
 * reinforcement.
 */
export const RULE_STATUS_ICONS: Readonly<
  Record<RuleStatus, typeof Check>
> = {
  pass: Check,
  fail: X,
  warning: AlertTriangle,
  manual: Hand,
  undetectable: CircleHelp,
};

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

export const RULE_STATUS_ICON_SIZE = 18;
