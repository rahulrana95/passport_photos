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

  it('keeps the face luminance window ordered and inside the 8-bit range', () => {
    expect(analysis.MIN_FACE_LUMINANCE).toBeLessThan(analysis.MAX_FACE_LUMINANCE);
    expect(analysis.MIN_FACE_LUMINANCE).toBeGreaterThanOrEqual(0);
    expect(analysis.MAX_FACE_LUMINANCE).toBeLessThanOrEqual(255);
  });

  it('requires more confidence for a crown estimate than for a face detection', () => {
    // Crown detection is the least reliable step in the pipeline and drives the
    // most common rejection reason, so it is held to a higher bar.
    expect(analysis.MIN_CROWN_CONFIDENCE_RATIO).toBeGreaterThan(
      analysis.MIN_FACE_DETECTION_CONFIDENCE_RATIO,
    );
  });
});
