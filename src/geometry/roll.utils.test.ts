import { describe, expect, it } from 'vitest';
import { rollFromEyes } from './roll.utils';

describe('rollFromEyes', () => {
  it('reports zero for a level line', () => {
    expect(rollFromEyes({ x: 100, y: 200 }, { x: 300, y: 200 })).toBe(0);
  });

  it('never returns negative zero', () => {
    // atan2 returns -0 for a level line read right-to-left, and "-0°" reads as
    // a broken tool rather than a level head.
    expect(Object.is(rollFromEyes({ x: 300, y: 200 }, { x: 100, y: 200 }), -0)).toBe(false);
  });

  it('is positive when the right eye sits lower', () => {
    expect(rollFromEyes({ x: 100, y: 100 }, { x: 200, y: 200 })).toBeCloseTo(45, 6);
  });

  it('is negative when the right eye sits higher', () => {
    // Signed, because "tilt left" and "tilt right" are different instructions
    // and a magnitude alone cannot say which.
    expect(rollFromEyes({ x: 100, y: 200 }, { x: 200, y: 100 })).toBeCloseTo(-45, 6);
  });

  it('does not depend on how far apart the eyes are', () => {
    expect(rollFromEyes({ x: 0, y: 0 }, { x: 10, y: 10 })).toBeCloseTo(
      rollFromEyes({ x: 0, y: 0 }, { x: 1000, y: 1000 }),
      6,
    );
  });
});
