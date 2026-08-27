import type { BandEvaluation } from '@/measurement/band.types';
import type { FixActionKind } from './rule-message.constants';
import type { FixAction, FixAmount } from './rule.types';

/**
 * Turning a measurement's shortfall into a physical correction.
 *
 * The amounts here are all derived from a delta the engine actually measured.
 * Nothing is estimated, and nothing is converted into a unit the photograph
 * does not contain — see FIX_AMOUNT_UNITS for why there are no centimetres of
 * camera distance anywhere in this product.
 */

export const degreesAmount = (degrees: number): FixAmount => ({
  value: Math.abs(degrees),
  unit: 'degree',
});

export const millimetresAmount = (millimetres: number): FixAmount => ({
  value: Math.abs(millimetres),
  unit: 'millimeter',
});

/**
 * The proportional change that would bring a measurement to the nearest edge
 * of its band, as a percentage.
 *
 * Carried as a ratio, not as a number out of a hundred: 0.2 means twenty per
 * cent, and the formatter turns it into "20%". Every percentage in this
 * product is stored that way, so a value can never be scaled twice.
 *
 * A scale of 1.2 becomes 0.2, and so does a scale of 0.8 — the direction is
 * already carried by which fix action was chosen, and a negative percentage
 * beside the word "closer" reads as a bug.
 *
 * Returns undefined for a scale that is not a finite positive number, which is
 * what evaluateBand reports for a measurement of zero. A head measuring zero
 * millimetres cannot be scaled to any size, and "move 8100% closer" would be
 * arithmetic pretending to be advice.
 */
export const percentAmount = (scaleToBand: number): FixAmount | undefined =>
  Number.isFinite(scaleToBand) && scaleToBand > 0
    ? { value: Math.abs(scaleToBand - 1), unit: 'percent' }
    : undefined;

export const fixAction = (kind: FixActionKind, amount?: FixAmount): FixAction => ({
  kind,
  amount,
});

/**
 * The correction for a band the measurement fell outside, given the action
 * that grows it and the action that shrinks it.
 *
 * Written once rather than per rule because getting the pairing backwards —
 * telling someone to move away when their head is too small — is both easy and
 * invisible in review.
 */
export const scaleFix = (
  evaluation: BandEvaluation,
  grow: FixActionKind,
  shrink: FixActionKind,
): FixAction =>
  fixAction(evaluation.status === 'below' ? grow : shrink, percentAmount(evaluation.scaleToBand));
