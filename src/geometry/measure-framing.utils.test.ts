import { describe, expect, it } from 'vitest';
import { measureFraming } from './measure-framing.utils';
import type { SubjectGeometry } from './geometry.types';
import type { ResolvedPhotoSpec } from '@/photo-spec/photo-spec.types';

const usSpec = (): ResolvedPhotoSpec =>
  ({
    print: { widthMm: 51, heightMm: 51, dpi: 300 },
    headHeight: { minMm: 25, maxMm: 35, minRatio: 0.49, maxRatio: 0.69, authoredUnit: 'mm' },
  }) as ResolvedPhotoSpec;

const euSpec = (): ResolvedPhotoSpec =>
  ({
    print: { widthMm: 35, heightMm: 45, dpi: 300 },
    headHeight: { minMm: 32, maxMm: 36, minRatio: 0.71, maxRatio: 0.8, authoredUnit: 'ratio' },
    eyeLine: { minFromBottomMm: 26, maxFromBottomMm: 32 },
  }) as ResolvedPhotoSpec;

/**
 * A 600x600 photo that a booth already cropped, with a 30mm head.
 * 600px maps to 51mm, so a 30mm head is 352.9px and the eye line sits where
 * a compliant photo puts it.
 */
const boothPhoto = (overrides: Partial<SubjectGeometry> = {}): SubjectGeometry => ({
  crownY: 100,
  chin: { x: 300, y: 452.94 },
  leftEye: { x: 260, y: 260 },
  rightEye: { x: 340, y: 260 },
  sourceWidthPx: 600,
  sourceHeightPx: 600,
  ...overrides,
});

describe('measuring a photo someone already cropped', () => {
  it('measures head height against the whole image', () => {
    const result = measureFraming(boothPhoto(), usSpec());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.measurements.headHeightMm).toBeCloseTo(30, 1);
    expect(result.measurements.headHeight.status).toBe('within');
  });

  it('reports a head that is too large for the specification', () => {
    // The case planCrop can never produce and a booth produces constantly.
    const result = measureFraming(
      boothPhoto({ crownY: 50, chin: { x: 300, y: 550 } }),
      usSpec(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.measurements.headHeight.status).toBe('above');
  });

  it('reports a head that is too small', () => {
    const result = measureFraming(
      boothPhoto({ crownY: 250, chin: { x: 300, y: 400 } }),
      usSpec(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.measurements.headHeight.status).toBe('below');
  });
});

describe('horizontal centring, which only means something here', () => {
  it('reports zero for a face on the midline', () => {
    const result = measureFraming(boothPhoto(), usSpec());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.measurements.horizontalOffsetRatio).toBe(0);
  });

  it('is negative for a face left of centre', () => {
    // Signed, because "move left" and "move right" are different instructions
    // and a magnitude alone cannot say which.
    const result = measureFraming(
      boothPhoto({ leftEye: { x: 160, y: 260 }, rightEye: { x: 240, y: 260 } }),
      usSpec(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.measurements.horizontalOffsetRatio).toBeCloseTo(-0.1667, 3);
  });

  it('is positive for a face right of centre', () => {
    const result = measureFraming(
      boothPhoto({ leftEye: { x: 360, y: 260 }, rightEye: { x: 440, y: 260 } }),
      usSpec(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.measurements.horizontalOffsetRatio).toBeGreaterThan(0);
  });

  it('is expressed as a share of the width, so it means the same at any size', () => {
    const small = measureFraming(
      boothPhoto({ leftEye: { x: 160, y: 260 }, rightEye: { x: 240, y: 260 } }),
      usSpec(),
    );
    const large = measureFraming(
      boothPhoto({
        crownY: 200,
        chin: { x: 600, y: 905.88 },
        leftEye: { x: 320, y: 520 },
        rightEye: { x: 480, y: 520 },
        sourceWidthPx: 1200,
        sourceHeightPx: 1200,
      }),
      usSpec(),
    );

    expect(small.ok && small.measurements.horizontalOffsetRatio).toBeCloseTo(
      large.ok ? large.measurements.horizontalOffsetRatio : Number.NaN,
      6,
    );
  });
});

describe('the shape of the photo itself', () => {
  it('accepts a square photo for a square specification', () => {
    const result = measureFraming(boothPhoto(), usSpec());

    expect(result.ok && result.aspectMatches).toBe(true);
  });

  it('rejects a square photo for a 35x45 specification', () => {
    // A 51x51 print submitted to a Schengen application is the wrong shape
    // before anything about the face is considered.
    const result = measureFraming(boothPhoto(), euSpec());

    expect(result.ok && result.aspectMatches).toBe(false);
  });

  it('accepts a photo matching the 35x45 proportion', () => {
    const result = measureFraming(
      boothPhoto({ sourceWidthPx: 350, sourceHeightPx: 450, chin: { x: 175, y: 420 } }),
      euSpec(),
    );

    expect(result.ok && result.aspectMatches).toBe(true);
  });
});

describe('the eye line', () => {
  it('measures upward from the bottom edge', () => {
    const result = measureFraming(
      boothPhoto({ sourceWidthPx: 350, sourceHeightPx: 450, chin: { x: 175, y: 400 } }),
      euSpec(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.measurements.eyeLineFromBottomMm).toBeCloseTo(19, 1);
  });

  it('is absent when the specification states no rule', () => {
    const result = measureFraming(boothPhoto(), usSpec());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.measurements.eyeLine).toBeUndefined();
  });
});

describe('cases it cannot measure', () => {
  it('declines without a crown', () => {
    expect(measureFraming(boothPhoto({ crownY: undefined }), usSpec())).toEqual({
      ok: false,
      reason: 'crown-unmeasured',
    });
  });

  it('declines when the crown is above the top edge', () => {
    expect(measureFraming(boothPhoto({ crownY: -5 }), usSpec())).toEqual({
      ok: false,
      reason: 'head-not-in-frame',
    });
  });

  it('declines when the chin is below the bottom edge', () => {
    expect(measureFraming(boothPhoto({ chin: { x: 300, y: 700 } }), usSpec())).toEqual({
      ok: false,
      reason: 'head-not-in-frame',
    });
  });

  it('declines when the chin sits above the crown', () => {
    expect(
      measureFraming(boothPhoto({ crownY: 400, chin: { x: 300, y: 300 } }), usSpec()),
    ).toEqual({ ok: false, reason: 'head-not-in-frame' });
  });
});

describe('roll', () => {
  it('reports level eyes as zero without a negative zero', () => {
    const result = measureFraming(boothPhoto(), usSpec());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.is(result.measurements.rollDegrees, -0)).toBe(false);
  });

  it('reports a tilt', () => {
    const result = measureFraming(
      boothPhoto({ leftEye: { x: 260, y: 250 }, rightEye: { x: 340, y: 270 } }),
      usSpec(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.measurements.rollDegrees).toBeCloseTo(14.04, 1);
  });
});
