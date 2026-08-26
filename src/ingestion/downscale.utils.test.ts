import { describe, expect, it } from 'vitest';
import { ANALYSIS_WORKING_EDGE_PX } from '@/constants/limits.constants';
import { fitWithin, planWorkingSize, toSourceCoordinate } from './downscale.utils';

describe('fitWithin', () => {
  it('leaves an image already inside the box untouched', () => {
    expect(fitWithin({ widthPx: 800, heightPx: 600 }, 1600)).toEqual({
      widthPx: 800,
      heightPx: 600,
    });
  });

  it('never enlarges, even by a pixel', () => {
    // Enlarging invents detail, and a landmark measured on invented detail is a
    // measurement of nothing.
    const tiny = fitWithin({ widthPx: 100, heightPx: 50 }, 1600);

    expect(tiny).toEqual({ widthPx: 100, heightPx: 50 });
  });

  it('fits the long edge exactly', () => {
    expect(fitWithin({ widthPx: 4032, heightPx: 3024 }, 1600).widthPx).toBe(1600);
  });

  it('holds the aspect ratio to within a pixel across a plausible range', () => {
    const cases = [
      { widthPx: 4032, heightPx: 3024 },
      { widthPx: 3024, heightPx: 4032 },
      { widthPx: 8000, heightPx: 6000 },
      { widthPx: 1920, heightPx: 1080 },
      { widthPx: 5000, heightPx: 5000 },
      { widthPx: 6000, heightPx: 1000 },
    ];

    for (const source of cases) {
      const fitted = fitWithin(source, 1600);
      const sourceRatio = source.widthPx / source.heightPx;
      const fittedRatio = fitted.widthPx / fitted.heightPx;

      expect(Math.abs(sourceRatio - fittedRatio), `${source.widthPx}x${source.heightPx}`).toBeLessThan(
        0.01,
      );
    }
  });

  it('never rounds an axis away to nothing', () => {
    // A 6000x2 panorama would floor its short axis to zero, and a zero-height
    // bitmap is a blank canvas, not an error.
    expect(fitWithin({ widthPx: 6000, heightPx: 2 }, 1600).heightPx).toBeGreaterThanOrEqual(1);
  });

  it('handles a square image on the boundary', () => {
    expect(fitWithin({ widthPx: 1600, heightPx: 1600 }, 1600)).toEqual({
      widthPx: 1600,
      heightPx: 1600,
    });
  });
});

describe('planWorkingSize', () => {
  it('reports no downscale and a unit scale for a small image', () => {
    const plan = planWorkingSize({ widthPx: 1200, heightPx: 900 });

    expect(plan.isDownscaled).toBe(false);
    expect(plan.scaleToSource).toBe(1);
  });

  it('maps a working coordinate back onto the source exactly on the long axis', () => {
    // The crop is computed against the full-resolution original, so a landmark
    // that maps back wrongly crops the wrong part of the photo.
    const source = { widthPx: 4032, heightPx: 3024 };
    const plan = planWorkingSize(source);

    expect(toSourceCoordinate(plan.widthPx, plan)).toBeCloseTo(source.widthPx, 6);
  });

  it('maps the short axis back to within a pixel', () => {
    const source = { widthPx: 4032, heightPx: 3024 };
    const plan = planWorkingSize(source);

    expect(Math.abs(toSourceCoordinate(plan.heightPx, plan) - source.heightPx)).toBeLessThan(1);
  });

  it('defaults to the configured analysis edge', () => {
    const plan = planWorkingSize({ widthPx: 9000, heightPx: 9000 });

    expect(Math.max(plan.widthPx, plan.heightPx)).toBe(ANALYSIS_WORKING_EDGE_PX);
  });

  it('leaves coordinates unchanged when nothing was downscaled', () => {
    const plan = planWorkingSize({ widthPx: 500, heightPx: 400 });

    expect(toSourceCoordinate(123.5, plan)).toBe(123.5);
  });

  it('round-trips within a pixel for every plausible phone and camera size', () => {
    const sources = [
      { widthPx: 4032, heightPx: 3024 },
      { widthPx: 3024, heightPx: 4032 },
      { widthPx: 8064, heightPx: 6048 },
      { widthPx: 2048, heightPx: 1536 },
      { widthPx: 1601, heightPx: 1200 },
      { widthPx: 12000, heightPx: 9000 },
    ];

    for (const source of sources) {
      const plan = planWorkingSize(source);
      const label = `${source.widthPx}x${source.heightPx}`;

      expect(Math.abs(toSourceCoordinate(plan.widthPx, plan) - source.widthPx), label).toBeLessThan(1);
      expect(
        Math.abs(toSourceCoordinate(plan.heightPx, plan) - source.heightPx),
        label,
      ).toBeLessThan(1);
    }
  });
});
