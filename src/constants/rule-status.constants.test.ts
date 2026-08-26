import { describe, expect, it } from 'vitest';
import {
  isRuleStatus,
  RULE_STATUS_SEVERITY,
  RULE_STATUS_TOKENS,
  RULE_STATUSES,
} from './rule-status.constants';

describe('rule statuses', () => {
  it.each(RULE_STATUSES)('%s maps to a colour token', (status) => {
    expect(RULE_STATUS_TOKENS[status]).toMatch(/^--tk-status-/);
  });

  it.each(RULE_STATUSES)('%s has a severity rank', (status) => {
    expect(typeof RULE_STATUS_SEVERITY[status]).toBe('number');
  });

  it('ranks failures above every other outcome', () => {
    const ranks = RULE_STATUSES.map((status) => RULE_STATUS_SEVERITY[status]);
    expect(RULE_STATUS_SEVERITY.fail).toBe(Math.min(...ranks));
  });

  it('ranks passes last, so a report leads with what needs attention', () => {
    const ranks = RULE_STATUSES.map((status) => RULE_STATUS_SEVERITY[status]);
    expect(RULE_STATUS_SEVERITY.pass).toBe(Math.max(...ranks));
  });

  it('gives every status a distinct severity rank', () => {
    const ranks = RULE_STATUSES.map((status) => RULE_STATUS_SEVERITY[status]);
    expect(new Set(ranks).size).toBe(ranks.length);
  });

  it('separates "you check this" from "we could not measure it"', () => {
    // Collapsing these would either nag about things we could have checked, or
    // imply we checked something we did not.
    expect(RULE_STATUS_SEVERITY.manual).not.toBe(RULE_STATUS_SEVERITY.undetectable);
  });

  it('accepts a known status', () => {
    expect(isRuleStatus('pass')).toBe(true);
  });

  it('rejects an unknown status', () => {
    expect(isRuleStatus('probably-fine')).toBe(false);
  });
});
