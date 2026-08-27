import { MAX_HORIZONTAL_OFFSET_RATIO, MIN_INTER_OCULAR_PX } from '../rule-threshold.constants';
import { fixAction, millimetresAmount, scaleFix } from '../fix-action.utils';
import { passed, ruleOutcome, unmeasured } from '../rule-outcome.utils';
import { accessGeometry } from './geometry-failure.utils';
import type { BandEvaluation } from '@/measurement/band.types';
import type { RuleDefinition, RuleOutcome } from '../rule.types';

/**
 * The rules measured from the crop.
 *
 * All four share a fix group, because all four are changed by one movement.
 * Told separately to move closer, to raise their eyes and to shift left, a
 * reader performs three corrections when the first one already altered the
 * other two measurements — and arrives back with a photo that is wrong in a
 * new way. The engine keeps one instruction from this group; the rest say so.
 */

const bandOutcome = (
  evaluation: BandEvaluation,
  below: RuleOutcome,
  above: RuleOutcome,
): RuleOutcome =>
  evaluation.status === 'within'
    ? passed({ measurement: { value: evaluation.value, unit: 'millimeter' }, band: evaluation.band })
    : evaluation.status === 'below'
      ? below
      : above;

export const headHeightRule: RuleDefinition = {
  id: 'head-height',
  requirements: [{ standard: 'iso-19794-5', id: 'head-image-height-ratio' }],
  severity: 'blocking',
  // Crown, not landmarks. Chin-to-eye comes from the landmark model, but the
  // top of the head comes from the segmentation mask, and that is the weaker
  // half of this measurement — so the weaker half sets the confidence.
  evidence: 'crown',
  fixGroup: 'framing',
  measures: true,
  evaluate: (input): RuleOutcome => {
    const geometry = accessGeometry(input.geometry);
    if (!geometry.ok) return geometry.outcome;

    const headHeight = geometry.measurements.headHeight;
    // A head measuring nothing is not a very small head, it is a geometry that
    // did not come out. Scaling zero to the band is division by zero, and the
    // instruction that falls out of it — move some infinite percentage closer
    // — is arithmetic dressed as advice.
    if (headHeight.value <= 0) return unmeasured();

    const shared = {
      measurement: { value: headHeight.value, unit: 'millimeter' } as const,
      band: headHeight.band,
      fix: scaleFix(headHeight, 'move-closer', 'move-further'),
    };

    return bandOutcome(
      headHeight,
      ruleOutcome('fail', 'head-height.below', shared),
      ruleOutcome('fail', 'head-height.above', shared),
    );
  },
};

export const eyeLineRule: RuleDefinition = {
  id: 'eye-line',
  requirements: [{ standard: 'iso-19794-5', id: 'vertical-position-of-face' }],
  severity: 'blocking',
  evidence: 'landmarks',
  fixGroup: 'framing',
  measures: true,
  evaluate: (input, spec): RuleOutcome | undefined => {
    // Not every authority states one. Reporting a pass against a requirement
    // the country never published would be inventing a rule and then awarding
    // ourselves credit for checking it.
    if (spec.eyeLine === undefined) return undefined;

    const geometry = accessGeometry(input.geometry);
    if (!geometry.ok) return geometry.outcome;

    const eyeLine = geometry.measurements.eyeLine;
    if (eyeLine === undefined) return unmeasured();

    const amount = millimetresAmount(eyeLine.delta);

    return bandOutcome(
      eyeLine,
      ruleOutcome('fail', 'eye-line.below', {
        measurement: { value: eyeLine.value, unit: 'millimeter' },
        band: eyeLine.band,
        fix: fixAction('eyes-higher-in-frame', amount),
      }),
      ruleOutcome('fail', 'eye-line.above', {
        measurement: { value: eyeLine.value, unit: 'millimeter' },
        band: eyeLine.band,
        fix: fixAction('eyes-lower-in-frame', amount),
      }),
    );
  },
};

export const horizontalCentringRule: RuleDefinition = {
  id: 'horizontal-centring',
  requirements: [{ standard: 'iso-19794-5', id: 'horizontal-position-of-face' }],
  severity: 'blocking',
  evidence: 'landmarks',
  fixGroup: 'framing',
  measures: true,
  evaluate: (input): RuleOutcome => {
    const geometry = accessGeometry(input.geometry);
    if (!geometry.ok) return geometry.outcome;

    // Signed on the way in, unsigned on the way out. Which side the face sits
    // decides which instruction to give; how far it sits is the same number
    // either way, and a negative offset printed beside "move right" reads as a
    // tool that has lost track of its own arithmetic.
    const offset = geometry.measurements.horizontalOffsetRatio;
    const distance = Math.abs(offset);
    const band = { min: 0, max: MAX_HORIZONTAL_OFFSET_RATIO };
    const shared = { measurement: { value: distance, unit: 'percent' } as const, band };

    // Compared directly rather than through evaluateBand: this band has a
    // floor of zero and the value is already unsigned, so the "below the band"
    // branch could never be taken and would be a case no test could reach.
    if (distance <= MAX_HORIZONTAL_OFFSET_RATIO) return passed(shared);

    return offset < 0
      ? ruleOutcome('fail', 'horizontal-centring.left', {
          ...shared,
          fix: fixAction('shift-right', { value: distance, unit: 'percent' }),
        })
      : ruleOutcome('fail', 'horizontal-centring.right', {
          ...shared,
          fix: fixAction('shift-left', { value: distance, unit: 'percent' }),
        });
  },
};

export const eyeDistanceRule: RuleDefinition = {
  id: 'eye-distance',
  requirements: [{ standard: 'iso-19794-5', id: 'eye-distance' }],
  severity: 'blocking',
  evidence: 'landmarks',
  fixGroup: 'framing',
  measures: true,
  evaluate: (input): RuleOutcome => {
    if (input.interOcularPx === undefined) return unmeasured();

    // An open-topped band: there is no such thing as too much detail between
    // the eyes, and the printed size is already constrained by its own rule.
    const band = { min: MIN_INTER_OCULAR_PX, max: Number.POSITIVE_INFINITY };
    const measurement = { value: input.interOcularPx, unit: 'pixel' } as const;

    return input.interOcularPx >= MIN_INTER_OCULAR_PX
      ? passed({ measurement, band })
      : ruleOutcome('fail', 'eye-distance.too-few-pixels', {
          measurement,
          band,
          fix: fixAction('retake-larger'),
        });
  },
};
