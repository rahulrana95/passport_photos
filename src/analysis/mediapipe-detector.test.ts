import { describe, expect, it } from 'vitest';
import { poseFromMatrix } from './mediapipe-detector';

const DEGREES_PER_RADIAN = 180 / Math.PI;

/**
 * Written row by row, then transposed.
 *
 * MediaPipe reports the transform column-major. Writing the rows out as they
 * appear in a textbook and transposing once is far harder to get subtly wrong
 * than hand-placing sixteen numbers in column order — which is exactly the
 * mistake the implementation made first time.
 */
const columnMajor = (rows: readonly (readonly number[])[]): number[] => {
  const flat: number[] = [];
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) flat.push(rows[row]?.[column] ?? 0);
  }
  return flat;
};

const rotationAboutY = (radians: number): number[] =>
  columnMajor([
    [Math.cos(radians), 0, Math.sin(radians), 0],
    [0, 1, 0, 0],
    [-Math.sin(radians), 0, Math.cos(radians), 0],
    [0, 0, 0, 1],
  ]);

const rotationAboutX = (radians: number): number[] =>
  columnMajor([
    [1, 0, 0, 0],
    [0, Math.cos(radians), -Math.sin(radians), 0],
    [0, Math.sin(radians), Math.cos(radians), 0],
    [0, 0, 0, 1],
  ]);

const rotationAboutZ = (radians: number): number[] =>
  columnMajor([
    [Math.cos(radians), -Math.sin(radians), 0, 0],
    [Math.sin(radians), Math.cos(radians), 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ]);

/** Column-major 4x4 product, so combined rotations can be built from parts. */
const multiply = (left: readonly number[], right: readonly number[]): number[] => {
  const out = new Array<number>(16).fill(0);
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      let sum = 0;
      for (let k = 0; k < 4; k += 1) {
        sum += (left[k * 4 + row] ?? 0) * (right[column * 4 + k] ?? 0);
      }
      out[column * 4 + row] = sum;
    }
  }
  return out;
};

describe('poseFromMatrix', () => {
  it('reports no rotation for the identity matrix', () => {
    // MediaPipe reports pose as a matrix; the rules that matter — head tilted,
    // head turned — are written in degrees.
    const identity = columnMajor([
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ]);

    expect(poseFromMatrix(identity)).toEqual({
      rollDegrees: 0,
      yawDegrees: 0,
      pitchDegrees: 0,
    });
  });

  it('recovers a yaw angle', () => {
    const angle = 20 / DEGREES_PER_RADIAN;

    expect(poseFromMatrix(rotationAboutY(angle)).yawDegrees).toBeCloseTo(20, 4);
  });

  it('recovers yaw in the other direction with the opposite sign', () => {
    // Signed, because "turned left" and "turned right" are different failures
    // and the user needs to be told which way to move.
    const angle = -25 / DEGREES_PER_RADIAN;

    expect(poseFromMatrix(rotationAboutY(angle)).yawDegrees).toBeCloseTo(-25, 4);
  });

  it('recovers a roll angle', () => {
    const angle = 15 / DEGREES_PER_RADIAN;

    expect(poseFromMatrix(rotationAboutZ(angle)).rollDegrees).toBeCloseTo(15, 4);
  });

  it('recovers roll in the other direction', () => {
    const angle = -10 / DEGREES_PER_RADIAN;

    expect(poseFromMatrix(rotationAboutZ(angle)).rollDegrees).toBeCloseTo(-10, 4);
  });

  it('reads a pure yaw as no roll, and the reverse', () => {
    // The two must not bleed into each other: a turned head reported as tilted
    // would send the user to correct the wrong thing.
    expect(poseFromMatrix(rotationAboutY(30 / DEGREES_PER_RADIAN)).rollDegrees).toBeCloseTo(0, 4);
    expect(poseFromMatrix(rotationAboutZ(30 / DEGREES_PER_RADIAN)).yawDegrees).toBeCloseTo(0, 4);
  });

  it('recovers a pitch angle', () => {
    // Magnitude is what the pitch rule reports; the sign is deliberately not
    // relied on anywhere. Asserted here so a decomposition change that lost
    // the angle entirely would still be caught.
    expect(Math.abs(poseFromMatrix(rotationAboutX(18 / DEGREES_PER_RADIAN)).pitchDegrees))
      .toBeCloseTo(18, 4);
  });

  it('reads a pure pitch as neither roll nor yaw', () => {
    const pose = poseFromMatrix(rotationAboutX(18 / DEGREES_PER_RADIAN));

    expect(pose.rollDegrees).toBeCloseTo(0, 4);
    expect(pose.yawDegrees).toBeCloseTo(0, 4);
  });

  it('reports yaw correctly on a head that is also pitched', () => {
    // This is the case the first implementation got wrong. Dividing by R[2][2]
    // alone is only the cosine of the yaw while the head is level; once the
    // chin drops, that denominator shrinks and the yaw is overstated — a
    // straight-on face reported as turned away.
    const yaw = 20 / DEGREES_PER_RADIAN;
    const pitch = 25 / DEGREES_PER_RADIAN;
    const combined = multiply(rotationAboutY(yaw), rotationAboutX(pitch));

    expect(poseFromMatrix(combined).yawDegrees).toBeCloseTo(20, 4);
  });

  it('reports no rotation for a matrix that is too short to read', () => {
    // MediaPipe returns an empty array when it has no transform for a face.
    // Guessing an angle from a partial matrix would be worse than admitting
    // there is nothing to read.
    expect(poseFromMatrix([])).toEqual({ rollDegrees: 0, yawDegrees: 0, pitchDegrees: 0 });
    expect(poseFromMatrix([1, 0, 0])).toEqual({
      rollDegrees: 0,
      yawDegrees: 0,
      pitchDegrees: 0,
    });
  });
});
