import { describe, expect, it } from 'vitest';
import { passed, ruleOutcome, unmeasured } from './rule-outcome.utils';

describe('building a rule outcome', () => {
  it('leaves every optional field explicitly absent', () => {
    // Absent as a present key holding undefined, not as a missing key: that is
    // what makes forgetting a field a compile error rather than a silence.
    expect(ruleOutcome('pass', 'shared.pass')).toEqual({
      status: 'pass',
      messageId: 'shared.pass',
      measurement: undefined,
      band: undefined,
      fix: undefined,
    });
  });

  it('carries whatever the rule had to say', () => {
    const outcome = ruleOutcome('fail', 'head-height.below', {
      measurement: { value: 20, unit: 'millimeter' },
    });

    expect(outcome.measurement).toEqual({ value: 20, unit: 'millimeter' });
  });

  it('reports a missing measurement as unmeasured, never as a pass', () => {
    // Every rule routes its missing-input path through here, which is what
    // makes a failed analysis structurally incapable of reading as a pass.
    expect(unmeasured()).toEqual({
      status: 'undetectable',
      messageId: 'shared.unmeasured',
      measurement: undefined,
      band: undefined,
      fix: undefined,
    });
  });

  it('reports a measurement inside its band as a pass', () => {
    expect(passed({ band: { min: 1, max: 2 } })).toEqual({
      status: 'pass',
      messageId: 'shared.pass',
      measurement: undefined,
      band: { min: 1, max: 2 },
      fix: undefined,
    });
  });
});
