import { fixAction } from '../fix-action.utils';
import { passed, ruleOutcome, unmeasured } from '../rule-outcome.utils';
import type { ExposureVerdict } from '@/quality/exposure.utils';
import type { FixActionKind, RuleMessageId } from '../rule-message.constants';
import type { RuleDefinition, RuleOutcome } from '../rule.types';

/**
 * The rules about how the photograph was taken rather than how it was framed.
 *
 * Deliberately not a fix group. Every instruction here begins with "retake",
 * which looks like one action and is not: a photograph can be both soft and
 * badly lit, and the two corrections compose. Suppressing one because the
 * other was reported would lose a finding the reader needs before they retake
 * once instead of twice.
 */

export const resolutionRule: RuleDefinition = {
  id: 'resolution',
  requirements: [{ standard: 'iso-19794-5', id: 'pixelation' }],
  severity: 'blocking',
  evidence: 'pixels',
  fixGroup: undefined,
  evaluate: (input, spec): RuleOutcome => {
    if (input.outputPx === undefined) return unmeasured();

    // The shorter edge, because that is the one a minimum bites on. Only a
    // minimum is checked: an image larger than the maximum is not a problem
    // the reader has to solve, since the export resizes down to the required
    // size, and telling somebody their photo is too detailed would send them
    // to degrade a perfectly good original.
    const shortestEdge = Math.min(input.outputPx.widthPx, input.outputPx.heightPx);
    const required = spec.digital.minEdgePx;
    const band = { min: required, max: Number.POSITIVE_INFINITY };
    const measurement = { value: shortestEdge, unit: 'pixel' } as const;

    return shortestEdge >= required
      ? passed({ measurement, band })
      : ruleOutcome('fail', 'resolution.too-small', {
          measurement,
          band,
          fix: fixAction('retake-larger'),
        });
  },
};

export const focusRule: RuleDefinition = {
  id: 'focus',
  requirements: [{ standard: 'iso-19794-5', id: 'blurred' }],
  severity: 'blocking',
  evidence: 'pixels',
  fixGroup: undefined,
  evaluate: (input): RuleOutcome => {
    if (input.sharpness === undefined) return unmeasured();

    // The Laplacian variance itself is never shown. It is a real measurement
    // and a meaningless one to a reader: there is no unit, no scale they could
    // compare against, and a number beside a verdict invites them to argue
    // with it rather than retake the photo.
    if (input.sharpness.verdict === 'too-small-to-judge') {
      return ruleOutcome('undetectable', 'focus.too-small-to-judge');
    }

    return input.sharpness.verdict === 'sharp'
      ? passed()
      : ruleOutcome('fail', 'focus.soft', { fix: fixAction('retake-sharper') });
  },
};

/**
 * What to do about each way exposure can fail.
 *
 * A table rather than a chain of branches, so that adding a verdict to the
 * exposure module without deciding what a reader should do about it fails to
 * compile instead of falling through to a generic message.
 */
const EXPOSURE_FAILURES: Readonly<
  Record<Exclude<ExposureVerdict, 'well-exposed'>, { message: RuleMessageId; fix: FixActionKind }>
> = {
  'clipped-shadows': { message: 'exposure.clipped-shadows', fix: 'retake-more-light' },
  'clipped-highlights': { message: 'exposure.clipped-highlights', fix: 'retake-softer-light' },
  flat: { message: 'exposure.flat', fix: 'retake-even-light' },
};

export const exposureRule: RuleDefinition = {
  id: 'exposure',
  requirements: [
    { standard: 'iso-19794-5', id: 'too-dark-or-light' },
    { standard: 'iso-19794-5', id: 'washed-out' },
  ],
  severity: 'blocking',
  evidence: 'pixels',
  fixGroup: undefined,
  evaluate: (input): RuleOutcome => {
    if (input.exposure === undefined) return unmeasured();
    if (input.exposure.verdict === 'well-exposed') return passed();

    const failure = EXPOSURE_FAILURES[input.exposure.verdict];

    return ruleOutcome('fail', failure.message, { fix: fixAction(failure.fix) });
  },
};
