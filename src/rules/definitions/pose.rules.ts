import {
  MAX_HEAD_PITCH_DEGREES,
  MAX_HEAD_ROLL_DEGREES,
  MAX_HEAD_YAW_DEGREES,
} from '@/constants/measurement.constants';
import { degreesAmount, fixAction } from '../fix-action.utils';
import { passed, ruleOutcome, unmeasured } from '../rule-outcome.utils';
import { accessGeometry } from './geometry-failure.utils';
import type { RuleDefinition, RuleOutcome } from '../rule.types';

/**
 * Head orientation, as three separate rules.
 *
 * NOT a fix group, unlike framing. Straightening a tilt, turning to face the
 * camera and levelling the chin are three independent movements about three
 * different axes — a reader can do all three at once, and none of them undoes
 * another. Grouping them would suppress two real findings to avoid a conflict
 * that does not exist.
 */

/** Every pose rule is the same comparison against a different limit. */
const withinDegrees = (
  degrees: number,
  limit: number,
): { readonly measurement: { readonly value: number; readonly unit: 'degree' }; readonly band: { readonly min: number; readonly max: number }; readonly within: boolean } => ({
  measurement: { value: Math.abs(degrees), unit: 'degree' },
  band: { min: 0, max: limit },
  within: Math.abs(degrees) <= limit,
});

export const headTiltRule: RuleDefinition = {
  id: 'head-tilt',
  requirements: [{ standard: 'iso-19794-5', id: 'roll-pitch-yaw' }],
  severity: 'blocking',
  evidence: 'landmarks',
  fixGroup: undefined,
  measures: true,
  evaluate: (input): RuleOutcome => {
    // Roll comes from the eye line rather than from the pose model. Two
    // sources for one angle is how they end up disagreeing, and the eye line
    // is the one that is directly observable in the photograph the reader is
    // looking at.
    const geometry = accessGeometry(input.geometry);
    if (!geometry.ok) return geometry.outcome;

    const roll = withinDegrees(geometry.measurements.rollDegrees, MAX_HEAD_ROLL_DEGREES);

    return roll.within
      ? passed({ measurement: roll.measurement, band: roll.band })
      : ruleOutcome('fail', 'head-tilt.tilted', {
          measurement: roll.measurement,
          band: roll.band,
          fix: fixAction('straighten-head', degreesAmount(geometry.measurements.rollDegrees)),
        });
  },
};

export const headTurnRule: RuleDefinition = {
  id: 'head-turn',
  requirements: [{ standard: 'iso-19794-5', id: 'roll-pitch-yaw' }],
  severity: 'blocking',
  evidence: 'landmarks',
  fixGroup: undefined,
  measures: true,
  evaluate: (input): RuleOutcome => {
    if (input.pose === undefined) return unmeasured();

    const yaw = withinDegrees(input.pose.yawDegrees, MAX_HEAD_YAW_DEGREES);

    return yaw.within
      ? passed({ measurement: yaw.measurement, band: yaw.band })
      : ruleOutcome('fail', 'head-turn.turned', {
          measurement: yaw.measurement,
          band: yaw.band,
          fix: fixAction('face-camera', degreesAmount(input.pose.yawDegrees)),
        });
  },
};

export const headPitchRule: RuleDefinition = {
  id: 'head-pitch',
  requirements: [{ standard: 'iso-19794-5', id: 'roll-pitch-yaw' }],
  severity: 'blocking',
  evidence: 'landmarks',
  fixGroup: undefined,
  measures: true,
  evaluate: (input): RuleOutcome => {
    if (input.pose === undefined) return unmeasured();

    // MAGNITUDE ONLY, and this is a deliberate refusal rather than an
    // oversight. Roll and yaw are reported with a direction because their sign
    // is confirmed: a matrix built from a known rotation about Z or Y comes
    // back with the sign the tests assert. Pitch is recovered from the same
    // decomposition but nobody has held a real capture against it, and the
    // consequence of a reversed sign is "lower your chin" said confidently to
    // somebody who needs to raise it. So the rule reports that the head is not
    // level and stops there, which is true whichever way the sign runs.
    const pitch = withinDegrees(input.pose.pitchDegrees, MAX_HEAD_PITCH_DEGREES);

    return pitch.within
      ? passed({ measurement: pitch.measurement, band: pitch.band })
      : ruleOutcome('fail', 'head-pitch.tilted', {
          measurement: pitch.measurement,
          band: pitch.band,
          fix: fixAction('level-chin', degreesAmount(input.pose.pitchDegrees)),
        });
  },
};
