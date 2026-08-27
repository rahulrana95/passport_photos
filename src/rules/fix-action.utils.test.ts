import { describe, expect, it } from 'vitest';
import { evaluateBand } from '@/measurement/band.utils';
import {
  degreesAmount,
  fixAction,
  millimetresAmount,
  percentAmount,
  scaleFix,
} from './fix-action.utils';

const BAND = { min: 25, max: 35 };

describe('quantifying a correction', () => {
  it('reports a scale up as a percentage of the current size', () => {
    expect(percentAmount(1.2)).toEqual({ value: expect.closeTo(0.2, 10), unit: 'percent' });
  });

  it('reports a scale down as the same magnitude, unsigned', () => {
    // The direction is already carried by which action was chosen. A negative
    // percentage beside the word "closer" reads as a tool that has lost track
    // of its own arithmetic.
    expect(percentAmount(0.8)?.value).toBeCloseTo(0.2, 10);
  });

  it('declines to quantify a scale that is not a finite positive number', () => {
    // evaluateBand reports an infinite scale for a measurement of zero. A head
    // measuring nothing cannot be scaled to any size, and "move 8100% closer"
    // would be arithmetic pretending to be advice.
    expect(percentAmount(Number.POSITIVE_INFINITY)).toBeUndefined();
    expect(percentAmount(0)).toBeUndefined();
    expect(percentAmount(Number.NaN)).toBeUndefined();
  });

  it('reports angles and lengths unsigned', () => {
    expect(degreesAmount(-7)).toEqual({ value: 7, unit: 'degree' });
    expect(millimetresAmount(-3.5)).toEqual({ value: 3.5, unit: 'millimeter' });
  });

  it('allows an action with nothing to quantify', () => {
    expect(fixAction('open-eyes')).toEqual({ kind: 'open-eyes', amount: undefined });
  });
});

describe('choosing which way to correct a band', () => {
  it('grows a measurement that fell short', () => {
    expect(scaleFix(evaluateBand(20, BAND), 'move-closer', 'move-further').kind).toBe('move-closer');
  });

  it('shrinks a measurement that overshot', () => {
    // Getting this pairing backwards — telling somebody to move away when
    // their head is too small — is both easy and invisible in review, which is
    // why it is written once and tested here rather than at each rule.
    expect(scaleFix(evaluateBand(40, BAND), 'move-closer', 'move-further').kind).toBe(
      'move-further',
    );
  });

  it('carries the size of the correction', () => {
    expect(scaleFix(evaluateBand(20, BAND), 'move-closer', 'move-further').amount?.value).toBeCloseTo(
      0.25,
      10,
    );
  });
});
