import { describe, expect, it } from 'vitest';
import { createDeterministicRandom, deterministicNoise } from './deterministic-random.utils';

describe('createDeterministicRandom', () => {
  it('produces the same sequence for the same seed', () => {
    const first = createDeterministicRandom(42);
    const second = createDeterministicRandom(42);

    expect([first(), first(), first()]).toEqual([second(), second(), second()]);
  });

  it('produces a different sequence for a different seed', () => {
    const first = createDeterministicRandom(1);
    const second = createDeterministicRandom(2);

    expect(first()).not.toBe(second());
  });

  it('stays within the unit interval', () => {
    const random = createDeterministicRandom(7);

    for (let index = 0; index < 1000; index += 1) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('handles a zero seed', () => {
    const random = createDeterministicRandom(0);

    expect(Number.isFinite(random())).toBe(true);
  });
});

describe('deterministicNoise', () => {
  it('stays within the requested amplitude', () => {
    const random = createDeterministicRandom(3);

    for (let index = 0; index < 500; index += 1) {
      expect(Math.abs(deterministicNoise(random, 5))).toBeLessThanOrEqual(5);
    }
  });

  it('returns zero when the amplitude is zero', () => {
    expect(deterministicNoise(createDeterministicRandom(1), 0)).toBe(0);
  });
});
