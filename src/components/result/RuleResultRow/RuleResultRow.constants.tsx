import { AlertTriangle, Check, CircleHelp, Hand, X } from 'lucide-react';
import type { RuleStatus } from '@/constants/rule-status.constants';

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

export const RULE_STATUS_ICON_SIZE = 18;
