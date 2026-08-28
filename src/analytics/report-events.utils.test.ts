import { describe, expect, it } from 'vitest';
import { reportEvents } from './report-events.utils';
import type { ComplianceReport } from '@/rules/rule.types';
import type { RuleResult } from '@/rules/rule.types';

const SPEC = { country: 'us', document: 'passport' } as const;

const result = (ruleId: string, status: RuleResult['status']): RuleResult =>
  ({ ruleId, status }) as RuleResult;

const report = (
  results: readonly RuleResult[],
  manualChecklist: readonly RuleResult[] = [],
): ComplianceReport =>
  ({ overall: 'fail', results, manualChecklist }) as ComplianceReport;

describe('what a finished check reports', () => {
  it('states the verdict and how many rules failed', () => {
    const [completed] = reportEvents(
      report([result('head-height', 'fail'), result('background-plain', 'pass')]),
      SPEC,
    );

    expect(completed).toEqual({
      name: 'check-completed',
      spec: SPEC,
      overall: 'fail',
      failedRules: 1,
    });
  });

  it('emits one event per failing rule, which is what makes a rate', () => {
    // The most valuable number here: which requirement people actually get
    // wrong, and therefore what the guidance should explain first.
    const events = reportEvents(
      report([result('head-height', 'fail'), result('background-plain', 'fail')]),
      SPEC,
    );

    expect(events.filter((event) => event.name === 'rule-failed')).toHaveLength(2);
  });

  it('counts only failures, not warnings or manual checks', () => {
    const events = reportEvents(
      report([
        result('head-height', 'fail'),
        result('background-plain', 'warning'),
        result('focus', 'pass'),
        result('glasses', 'undetectable'),
      ]),
      SPEC,
    );

    expect(events.filter((event) => event.name === 'rule-failed')).toHaveLength(1);
  });

  it('ignores the manual checklist entirely', () => {
    // Those items appear on every report ever produced. Folding them in would
    // make every check look identical and the rates carry no information.
    const events = reportEvents(
      report([result('focus', 'pass')], [result('photo-age', 'manual')]),
      SPEC,
    );

    expect(events).toHaveLength(1);
    expect(events[0]?.name).toBe('check-completed');
  });

  it('says nothing beyond the verdict when everything passed', () => {
    const events = reportEvents(report([result('focus', 'pass')]), SPEC);

    expect(events.map((event) => event.name)).toEqual(['check-completed']);
  });
});
