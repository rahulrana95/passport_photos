/**
 * A seeded pseudo-random generator.
 *
 * Math.random cannot be used anywhere in fixture generation: a fixture that
 * differs between machines turns a real regression and a flaky test into the
 * same symptom. mulberry32 is small, fast, and produces an identical sequence
 * everywhere for a given seed.
 */
/*
 * The literals below are mulberry32's own published constants. Extracting them
 * into named exports would make the algorithm harder to recognise and harder to
 * check against the reference, not easier — they have no meaning individually.
 *
 * The lint exemption that allows them is no longer a disable comment here: it
 * is scoped in eslint.config.mjs to constants files and this fixtures
 * directory, alongside the format signatures and the EXIF orientation domain,
 * which are transcribed values for the same reason.
 */
export const createDeterministicRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;

  return (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Maps the unit interval onto a symmetric range about zero. */
const UNIT_TO_SIGNED_SCALE = 2;

/** Signed noise in [-amplitude, +amplitude]. */
export const deterministicNoise = (random: () => number, amplitude: number): number =>
  (random() * UNIT_TO_SIGNED_SCALE - 1) * amplitude;
