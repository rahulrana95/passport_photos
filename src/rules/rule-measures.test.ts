import { describe, expect, it } from 'vitest';
import { ALL_RULES } from './rule-registry';
import { PASSING_RULE_INPUT } from '@/testing/fixtures/rule-input.builder';
import { fixtureSpec } from '@/testing/fixtures/compliance-report.builder';

const SPEC = fixtureSpec();

/**
 * The declaration must match what the rule actually does.
 *
 * `measures` exists so the interface can reserve the right amount of space
 * before an analysis finishes, and a declaration that quietly drifted from the
 * truth would be worse than none at all: the page would go back to jumping,
 * and it would do so on exactly the slow connections where nobody is watching.
 */
describe('every rule declares whether it measures', () => {
  it.each(ALL_RULES.map((rule) => [rule.id, rule] as const))(
    '%s reports a quantity exactly when it says it does',
    (_id, rule) => {
      const outcome = rule.evaluate(PASSING_RULE_INPUT, SPEC);

      expect(outcome?.measurement !== undefined).toBe(rule.measures);
    },
  );

  it('has rules on both sides of the question', () => {
    // Without this the suite would pass vacuously if the flag were hard-wired.
    expect(ALL_RULES.some((rule) => rule.measures)).toBe(true);
    expect(ALL_RULES.some((rule) => !rule.measures)).toBe(true);
  });
});
