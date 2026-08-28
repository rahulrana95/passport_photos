import { describe, expect, it } from 'vitest';
import { ALL_RULES } from '@/rules/rule-registry';
import { RULE_IDS } from '@/rules/rule-id.constants';
import { getContent } from '@/content/content.registry';
import { rejectionReasons } from './rejection-reasons.utils';

const content = getContent();

describe('the reasons a photo comes back', () => {
  it('explains every rule the engine measures', () => {
    // A rejection page that omits a reason sends somebody away still not
    // knowing. Built from the registry so it cannot happen quietly.
    expect(rejectionReasons(content)).toHaveLength(ALL_RULES.length);
  });

  it('invents none', () => {
    const labels = new Set(RULE_IDS.map((id) => content.rules.labels[id]));

    for (const reason of rejectionReasons(content)) {
      expect(labels.has(reason.question)).toBe(true);
    }
  });

  it('keeps the order the engine deals with them in', () => {
    // Whether we are looking at the right face at all, then the framing
    // everything else is measured against, then the capture, then the pose.
    // That is the order a person should read them in too.
    const questions = rejectionReasons(content).map((reason) => reason.question);

    expect(questions).toEqual(ALL_RULES.map((rule) => content.rules.labels[rule.id]));
  });

  it('answers each in a sentence a rejection letter does not', () => {
    // The letter says "head size incorrect" and says nothing about where the
    // top of the head is measured from. That gap is the page.
    for (const reason of rejectionReasons(content)) {
      expect(reason.answer.length).toBeGreaterThan(40);
      expect(reason.answer).not.toMatch(/\{\w+\}/);
    }
  });

  it('explains the difference that fails the most photos', () => {
    const headHeight = rejectionReasons(content).find(
      (reason) => reason.question === content.rules.labels['head-height'],
    );

    expect(headHeight?.answer).toContain('hair');
    expect(headHeight?.answer).toContain('skull');
  });
});
