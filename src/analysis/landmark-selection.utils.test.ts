import { describe, expect, it } from 'vitest';
import {
  faceArea,
  MAX_RELIABLE_ROLL_DEGREES,
  MAX_RELIABLE_YAW_DEGREES,
  MIN_FACE_HEIGHT_RATIO,
  selectFace,
} from './landmark-selection.utils';
import type { FaceCandidate } from './landmark-selection.utils';

/** A face occupying a box, centred on cx, with a given height in frame units. */
const faceAt = (
  centreX: number,
  centreY: number,
  height: number,
  overrides: Partial<FaceCandidate> = {},
): FaceCandidate => {
  const halfHeight = height / 2;
  const halfWidth = height / 3;

  return {
    points: [
      { x: centreX - halfWidth, y: centreY - halfHeight },
      { x: centreX + halfWidth, y: centreY - halfHeight },
      { x: centreX, y: centreY + halfHeight },
    ],
    confidence: 0.95,
    yawDegrees: 0,
    rollDegrees: 0,
    ...overrides,
  };
};

describe('choosing between faces', () => {
  it('measures the only face there is', () => {
    const result = selectFace([faceAt(0.5, 0.5, 0.6)]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.hadOtherFaces).toBe(false);
  });

  it('chooses the largest when there are several, and says so', () => {
    // Silently measuring one of two faces is the failure mode that produces a
    // confident, wrong answer about the wrong person — a green tick here means
    // finding out at the passport office.
    const subject = faceAt(0.5, 0.5, 0.6);
    const bystander = faceAt(0.2, 0.4, 0.2);

    const result = selectFace([bystander, subject]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.face).toBe(subject);
    expect(result.hadOtherFaces).toBe(true);
  });

  it('does not depend on the order the detector returned them', () => {
    const subject = faceAt(0.5, 0.5, 0.6);
    const bystander = faceAt(0.2, 0.4, 0.2);

    const forwards = selectFace([subject, bystander]);
    const backwards = selectFace([bystander, subject]);

    expect(forwards.ok && forwards.face).toBe(subject);
    expect(backwards.ok && backwards.face).toBe(subject);
  });

  it('ignores candidates carrying no landmarks at all', () => {
    const empty: FaceCandidate = {
      points: [],
      confidence: 0.1,
      yawDegrees: 0,
      rollDegrees: 0,
    };
    const real = faceAt(0.5, 0.5, 0.6);

    const result = selectFace([empty, real]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.face).toBe(real);
    expect(result.hadOtherFaces).toBe(false);
  });
});

describe('declining to measure', () => {
  it('reports no face when there are none', () => {
    expect(selectFace([])).toEqual({ ok: false, reason: 'no-face' });
  });

  it('reports no face when every candidate is empty', () => {
    expect(
      selectFace([{ points: [], confidence: 0, yawDegrees: 0, rollDegrees: 0 }]),
    ).toEqual({ ok: false, reason: 'no-face' });
  });

  it('refuses a face too small to measure reliably', () => {
    // A one-pixel landmark error on a tiny face becomes several millimetres of
    // head height — larger than any specification tolerance.
    const result = selectFace([faceAt(0.5, 0.5, MIN_FACE_HEIGHT_RATIO - 0.01)]);

    expect(result).toEqual({ ok: false, reason: 'too-small' });
  });

  it('accepts a face exactly on the size threshold', () => {
    expect(selectFace([faceAt(0.5, 0.5, MIN_FACE_HEIGHT_RATIO + 0.001)]).ok).toBe(true);
  });

  it('refuses a face touching the top edge', () => {
    // Touching the edge usually means partly outside it, and the landmarks on
    // that side are extrapolated rather than observed.
    expect(selectFace([faceAt(0.5, 0.25, 0.5)])).toEqual({
      ok: false,
      reason: 'touches-frame-edge',
    });
  });

  it('refuses a face touching the bottom edge', () => {
    expect(selectFace([faceAt(0.5, 0.75, 0.5)])).toEqual({
      ok: false,
      reason: 'touches-frame-edge',
    });
  });

  it('refuses a face touching the left edge', () => {
    expect(selectFace([faceAt(0.1, 0.5, 0.6)])).toEqual({
      ok: false,
      reason: 'touches-frame-edge',
    });
  });

  it('refuses a face touching the right edge', () => {
    expect(selectFace([faceAt(0.9, 0.5, 0.6)])).toEqual({
      ok: false,
      reason: 'touches-frame-edge',
    });
  });

  it('refuses a face turned too far to measure', () => {
    const result = selectFace([
      faceAt(0.5, 0.5, 0.6, { yawDegrees: MAX_RELIABLE_YAW_DEGREES + 1 }),
    ]);

    expect(result).toEqual({ ok: false, reason: 'pose-unreliable' });
  });

  it('refuses a face turned too far the other way', () => {
    // Signed, so the check must be on the magnitude. A left-turned head is
    // exactly as unmeasurable as a right-turned one.
    const result = selectFace([
      faceAt(0.5, 0.5, 0.6, { yawDegrees: -(MAX_RELIABLE_YAW_DEGREES + 1) }),
    ]);

    expect(result).toEqual({ ok: false, reason: 'pose-unreliable' });
  });

  it('refuses a face tilted too far', () => {
    const result = selectFace([
      faceAt(0.5, 0.5, 0.6, { rollDegrees: MAX_RELIABLE_ROLL_DEGREES + 1 }),
    ]);

    expect(result).toEqual({ ok: false, reason: 'pose-unreliable' });
  });

  it('accepts a pose exactly on the threshold', () => {
    // The rule engine enforces the actual requirement with its own wording.
    // This threshold only decides whether measuring is worth doing at all, so
    // it must not reject a face the rules would merely warn about.
    expect(
      selectFace([faceAt(0.5, 0.5, 0.6, { yawDegrees: MAX_RELIABLE_YAW_DEGREES })]).ok,
    ).toBe(true);
  });

  it('checks size before pose, so the more basic problem is reported first', () => {
    const result = selectFace([
      faceAt(0.5, 0.5, MIN_FACE_HEIGHT_RATIO - 0.01, { yawDegrees: 80 }),
    ]);

    expect(result).toEqual({ ok: false, reason: 'too-small' });
  });
});

describe('faceArea', () => {
  it('is zero for a candidate with no points', () => {
    expect(faceArea({ points: [], confidence: 0, yawDegrees: 0, rollDegrees: 0 })).toBe(0);
  });

  it('grows with the bounding box', () => {
    expect(faceArea(faceAt(0.5, 0.5, 0.6))).toBeGreaterThan(faceArea(faceAt(0.5, 0.5, 0.3)));
  });
});
