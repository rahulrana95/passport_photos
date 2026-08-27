import { describe, expect, it } from 'vitest';
import {
  addBlob,
  addHole,
  addSpeckle,
  BASE_MASK_SPEC,
  buildHeadMask,
  erodeEdge,
} from '@/testing/fixtures/mask-defect.builder';
import { estimateCrown } from './crown-detection.utils';
import type { CrownOptions } from './crown-detection.utils';
import type { MaskBuffer } from '@/testing/fixtures/mask-defect.builder';

/** The face centre, which the landmark stage supplies in real use. */
const options = (overrides: Partial<CrownOptions> = {}): CrownOptions => ({
  faceCentreX: BASE_MASK_SPEC.centreX,
  faceCentreY: (BASE_MASK_SPEC.crownY + BASE_MASK_SPEC.chinY) / 2,
  definition: 'visible-top',
  headWidthPx: BASE_MASK_SPEC.headWidthPx,
  ...overrides,
});

const crownOf = (mask: MaskBuffer, overrides: Partial<CrownOptions> = {}): number | undefined => {
  const result = estimateCrown(mask, options(overrides));
  return result.ok ? result.crownY : undefined;
};

/** Cleanup may shift the boundary by a pixel; more than that is a real error. */
const TOLERANCE_PX = 2;

describe('the clean case', () => {
  it('finds the crown within a pixel or two of where it was built', () => {
    // The ground truth is exact by construction, so a failure here is the code
    // and never a disputed hand measurement.
    const mask = buildHeadMask();

    expect(crownOf(mask)).toBeGreaterThanOrEqual(BASE_MASK_SPEC.crownY - TOLERANCE_PX);
    expect(crownOf(mask)).toBeLessThanOrEqual(BASE_MASK_SPEC.crownY + TOLERANCE_PX);
  });

  it('reports high confidence and no covering', () => {
    const result = estimateCrown(buildHeadMask(), options());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mayIncludeCovering).toBe(false);
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('tracks the crown when the head sits higher or lower in the frame', () => {
    for (const crownY of [30, 60, 90, 120]) {
      const mask = buildHeadMask({ crownY, chinY: crownY + 200 });
      expect(crownOf(mask), `crownY ${crownY}`).toBeLessThanOrEqual(crownY + TOLERANCE_PX);
      expect(crownOf(mask), `crownY ${crownY}`).toBeGreaterThanOrEqual(crownY - TOLERANCE_PX);
    }
  });
});

describe('mask defects that must not move the crown', () => {
  it('ignores speckle scattered above the head', () => {
    // A single stray pixel above the hair becomes the crown for any algorithm
    // that takes the topmost subject pixel in the frame.
    const mask = addSpeckle(buildHeadMask(), 400, 7);

    expect(crownOf(mask)).toBeLessThanOrEqual(BASE_MASK_SPEC.crownY + TOLERANCE_PX);
    expect(crownOf(mask)).toBeGreaterThanOrEqual(BASE_MASK_SPEC.crownY - TOLERANCE_PX);
  });

  it('ignores a hole punched inside the head', () => {
    const mask = addHole(buildHeadMask(), 130, 100, 40, 40);

    expect(crownOf(mask)).toBeLessThanOrEqual(BASE_MASK_SPEC.crownY + TOLERANCE_PX);
  });

  it('ignores a hole that reaches the top of the head', () => {
    // A model that lost the top of the hair leaves the crown row hollow. The
    // fill must close it rather than the measurement dropping to the next
    // intact row.
    const mask = addHole(buildHeadMask(), 140, 62, 20, 20);

    expect(crownOf(mask)).toBeLessThanOrEqual(BASE_MASK_SPEC.crownY + TOLERANCE_PX + 1);
  });

  it('ignores a detached earring blob beside the head', () => {
    const mask = addBlob(buildHeadMask(), 40, 200, 6);

    expect(crownOf(mask)).toBeGreaterThanOrEqual(BASE_MASK_SPEC.crownY - TOLERANCE_PX);
  });

  it('ignores a second person whose head is higher in the frame', () => {
    // The single most dangerous defect: a bystander's head above the subject's
    // makes the measured head far too tall, and the photo is rejected for a
    // reason the user cannot see in their own picture.
    const mask = addBlob(buildHeadMask(), 30, 20, 15);

    expect(crownOf(mask)).toBeGreaterThanOrEqual(BASE_MASK_SPEC.crownY - TOLERANCE_PX);
  });

  it('still measures a mask whose edge the model eroded', () => {
    const mask = erodeEdge(buildHeadMask(), 2);
    const crown = crownOf(mask);

    expect(crown).toBeDefined();
    // Erosion genuinely moves the boundary; the point is that it stays close
    // and does not collapse.
    expect(Math.abs((crown ?? 0) - BASE_MASK_SPEC.crownY)).toBeLessThan(8);
  });
});

describe('cases where it must decline', () => {
  it('declines when there is no mask at all', () => {
    // Segmentation failing is normal. The geometry that depends only on
    // landmarks still works, and crown height degrades to unmeasurable rather
    // than to wrong.
    expect(estimateCrown(undefined, options())).toEqual({ ok: false, reason: 'no-mask' });
  });

  it('declines when the head runs off the top of the frame', () => {
    // Guessing the height here is exactly the error that sends someone to a
    // passport office with a photo that will be rejected.
    const mask = buildHeadMask({ crownY: -20 });

    expect(estimateCrown(mask, options())).toEqual({
      ok: false,
      reason: 'crown-outside-frame',
    });
  });

  it('declines when the face point falls on background', () => {
    const mask = buildHeadMask();

    expect(estimateCrown(mask, options({ faceCentreX: 5, faceCentreY: 5 }))).toEqual({
      ok: false,
      reason: 'no-subject',
    });
  });

  it('declines when the subject is too small to be a person', () => {
    const tiny: MaskBuffer = {
      width: 300,
      height: 400,
      data: new Uint8ClampedArray(300 * 400),
    };
    for (let y = 100; y < 110; y += 1) {
      for (let x = 100; x < 110; x += 1) tiny.data[y * 300 + x] = 255;
    }

    expect(estimateCrown(tiny, options({ faceCentreX: 105, faceCentreY: 105 }))).toEqual({
      ok: false,
      reason: 'mask-unreliable',
    });
  });

  it('declines on a mask whose data is shorter than its dimensions', () => {
    // What a partially-read WASM buffer looks like. Refusing is right; reading
    // past the end and measuring the zeros would produce a confident number
    // from data that was never there.
    const truncated: MaskBuffer = {
      width: 300,
      height: 400,
      data: new Uint8ClampedArray(100).fill(255),
    };

    expect(estimateCrown(truncated, options({ faceCentreX: 5, faceCentreY: 0 })).ok).toBe(false);
  });

  it('measures a subject sitting against the bottom of the frame', () => {
    // What a photo showing only shoulders looks like: the top of the mask is
    // within a few rows of the frame's bottom edge, so the row the taper test
    // wants to sample is off the image entirely. It must read that as "no
    // width below" rather than reaching past the end.
    const shouldersOnly: MaskBuffer = {
      width: 100,
      height: 100,
      data: new Uint8ClampedArray(100 * 100),
    };
    for (let y = 95; y < 100; y += 1) {
      for (let x = 0; x < 100; x += 1) shouldersOnly.data[y * 100 + x] = 255;
    }

    const result = estimateCrown(
      shouldersOnly,
      options({ faceCentreX: 50, faceCentreY: 97, headWidthPx: 60 }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.crownY).toBe(95);
    expect(result.mayIncludeCovering).toBe(false);
  });

  it('declines on an entirely empty mask', () => {
    const empty: MaskBuffer = {
      width: 300,
      height: 400,
      data: new Uint8ClampedArray(300 * 400),
    };

    expect(estimateCrown(empty, options())).toEqual({ ok: false, reason: 'no-subject' });
  });
});

describe('head coverings and hair volume', () => {
  it('flags a hat rather than silently measuring to the top of it', () => {
    // The topmost opaque row is the covering, not the skull. Measuring to it
    // overstates head height, and the user cannot tell from the result that
    // the number is about their hat.
    const mask = buildHeadMask({ coveringPx: 40 });
    const result = estimateCrown(mask, options());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mayIncludeCovering).toBe(true);
    expect(result.confidence).toBeLessThan(0.8);
  });

  it('refuses outright when the specification means the skull', () => {
    // What is being asked for is underneath something opaque. No silhouette
    // contains it, so an answer would be invented.
    const mask = buildHeadMask({ coveringPx: 40 });

    expect(estimateCrown(mask, options({ definition: 'skull' }))).toEqual({
      ok: false,
      reason: 'mask-unreliable',
    });
  });

  it('does not flag ordinary hair as a covering', () => {
    // A hair halo tapers; a hat does not. Flagging every head with hair would
    // make the warning meaningless.
    const mask = buildHeadMask({ hairHaloPx: 12 });
    const result = estimateCrown(mask, options());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mayIncludeCovering).toBe(false);
  });

  it('does not flag voluminous hair, which is as wide as a hat', () => {
    // The test that width alone cannot pass. This halo is nearly the full head
    // width, so any absolute-width rule flags it — and then every person with
    // thick or curly hair sees a warning about a hat they are not wearing.
    const mask = buildHeadMask({ hairHaloPx: 30 });
    const result = estimateCrown(mask, options());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mayIncludeCovering).toBe(false);
  });

  it('flags a shallow cap, which is barely taller than hair', () => {
    // The other half of the same claim: a covering only a few rows deep is
    // still flat-topped, and depth is not what distinguishes it.
    const mask = buildHeadMask({ coveringPx: 10 });
    const result = estimateCrown(mask, options());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mayIncludeCovering).toBe(true);
  });

  it('does not mistake a hair clip for a covering', () => {
    // Flat-topped but narrow. Requiring width as well as flatness is what
    // stops small worn objects from suppressing the measurement.
    const mask = addBlob(buildHeadMask(), BASE_MASK_SPEC.centreX, BASE_MASK_SPEC.crownY, 8);
    const result = estimateCrown(mask, options());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mayIncludeCovering).toBe(false);
  });

  it('measures a bald head, where the crown is skin rather than hair', () => {
    const mask = buildHeadMask({ headWidthPx: 120, crownY: 70 });

    expect(crownOf(mask, { headWidthPx: 120 })).toBeLessThanOrEqual(70 + TOLERANCE_PX);
    expect(crownOf(mask, { headWidthPx: 120 })).toBeGreaterThanOrEqual(70 - TOLERANCE_PX);
  });
});
