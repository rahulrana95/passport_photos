import { describe, expect, it } from 'vitest';
import { RULE_STATUS_SEVERITY } from '@/constants/rule-status.constants';
import { evaluateBand } from '@/measurement/band.utils';
import { resolveSpec } from '@/photo-spec/photo-spec.utils';
import { UK_PASSPORT } from '@/photo-spec/specs/uk.spec';
import { US_PASSPORT } from '@/photo-spec/specs/us.spec';
import {
  buildRuleInput,
  EMPTY_RULE_INPUT,
  HEAD_HEIGHT_BAND,
  headHeightOf,
  PASSING_RULE_INPUT,
  withMeasurements,
} from '@/testing/fixtures/rule-input.builder';
import { evaluateRules } from './evaluate-rules';
import { MANUAL_RULE_IDS } from './rule-id.constants';
import { ruleOrder } from './rule-registry';
import type { ComplianceReport } from './rule.types';

const NOW = new Date('2026-08-27T00:00:00Z');
const SPEC = resolveSpec(US_PASSPORT, NOW);

const resultFor = (report: ComplianceReport, ruleId: string) => {
  const found = report.results.find((result) => result.ruleId === ruleId);
  if (found === undefined) throw new Error(`No result for ${ruleId}.`);
  return found;
};

const unsureAbout = (crown: number): ReturnType<typeof buildRuleInput> =>
  buildRuleInput({ confidence: { landmarks: 0.95, crown, segmentation: 0.9 } });

describe('when nothing could be measured at all', () => {
  const report = evaluateRules(EMPTY_RULE_INPUT, SPEC);

  it('reports no rule as passing', () => {
    // The single most important assertion in this suite. A rule that reads a
    // missing measurement as a pass is how a compliance tool comes to tell
    // somebody their photo is fine when it never looked at it, and the failure
    // is invisible — a green tick is exactly what a correct check produces.
    expect(report.results.filter((result) => result.status === 'pass')).toEqual([]);
  });

  it('summarises itself as unmeasured rather than as a warning', () => {
    expect(report.overall).toBe('undetectable');
  });

  it('still asks the reader for the checks that were always theirs', () => {
    // These never depended on the photograph, so a failed analysis does not
    // excuse dropping them.
    expect(report.manualChecklist.map((result) => result.ruleId)).toEqual([...MANUAL_RULE_IDS]);
  });
});

describe('when everything meets the requirement', () => {
  const report = evaluateRules(PASSING_RULE_INPUT, SPEC);

  it('says so overall', () => {
    expect(report.overall).toBe('pass');
  });

  it('passes every automatic rule it ran', () => {
    expect(report.results.every((result) => result.status === 'pass')).toBe(true);
  });

});

describe('ordering', () => {
  const report = evaluateRules(
    withMeasurements({ rollDegrees: 9, horizontalOffsetRatio: 0.12 }),
    SPEC,
  );

  it('puts the worst findings first', () => {
    const severities = report.results.map((result) => RULE_STATUS_SEVERITY[result.status]);

    expect([...severities].sort((left, right) => left - right)).toEqual(severities);
  });

  it('breaks ties by the registry order rather than by chance', () => {
    const failures = report.results.filter((result) => result.status === 'fail');
    const order = failures.map((result) => ruleOrder(result.ruleId));

    expect([...order].sort((left, right) => left - right)).toEqual(order);
  });

  it('produces an identical report for an identical input', () => {
    expect(evaluateRules(PASSING_RULE_INPUT, SPEC)).toEqual(evaluateRules(PASSING_RULE_INPUT, SPEC));
  });
});

describe('fix instructions that would contradict each other', () => {
  const report = evaluateRules(headHeightOf(20), SPEC);
  const offCentre = evaluateRules(
    withMeasurements({
      headHeightMm: 20,
      headHeight: evaluateBand(20, HEAD_HEIGHT_BAND),
      horizontalOffsetRatio: 0.12,
    }),
    SPEC,
  );

  it('gives the head height instruction when it is the only framing failure', () => {
    expect(resultFor(report, 'head-height').fix?.kind).toBe('move-closer');
  });

  it('keeps only the first framing instruction when two would conflict', () => {
    // Moving closer to fix the head height also changes the centring. Handed
    // both instructions, a reader performs the second correction against a
    // frame the first one already altered.
    expect(resultFor(offCentre, 'head-height').fix?.kind).toBe('move-closer');
    expect(resultFor(offCentre, 'horizontal-centring').fix).toBeUndefined();
  });

  it('says which rule the suppressed instruction went to', () => {
    // Suppressed, not dropped. A failure with no instruction and no pointer
    // reads as a dead end.
    expect(resultFor(offCentre, 'horizontal-centring').fixDeferredTo).toBe('head-height');
  });

  it('still reports the suppressed rule as failing', () => {
    expect(resultFor(offCentre, 'horizontal-centring').status).toBe('fail');
    expect(resultFor(offCentre, 'horizontal-centring').measurement).toBeDefined();
  });

  it('leaves instructions alone outside a fix group', () => {
    const posed = evaluateRules(
      { ...withMeasurements({ rollDegrees: 9 }), pose: { yawDegrees: 12, pitchDegrees: 12 } },
      SPEC,
    );

    // Straightening, turning and levelling are three movements about three
    // axes. None undoes another, so suppressing any of them would lose a real
    // finding to avoid a conflict that does not exist.
    expect(resultFor(posed, 'head-tilt').fix?.kind).toBe('straighten-head');
    expect(resultFor(posed, 'head-turn').fix?.kind).toBe('face-camera');
    expect(resultFor(posed, 'head-pitch').fix?.kind).toBe('level-chin');
  });
});

describe('evidence we do not trust', () => {
  it('turns an unreliable pass into a check for the reader', () => {
    const result = resultFor(evaluateRules(unsureAbout(0.2), SPEC), 'head-height');

    expect(result.status).toBe('manual');
    expect(result.computedStatus).toBe('pass');
  });

  it('turns an unreliable failure into a check for the reader too', () => {
    // The half that is easy to forget. An unreliable failure sends somebody to
    // retake a photograph that was fine, on a measurement we have already
    // decided not to trust.
    const unsure = { ...headHeightOf(20), confidence: { landmarks: 0.95, crown: 0.2, segmentation: 0.9 } };
    const result = resultFor(evaluateRules(unsure, SPEC), 'head-height');

    expect(result.status).toBe('manual');
    expect(result.computedStatus).toBe('fail');
  });

  it('keeps the measurement but drops the instruction', () => {
    const unsure = { ...headHeightOf(20), confidence: { landmarks: 0.95, crown: 0.2, segmentation: 0.9 } };
    const result = resultFor(evaluateRules(unsure, SPEC), 'head-height');

    expect(result.measurement).toBeDefined();
    expect(result.fix).toBeUndefined();
  });

  it('leaves an unmeasured rule unmeasured rather than downgrading it', () => {
    // "We could not measure this" must not become "we measured it but are
    // unsure", which claims more than happened.
    const result = resultFor(
      evaluateRules({ ...unsureAbout(0.2), geometry: undefined }, SPEC),
      'head-height',
    );

    expect(result.status).toBe('undetectable');
  });

  it('does not downgrade a rule measured from pixels alone', () => {
    // There is no model to be unsure of a Laplacian variance.
    const result = resultFor(evaluateRules(unsureAbout(0.2), SPEC), 'focus');

    expect(result.status).toBe('pass');
    expect(result.confidence).toBeUndefined();
  });
});

describe('advisory findings', () => {
  const covered = buildRuleInput({
    crown: { ok: true, crownY: 40, confidence: 0.9, mayIncludeCovering: true },
  });

  it('never makes an otherwise sound photo read as failing', () => {
    // A flat-topped silhouette is a hat or it is a head of hair, and a mask
    // does not settle which. Rejecting on it would reject people for their
    // hair.
    expect(evaluateRules(covered, SPEC).overall).toBe('warning');
  });

  it('never makes a photo read as unmeasured', () => {
    const noCrown = buildRuleInput({ crown: undefined });

    expect(resultFor(evaluateRules(noCrown, SPEC), 'head-covering-visible').status).toBe(
      'undetectable',
    );
    expect(evaluateRules(noCrown, SPEC).overall).toBe('pass');
  });
});

describe('requirements a country never published', () => {
  it('omits the rule rather than awarding a pass for it', () => {
    // A row reading "Eye position — meets the requirement" against a country
    // that publishes no eye position is a verdict on a rule nobody wrote.
    // The UK publishes no eye line, so this is a real specification shape
    // rather than a contrived one.
    const withoutEyeLine = resolveSpec(UK_PASSPORT, NOW);
    const report = evaluateRules(PASSING_RULE_INPUT, withoutEyeLine);

    expect(report.results.some((result) => result.ruleId === 'eye-line')).toBe(false);
  });
});

describe('the report as a whole', () => {
  const report = evaluateRules(PASSING_RULE_INPUT, SPEC);

  it('carries the specification it judged against', () => {
    expect(report.spec).toBe(SPEC);
  });

  it('publishes what it does not check alongside what it does', () => {
    expect(report.coverage.undetectableCount).toBeGreaterThan(0);
    expect(report.coverage.checkedCount).toBeGreaterThan(0);
  });
});
