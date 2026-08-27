import { describe, expect, it } from 'vitest';
import { EN_CONTENT } from '@/content/en.content';
import { resolveSpec } from '@/photo-spec/photo-spec.utils';
import { US_PASSPORT } from '@/photo-spec/specs/us.spec';
import { EMPTY_RULE_INPUT, PASSING_RULE_INPUT } from '@/testing/fixtures/rule-input.builder';
import { FIX_GROUPS, AUTOMATIC_RULE_IDS, MANUAL_RULE_IDS, RULE_IDS } from './rule-id.constants';
import { ALL_RULES, AUTOMATIC_RULES, getRule, MANUAL_RULES, ruleOrder } from './rule-registry';

const SPEC = resolveSpec(US_PASSPORT, new Date('2026-08-27T00:00:00Z'));

describe('the rule registry', () => {
  it('defines every rule that has an id', () => {
    expect(ALL_RULES).toHaveLength(RULE_IDS.length);
  });

  it.each(RULE_IDS)('registers %s under its own id', (id) => {
    // A definition filed under the wrong key would evaluate the wrong check
    // and label it correctly, which is the shape of bug that survives review.
    expect(getRule(id).id).toBe(id);
  });

  it('splits cleanly into what we measure and what the reader checks', () => {
    expect([...AUTOMATIC_RULE_IDS, ...MANUAL_RULE_IDS]).toEqual([...RULE_IDS]);
    expect(AUTOMATIC_RULES).toHaveLength(AUTOMATIC_RULE_IDS.length);
    expect(MANUAL_RULES).toHaveLength(MANUAL_RULE_IDS.length);
  });

  it('gives every rule a distinct place in the order', () => {
    // The order is the tie-break for display and the precedence for resolving
    // contradictory instructions. A duplicate would make both arbitrary.
    expect(new Set(RULE_IDS.map(ruleOrder)).size).toBe(RULE_IDS.length);
  });

  it.each(RULE_IDS)('names at least one published requirement for %s', (id) => {
    expect(getRule(id).requirements.length).toBeGreaterThan(0);
  });

  it.each(RULE_IDS)('has copy for %s', (id) => {
    expect(EN_CONTENT.rules.labels[id].length).toBeGreaterThan(0);
  });

  it('only groups fixes under a declared group', () => {
    const declared = new Set<string>(FIX_GROUPS);
    const grouped = ALL_RULES.map((rule) => rule.fixGroup).filter(
      (group): group is (typeof FIX_GROUPS)[number] => group !== undefined,
    );

    expect(grouped.every((group) => declared.has(group))).toBe(true);
    expect(grouped.length).toBeGreaterThan(0);
  });
});

describe('the checks that are always the reader’s', () => {
  it.each(MANUAL_RULE_IDS)('%s asks the reader whatever the photo shows', (id) => {
    // These are not stubs for detection we mean to add. If a photograph could
    // ever change one of these answers, it belongs in the automatic set where
    // it would be measured rather than asked about.
    const rule = getRule(id);

    expect(rule.evaluate(PASSING_RULE_INPUT, SPEC)?.status).toBe('manual');
    expect(rule.evaluate(EMPTY_RULE_INPUT, SPEC)?.status).toBe('manual');
  });

  it.each(MANUAL_RULE_IDS)('%s reads no evidence, so nothing can undermine it', (id) => {
    expect(getRule(id).evidence).toBe('none');
  });

  it.each(MANUAL_RULE_IDS)('%s gives no automated instruction of its own', (id) => {
    // The message is the instruction for these. A separate fix line would
    // duplicate it in slightly different words.
    expect(getRule(id).evaluate(PASSING_RULE_INPUT, SPEC)?.fix).toBeUndefined();
  });
});
