import { describe, expect, it } from 'vitest';
import {
  buildTonedFace,
  faceMembership,
  NEUTRAL_FACE_SPEC,
  SKIN_TONE_SWEEP,
} from '@/testing/fixtures/toned-face.builder';
import {
  evaluateBackground,
  MAX_SHADOW_GRADIENT,
  MIN_BACKGROUND_SAMPLES,
  subjectBackgroundContrast,
  subjectBackgroundSeparation,
} from './background.utils';
import type { BackgroundRequirement } from './background.utils';
import type { TonedFaceSpec } from '@/testing/fixtures/toned-face.builder';

/** An off-white background requirement, as most authorities publish. */
const offWhite: BackgroundRequirement = {
  hexRange: ['#e0e0e0', '#ffffff'],
  uniformityTolerance: 6,
};

const backgroundOf = (
  overrides: Partial<TonedFaceSpec> = {},
  requirement: BackgroundRequirement = offWhite,
): ReturnType<typeof evaluateBackground> => {
  const spec = { ...NEUTRAL_FACE_SPEC, ...overrides };
  const inFace = faceMembership(spec);
  return evaluateBackground(buildTonedFace(spec), (index) => !inFace(index), requirement);
};

describe('a plain, evenly lit background', () => {
  it('is acceptable', () => {
    expect(backgroundOf().verdict).toBe('acceptable');
  });

  it('reports a low standard deviation', () => {
    expect(backgroundOf().uniformity).toBeLessThan(offWhite.uniformityTolerance);
  });

  it('reports its mean colour', () => {
    expect(backgroundOf().meanColour.red).toBeCloseTo(240, 0);
  });
});

describe('backgrounds that fail', () => {
  it('rejects a patterned or textured wall', () => {
    // Measured: a pattern amplitude of 30 gives a standard deviation of 13,
    // against a plain wall's 1.2.
    expect(backgroundOf({ backgroundPatternAmplitude: 30 }).verdict).toBe('not-uniform');
  });

  it('accepts a wall with the faintest texture', () => {
    // Rejecting every imperfection would fail every real room.
    expect(backgroundOf({ backgroundPatternAmplitude: 5 }).verdict).toBe('acceptable');
  });

  it('rejects a background of the wrong colour', () => {
    expect(backgroundOf({ background: { red: 90, green: 130, blue: 200 } }).verdict).toBe(
      'wrong-colour',
    );
  });

  it('detects a shadow cast across one side', () => {
    // Measured side-to-side rather than as an overall spread, because that is
    // what a shadow from the subject actually looks like.
    const shadowed = backgroundOf({ backgroundGradient: 50 });

    expect(shadowed.verdict).toBe('shadowed');
    expect(shadowed.shadowGradient).toBeGreaterThan(MAX_SHADOW_GRADIENT);
  });

  it('does not call an evenly textured wall shadowed', () => {
    // Texture has spread and no gradient; a shadow has both. Conflating them
    // would send someone to move a lamp when they need a different wall.
    expect(backgroundOf({ backgroundPatternAmplitude: 30 }).shadowGradient).toBeLessThan(
      MAX_SHADOW_GRADIENT,
    );
  });
});

describe('ordering of verdicts', () => {
  it('reports the wrong colour before unevenness', () => {
    // A blue wall is wrong however evenly it is lit. Telling someone their
    // background is uneven sends them to fix the wrong thing.
    const blueAndPatterned = backgroundOf({
      background: { red: 90, green: 130, blue: 200 },
      backgroundPatternAmplitude: 30,
    });

    expect(blueAndPatterned.verdict).toBe('wrong-colour');
  });

  it('reports too little background before anything else', () => {
    // No other verdict from a handful of corner pixels would mean anything.
    const buffer = buildTonedFace();

    expect(evaluateBackground(buffer, (index) => index < 50, offWhite).verdict).toBe(
      'too-little-background',
    );
  });

  it('needs a real sample before it will judge uniformity', () => {
    const buffer = buildTonedFace();
    const result = evaluateBackground(buffer, (index) => index < 50, offWhite);

    expect(result.sampleCount).toBeLessThan(MIN_BACKGROUND_SAMPLES);
  });

  it('handles a selection with no background at all', () => {
    expect(evaluateBackground(buildTonedFace(), () => false, offWhite).verdict).toBe(
      'too-little-background',
    );
  });
});

describe('a subject that blends into the background', () => {
  it('reports a large separation for a dark head on a light wall', () => {
    const spec = { ...NEUTRAL_FACE_SPEC, baseTone: 60 };
    const inFace = faceMembership(spec);

    expect(
      subjectBackgroundSeparation(buildTonedFace(spec), (index) => !inFace(index)),
    ).toBeGreaterThan(100);
  });

  it('reports a small separation when subject and wall are the same tone', () => {
    // Neither dark hair on a dark wall nor white clothing on a white wall can
    // be segmented reliably, and every measurement taken through that mask is
    // suspect. Knowing the two are hard to tell apart is worth more than any
    // single measurement made anyway.
    const spec = {
      ...NEUTRAL_FACE_SPEC,
      baseTone: 238,
      modellingRange: 4,
      background: { red: 240, green: 240, blue: 240 },
    };
    const inFace = faceMembership(spec);

    expect(
      subjectBackgroundSeparation(buildTonedFace(spec), (index) => !inFace(index)),
    ).toBeLessThan(10);
  });

  it('reports the contrast ratio as well, for showing a number to a person', () => {
    const spec = { ...NEUTRAL_FACE_SPEC, baseTone: 60 };
    const inFace = faceMembership(spec);

    expect(
      subjectBackgroundContrast(buildTonedFace(spec), (index) => !inFace(index)),
    ).toBeGreaterThan(1);
  });
});

describe('FAIRNESS: the background verdict must not depend on skin tone', () => {
  it('accepts the same wall behind every skin tone', () => {
    // The background check reads background pixels, so this should be
    // trivially true — and it is worth asserting precisely because it would
    // stop being true the moment someone "improved" it by normalising against
    // the whole frame.
    for (const baseTone of SKIN_TONE_SWEEP) {
      expect(backgroundOf({ baseTone }).verdict, `tone ${baseTone}`).toBe('acceptable');
    }
  });

  it('measures the same uniformity behind every skin tone', () => {
    const measurements = SKIN_TONE_SWEEP.map((baseTone) => backgroundOf({ baseTone }).uniformity);
    const spread = Math.max(...measurements) - Math.min(...measurements);

    expect(spread).toBeLessThan(0.5);
  });
});
