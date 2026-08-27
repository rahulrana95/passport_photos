import { describe, expect, it } from 'vitest';
import {
  buildTonedFace,
  faceMembership,
  NEUTRAL_FACE_SPEC,
  SKIN_TONE_SWEEP,
} from '@/testing/fixtures/toned-face.builder';
import { summariseTones } from './luminance.utils';
import { evaluateExposure, MIN_TONAL_RANGE } from './exposure.utils';
import type { TonedFaceSpec } from '@/testing/fixtures/toned-face.builder';

const exposureOf = (overrides: Partial<TonedFaceSpec> = {}): ReturnType<typeof evaluateExposure> => {
  const spec = { ...NEUTRAL_FACE_SPEC, ...overrides };
  return evaluateExposure(summariseTones(buildTonedFace(spec), faceMembership(spec)));
};

describe('FAIRNESS: skin tone must not change the verdict', () => {
  it('returns the same verdict across every skin tone, at the same exposure', () => {
    // The requirement this whole module is shaped around. A mean-luminance
    // threshold — the obvious implementation — fails this test by design,
    // because skin tone IS luminance: a correctly exposed photograph of dark
    // skin has a lower mean than a correctly exposed photograph of pale skin.
    // Any threshold on the mean rejects darker-skinned people for having been
    // photographed accurately, and says so in official-sounding language.
    const verdicts = SKIN_TONE_SWEEP.map((baseTone) => exposureOf({ baseTone }).verdict);

    expect(new Set(verdicts).size, `verdicts were ${verdicts.join(', ')}`).toBe(1);
    expect(verdicts[0]).toBe('well-exposed');
  });

  it('reports the same verdict for the darkest and lightest tones', () => {
    const darkest = SKIN_TONE_SWEEP[0] ?? 0;
    const lightest = SKIN_TONE_SWEEP.at(-1) ?? 0;

    expect(exposureOf({ baseTone: darkest }).verdict).toBe(
      exposureOf({ baseTone: lightest }).verdict,
    );
  });

  it('measures a tonal range that does not vary with skin tone', () => {
    // The signal the verdict rests on must itself be tone-independent, or the
    // verdict only happens to agree at the thresholds chosen today.
    const ranges = SKIN_TONE_SWEEP.map((baseTone) => exposureOf({ baseTone }).tonalRange);
    const spread = Math.max(...ranges) - Math.min(...ranges);

    expect(spread, `ranges were ${ranges.join(', ')}`).toBeLessThan(6);
  });

  it('flags under-exposure at every skin tone, not just pale ones', () => {
    // The other half of fairness. A check that never fires for dark skin is as
    // broken as one that always fires — it would tell someone their unusable
    // photograph was fine.
    for (const baseTone of SKIN_TONE_SWEEP) {
      const crushed = exposureOf({ baseTone, modellingRange: 6 });

      expect(crushed.verdict, `tone ${baseTone}`).toBe('flat');
    }
  });

  it('flags over-exposure at every skin tone', () => {
    // The bias is computed per tone, not fixed. A single large bias would be
    // the wrong test: +140 blows out pale skin and merely brightens dark skin,
    // so asserting that both clip asserts something untrue. What fairness
    // requires is that the check FIRES for every tone once that tone is
    // genuinely blown, which is what this does.
    for (const baseTone of SKIN_TONE_SWEEP) {
      const blown = exposureOf({ baseTone, exposureBias: 270 - baseTone });

      expect(blown.verdict, `tone ${baseTone}`).toBe('clipped-highlights');
    }
  });

  it('flags crushed shadows at every skin tone', () => {
    for (const baseTone of SKIN_TONE_SWEEP) {
      const crushed = exposureOf({ baseTone, exposureBias: -(baseTone + 20) });

      expect(crushed.verdict, `tone ${baseTone}`).toBe('clipped-shadows');
    }
  });

  it('does not call a brightened dark-skinned photograph over-exposed', () => {
    // Brightening dark skin by a lot produces a washed-out picture that still
    // holds all its detail. Calling that "over-exposed" would be the same
    // mistake as the mean-luminance check, wearing a different name: the
    // photograph is inaccurate in colour, not in exposure, and no single
    // image can reveal what the subject's skin actually looks like.
    const brightened = exposureOf({ baseTone: 55, exposureBias: 140 });

    expect(brightened.verdict).toBe('well-exposed');
  });
});

describe('what a good exposure looks like', () => {
  it('accepts a well-modelled face', () => {
    expect(exposureOf().verdict).toBe('well-exposed');
  });

  it('reports the spread between the fifth and ninety-fifth percentiles', () => {
    // Not the full min-to-max range, which one hot pixel would dominate.
    expect(exposureOf().tonalRange).toBeGreaterThan(MIN_TONAL_RANGE);
  });

  it('tolerates the specular highlights every real photograph has', () => {
    // Demanding zero clipped pixels would fail every photograph ever taken: a
    // catchlight in an eye is pure white in almost all of them.
    const faceSpec = { ...NEUTRAL_FACE_SPEC, baseTone: 150 };
    const buffer = buildTonedFace(faceSpec);
    const inFace = faceMembership(faceSpec);

    // A handful of pixels pushed to pure white, as a catchlight would be.
    for (let index = 0; index < 40; index += 1) {
      const target = (NEUTRAL_FACE_SPEC.centreY * NEUTRAL_FACE_SPEC.widthPx + index) * 4;
      buffer.data[target] = 255;
      buffer.data[target + 1] = 255;
      buffer.data[target + 2] = 255;
    }

    expect(evaluateExposure(summariseTones(buffer, inFace)).verdict).toBe('well-exposed');
  });
});

describe('bright but valid, versus genuinely clipped', () => {
  it('accepts a bright photograph that retains detail', () => {
    // High-key lighting is a style, not a fault. What matters is whether the
    // detail survived, and at bias 40 with a base of 150 it does.
    const bright = exposureOf({ baseTone: 150, exposureBias: 40 });

    expect(bright.verdict).toBe('well-exposed');
    expect(bright.clippedWhiteRatio).toBeLessThan(0.02);
  });

  it('rejects a photograph whose highlights have gone', () => {
    const blown = exposureOf({ baseTone: 200, exposureBias: 60 });

    expect(blown.verdict).toBe('clipped-highlights');
  });

  it('reports highlights before flatness when both are true', () => {
    // Clipping names the specific thing that went wrong; flatness only says
    // the result is unusable. A photo with blown highlights is told about its
    // highlights.
    const blownAndFlat = exposureOf({ baseTone: 250, modellingRange: 4, exposureBias: 30 });

    expect(blownAndFlat.verdict).toBe('clipped-highlights');
  });
});

describe('an empty selection', () => {
  it('reports flat rather than dividing by zero', () => {
    const nothing = summariseTones(buildTonedFace(), () => false);

    expect(nothing.sampleCount).toBe(0);
    expect(evaluateExposure(nothing).verdict).toBe('flat');
  });
});
