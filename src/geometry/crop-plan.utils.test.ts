import { describe, expect, it } from 'vitest';
import { planCrop } from './crop-plan.utils';
import type { SubjectGeometry } from './geometry.types';
import type { ResolvedPhotoSpec } from '@/photo-spec/photo-spec.types';

/**
 * A US-shaped specification: 51x51mm at 300dpi, head 25-35mm, no eye-line rule.
 * Only the fields the geometry engine reads are populated — the rest of a
 * PhotoSpec is about rules this module does not evaluate.
 */
const usSpec = (overrides: Partial<ResolvedPhotoSpec> = {}): ResolvedPhotoSpec =>
  ({
    print: { widthMm: 51, heightMm: 51, dpi: 300 },
    headHeight: { minMm: 25, maxMm: 35, minRatio: 0.49, maxRatio: 0.69, authoredUnit: 'mm' },
    ...overrides,
  }) as ResolvedPhotoSpec;

/** A Schengen-shaped specification: 35x45mm, with an eye-line rule. */
const euSpec = (overrides: Partial<ResolvedPhotoSpec> = {}): ResolvedPhotoSpec =>
  ({
    print: { widthMm: 35, heightMm: 45, dpi: 300 },
    headHeight: { minMm: 32, maxMm: 36, minRatio: 0.71, maxRatio: 0.8, authoredUnit: 'ratio' },
    eyeLine: { minFromBottomMm: 26, maxFromBottomMm: 32 },
    ...overrides,
  }) as ResolvedPhotoSpec;

/** A well-framed subject in a 3024x4032 portrait photograph. */
const subject = (overrides: Partial<SubjectGeometry> = {}): SubjectGeometry => ({
  crownY: 900,
  chin: { x: 1500, y: 2400 },
  leftEye: { x: 1350, y: 1500 },
  rightEye: { x: 1650, y: 1500 },
  sourceWidthPx: 3024,
  sourceHeightPx: 4032,
  ...overrides,
});

describe('a crop that satisfies the specification', () => {
  it('lands the head in the middle of the band, not at an edge', () => {
    // Aiming at an edge would mean landmark jitter of a pixel or two flips a
    // photo from pass to fail between runs with nothing about it changing.
    const result = planCrop(subject(), usSpec());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.measurements.headHeightMm).toBeCloseTo(30, 6);
    expect(result.measurements.headHeight.status).toBe('within');
  });

  it('produces a crop with the printed aspect ratio', () => {
    const result = planCrop(subject(), euSpec());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.crop.widthPx / result.crop.heightPx).toBeCloseTo(35 / 45, 6);
  });

  it('produces a square crop for a square specification', () => {
    const result = planCrop(subject(), usSpec());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.crop.widthPx).toBeCloseTo(result.crop.heightPx, 6);
  });

  it('places the eye line where the specification asks', () => {
    const result = planCrop(subject(), euSpec());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.measurements.eyeLineFromBottomMm).toBeCloseTo(29, 6);
    expect(result.measurements.eyeLine?.status).toBe('within');
  });

  it('reports no eye-line measurement when the specification states no rule', () => {
    // Reporting one would invite the UI to show a requirement the authority
    // never published.
    const result = planCrop(subject(), usSpec());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.measurements.eyeLineFromBottomMm).toBeUndefined();
    expect(result.measurements.eyeLine).toBeUndefined();
  });

  it('centres the crop on the face midline', () => {
    const result = planCrop(subject(), usSpec());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.measurements.horizontalOffsetRatio).toBeCloseTo(0, 6);
  });

  it('keeps the crop inside the source image', () => {
    const source = subject();
    const result = planCrop(source, usSpec());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.crop.x).toBeGreaterThanOrEqual(0);
    expect(result.crop.y).toBeGreaterThanOrEqual(0);
    expect(result.crop.x + result.crop.widthPx).toBeLessThanOrEqual(source.sourceWidthPx);
    expect(result.crop.y + result.crop.heightPx).toBeLessThanOrEqual(source.sourceHeightPx);
  });
});

describe('the head always lands in band, across every plausible geometry', () => {
  it('holds for head sizes from small to nearly frame-filling', () => {
    // The property that matters: the crop is derived from the head, so the
    // measured head height is the target by construction. If this ever fails,
    // the derivation is wrong rather than a threshold being off.
    for (const headPixels of [200, 400, 800, 1200, 1800, 2400]) {
      const crownY = 300;
      const source = subject({
        crownY,
        chin: { x: 1500, y: crownY + headPixels },
        leftEye: { x: 1350, y: crownY + headPixels * 0.45 },
        rightEye: { x: 1650, y: crownY + headPixels * 0.45 },
      });

      const result = planCrop(source, usSpec());
      if (!result.ok) continue;

      expect(result.measurements.headHeight.status, `head ${headPixels}px`).toBe('within');
      expect(result.measurements.headHeightMm, `head ${headPixels}px`).toBeCloseTo(30, 6);
    }
  });

  it('holds for both specification shapes', () => {
    for (const spec of [usSpec(), euSpec()]) {
      const result = planCrop(subject(), spec);

      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.measurements.headHeight.status).toBe('within');
    }
  });
});

describe('roll', () => {
  it('reports zero for level eyes, without a negative zero', () => {
    // "-0°" reads as a broken tool rather than a level head.
    const result = planCrop(subject(), usSpec());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.is(result.measurements.rollDegrees, -0)).toBe(false);
    expect(result.measurements.rollDegrees).toBe(0);
  });

  it('is signed, so the user can be told which way to tilt', () => {
    const tilted = planCrop(
      subject({ leftEye: { x: 1350, y: 1450 }, rightEye: { x: 1650, y: 1550 } }),
      usSpec(),
    );
    const other = planCrop(
      subject({ leftEye: { x: 1350, y: 1550 }, rightEye: { x: 1650, y: 1450 } }),
      usSpec(),
    );

    expect(tilted.ok && tilted.measurements.rollDegrees).toBeGreaterThan(0);
    expect(other.ok && other.measurements.rollDegrees).toBeLessThan(0);
  });

  it('measures the angle of the inter-ocular line', () => {
    const result = planCrop(
      subject({ leftEye: { x: 1400, y: 1500 }, rightEye: { x: 1600, y: 1700 } }),
      usSpec(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.measurements.rollDegrees).toBeCloseTo(45, 4);
  });
});

describe('horizontal centring', () => {
  it('is always zero here, because the crop is built around the midline', () => {
    // Not a weak assertion — a statement about what this function can and
    // cannot tell you. planCrop chooses where the crop goes, so centring is
    // satisfied by construction and can never fail. Whether a photograph
    // someone else already cropped is centred is a different question, and
    // measureFraming is what answers it.
    // Off the source's midline but still leaving room for the crop, so this
    // tests centring rather than the out-of-bounds check.
    const offCentre = planCrop(
      subject({ leftEye: { x: 1250, y: 1500 }, rightEye: { x: 1550, y: 1500 } }),
      usSpec(),
    );

    expect(offCentre.ok).toBe(true);
    if (!offCentre.ok) return;
    expect(offCentre.measurements.horizontalOffsetRatio).toBe(0);
  });
});

describe('cases with no valid crop', () => {
  it('declines when segmentation could not find the crown', () => {
    // Crown-to-chin is the measurement; without a crown there is nothing to
    // measure, and a guess here is the most consequential guess in the product.
    expect(planCrop(subject({ crownY: undefined }), usSpec())).toEqual({
      ok: false,
      reason: 'crown-unmeasured',
    });
  });

  it('declines when the crown is above the top edge', () => {
    expect(planCrop(subject({ crownY: -10 }), usSpec())).toEqual({
      ok: false,
      reason: 'head-not-in-frame',
    });
  });

  it('declines when the chin is below the bottom edge', () => {
    const source = subject({ chin: { x: 1500, y: 4100 } });

    expect(planCrop(source, usSpec())).toEqual({ ok: false, reason: 'head-not-in-frame' });
  });

  it('declines when the chin is above the crown', () => {
    const source = subject({ crownY: 2400, chin: { x: 1500, y: 2500 } });

    expect(planCrop(source, usSpec()).ok).toBe(false);
  });

  it('declines a head too few pixels tall to measure', () => {
    // The arithmetic still produces a crop; every millimetre in it is noise.
    const source = subject({ crownY: 1000, chin: { x: 1500, y: 1010 } });

    expect(planCrop(source, usSpec())).toEqual({ ok: false, reason: 'degenerate-geometry' });
  });

  it('declines when the required crop runs off the side of the source', () => {
    // A correctly-sized head positioned so no valid crop exists — the subject
    // stood too close to the edge of the frame.
    const source = subject({
      chin: { x: 200, y: 2400 },
      leftEye: { x: 50, y: 1500 },
      rightEye: { x: 350, y: 1500 },
    });

    expect(planCrop(source, usSpec())).toEqual({ ok: false, reason: 'crop-outside-source' });
  });

  it('declines when the required crop runs off the top of the source', () => {
    const source = subject({
      crownY: 60,
      chin: { x: 1500, y: 1560 },
      leftEye: { x: 1350, y: 700 },
      rightEye: { x: 1650, y: 700 },
    });

    expect(planCrop(source, usSpec())).toEqual({ ok: false, reason: 'crop-outside-source' });
  });

  it('declines when the source cannot supply the specification dpi', () => {
    // Never upscales. Enlarging to reach the pixel count invents detail the
    // printer renders as softness, which is itself a rejection reason.
    const small = subject({
      crownY: 100,
      chin: { x: 250, y: 300 },
      leftEye: { x: 210, y: 200 },
      rightEye: { x: 290, y: 200 },
      sourceWidthPx: 500,
      sourceHeightPx: 700,
    });

    expect(planCrop(small, usSpec())).toEqual({
      ok: false,
      reason: 'source-resolution-too-low',
    });
  });

  it('accepts a source exactly meeting the dpi requirement', () => {
    // 51mm at 300dpi is 602.36 pixels. A head of 30mm within that crop is
    // 354.3 pixels, so this is the smallest head the specification permits.
    const headPixels = (602.362 * 30) / 51;
    const crownY = 1000;
    const source = subject({
      crownY,
      chin: { x: 1500, y: crownY + headPixels },
      leftEye: { x: 1400, y: crownY + headPixels * 0.45 },
      rightEye: { x: 1600, y: crownY + headPixels * 0.45 },
    });

    expect(planCrop(source, usSpec()).ok).toBe(true);
  });
});

describe('extreme sources', () => {
  it('handles a very wide panorama when the head is small enough to crop from it', () => {
    // Width is never the constraint on a panorama; height is. A 2000px head
    // needs a 3400px crop, which a 3000px-tall source cannot supply however
    // wide it is — so the head has to be smaller for this to be a test of the
    // aspect ratio rather than of the resolution check.
    const panorama = subject({
      sourceWidthPx: 12000,
      sourceHeightPx: 3000,
      crownY: 400,
      chin: { x: 1500, y: 1400 },
      leftEye: { x: 1400, y: 850 },
      rightEye: { x: 1600, y: 850 },
    });

    expect(planCrop(panorama, usSpec()).ok).toBe(true);
  });

  it('declines a panorama too short for the crop the head demands', () => {
    const panorama = subject({ sourceWidthPx: 12000, sourceHeightPx: 3000, crownY: 400 });

    expect(planCrop(panorama, usSpec())).toEqual({ ok: false, reason: 'crop-outside-source' });
  });

  it('declines a very tall narrow source where the crop will not fit', () => {
    const strip = subject({ sourceWidthPx: 400, sourceHeightPx: 6000 });

    expect(planCrop(strip, usSpec())).toEqual({ ok: false, reason: 'crop-outside-source' });
  });
});
