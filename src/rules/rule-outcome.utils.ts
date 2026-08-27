import type { RuleStatus } from '@/constants/rule-status.constants';
import type { RuleMessageId } from './rule-message.constants';
import type { RuleOutcome } from './rule.types';

/**
 * Builds a rule outcome with every optional field explicitly absent.
 *
 * The codebase declares optional data as a required key holding `undefined`
 * rather than an absent key, so that forgetting a field is a compile error
 * instead of a silent absence. That is the right trade in the type system and
 * the wrong one at two dozen call sites, where it would put four `undefined`s
 * in every evaluator and bury the one line that says what was decided.
 */
export const ruleOutcome = (
  status: RuleStatus,
  messageId: RuleMessageId,
  extras: Partial<Omit<RuleOutcome, 'status' | 'messageId'>> = {},
): RuleOutcome => ({
  status,
  messageId,
  measurement: undefined,
  band: undefined,
  fix: undefined,
  ...extras,
});

/**
 * The outcome for a rule whose evidence never arrived.
 *
 * Every rule routes its missing-input path through here, which is what makes
 * "detection failed entirely" structurally incapable of reading as a pass:
 * there is no branch in any evaluator that turns an absent measurement into
 * anything other than this.
 */
export const unmeasured = (): RuleOutcome => ruleOutcome('undetectable', 'shared.unmeasured');

/** The outcome for a measurement that sits inside the published requirement. */
export const passed = (extras: Partial<Omit<RuleOutcome, 'status' | 'messageId'>> = {}): RuleOutcome =>
  ruleOutcome('pass', 'shared.pass', extras);
