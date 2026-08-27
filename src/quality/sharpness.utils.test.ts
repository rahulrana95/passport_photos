import { describe, expect, it } from 'vitest';
import {
  buildTonedFace,
  faceMembership,
  NEUTRAL_FACE_SPEC,
  SKIN_TONE_SWEEP,
} from '@/testing/fixtures/toned-face.builder';
import { evaluateSharpness, MIN_LAPLACIAN_VARIANCE } from './sharpness.utils';
import type { TonedFaceSpec } from '@/testing/fixtures/toned-face.builder';

const sharpnessOf = (
  overrides: Partial<TonedFaceSpec> = {},
): ReturnType<typeof evaluateSharpness> => {
  const spec = { ...NEUTRAL_FACE_SPEC, ...overrides };
  return evaluateSharpness(buildTonedFace(spec), faceMembership(spec));
};

describe('focus', () => {
  it('calls a sharp face sharp', () => {
    expect(sharpnessOf().verdict).toBe('sharp');
  });

  it('calls even a mild blur soft', () => {
    // A one-pixel box blur measures 36 against a sharp face's 676. Nineteenfold
    // is not a marginal difference.
    expect(sharpnessOf({ blurRadius: 1 }).verdict).toBe('soft');
  });

  it('falls further as the blur widens', () => {
    const measurements = [0, 1, 2, 3].map(
      (blurRadius) => sharpnessOf({ blurRadius }).laplacianVariance,
    );

    for (let index = 1; index < measurements.length; index += 1) {
      expect(measurements[index]).toBeLessThan(measurements[index - 1] ?? 0);
    }
  });

  it('leaves a wide margin between sharp and the mildest blur', () => {
    // The threshold should sit in empty space, not beside a boundary a
    // different noise seed could cross.
    expect(sharpnessOf().laplacianVariance).toBeGreaterThan(MIN_LAPLACIAN_VARIANCE * 3);
    expect(sharpnessOf({ blurRadius: 1 }).laplacianVariance).toBeLessThan(
      MIN_LAPLACIAN_VARIANCE / 2,
    );
  });
});

describe('FAIRNESS: sharpness must not depend on skin tone', () => {
  it('calls a sharp face sharp at every tone', () => {
    // Laplacian variance scales with local contrast, and a dark face has less
    // absolute contrast than a pale one at the same lighting. If that were
    // enough to cross the threshold, darker-skinned users would be told their
    // in-focus photograph was blurred.
    for (const baseTone of SKIN_TONE_SWEEP) {
      expect(sharpnessOf({ baseTone }).verdict, `tone ${baseTone}`).toBe('sharp');
    }
  });

  it('calls a blurred face soft at every tone', () => {
    for (const baseTone of SKIN_TONE_SWEEP) {
      expect(sharpnessOf({ baseTone, blurRadius: 2 }).verdict, `tone ${baseTone}`).toBe('soft');
    }
  });
});

describe('regions too small to judge', () => {
  it('declines rather than reporting a variance from a handful of pixels', () => {
    const buffer = buildTonedFace();

    expect(evaluateSharpness(buffer, (index) => index < 100).verdict).toBe('too-small-to-judge');
  });

  it('declines on an empty selection', () => {
    expect(evaluateSharpness(buildTonedFace(), () => false).verdict).toBe('too-small-to-judge');
  });

  it('reports zero variance when it declines, rather than a misleading number', () => {
    expect(evaluateSharpness(buildTonedFace(), () => false).laplacianVariance).toBe(0);
  });
});

describe('what it deliberately cannot distinguish', () => {
  it('gives the same verdict for any cause of softness', () => {
    // Motion blur, camera shake, a missed focus and a shallow depth of field
    // all reduce the Laplacian identically. The verdict is "soft" and never a
    // diagnosis, because the pixels genuinely do not say which — and a
    // confident wrong reason sends someone to fix the wrong thing.
    const blurred = sharpnessOf({ blurRadius: 2 });
    const alsoBlurred = sharpnessOf({ blurRadius: 2, seed: 99 });

    expect(blurred.verdict).toBe(alsoBlurred.verdict);
  });
});
