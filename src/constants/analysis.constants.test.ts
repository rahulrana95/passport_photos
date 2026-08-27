import { describe, expect, it } from 'vitest';
import * as analysis from './analysis.constants';

describe('analysis thresholds', () => {
  const ratios = Object.entries(analysis).filter(([name]) => name.endsWith('_RATIO'));

  it('declares at least one ratio threshold', () => {
    expect(ratios.length).toBeGreaterThan(0);
  });

  it.each(ratios)('%s lies within 0 and 1, as a ratio must', (_name, value) => {
    expect(value).toBeGreaterThan(0);
    expect(value).toBeLessThanOrEqual(1);
  });

  it('declares no threshold on absolute face luminance', () => {
    // Not an omission. A band on mean face luminance is a band on skin tone,
    // and the two constants that used to sit here would have failed correctly
    // exposed photographs of dark-skinned people. Exposure is judged on
    // clipping and tonal range instead; asserting their absence keeps them
    // from drifting back in as a convenience.
    const luminanceThresholds = Object.keys(analysis).filter((name) =>
      name.includes('FACE_LUMINANCE'),
    );

    expect(luminanceThresholds).toEqual([]);
  });

  it('requires more confidence for a crown estimate than for a face detection', () => {
    // Crown detection is the least reliable step in the pipeline and drives the
    // most common rejection reason, so it is held to a higher bar.
    expect(analysis.MIN_CROWN_CONFIDENCE_RATIO).toBeGreaterThan(
      analysis.MIN_FACE_DETECTION_CONFIDENCE_RATIO,
    );
  });
});
