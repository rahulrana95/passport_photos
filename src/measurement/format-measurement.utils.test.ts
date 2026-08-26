import { describe, expect, it } from 'vitest';
import { DEFAULT_PRINT_DPI, MM_PER_INCH } from '@/constants/measurement.constants';
import {
  formatMeasurement,
  inchesToMillimetres,
  millimetresToInches,
  millimetresToPixels,
  pixelsToMillimetres,
  roundMeasurement,
} from './format-measurement.utils';

describe('roundMeasurement', () => {
  it('rounds to the shared precision by default', () => {
    expect(roundMeasurement(34.5678)).toBe(34.57);
  });

  it('accepts an explicit precision', () => {
    expect(roundMeasurement(34.5678, 1)).toBe(34.6);
  });

  it('leaves an already-round value untouched', () => {
    expect(roundMeasurement(35)).toBe(35);
  });

  it('handles negative values symmetrically', () => {
    expect(roundMeasurement(-34.5678)).toBe(-34.57);
  });
});

describe('unit conversion', () => {
  it('round-trips millimetres through inches without drift', () => {
    expect(roundMeasurement(inchesToMillimetres(millimetresToInches(45)))).toBe(45);
  });

  it('converts the US 2-inch specification to millimetres', () => {
    expect(roundMeasurement(inchesToMillimetres(2))).toBe(50.8);
  });

  it('converts millimetres to pixels at a given resolution', () => {
    expect(millimetresToPixels(MM_PER_INCH, DEFAULT_PRINT_DPI)).toBe(DEFAULT_PRINT_DPI);
  });

  it('converts pixels back to millimetres', () => {
    expect(roundMeasurement(pixelsToMillimetres(DEFAULT_PRINT_DPI, DEFAULT_PRINT_DPI))).toBe(
      MM_PER_INCH,
    );
  });

  it('returns whole pixels, since a fractional pixel cannot be rendered', () => {
    expect(Number.isInteger(millimetresToPixels(35, DEFAULT_PRINT_DPI))).toBe(true);
  });
});

describe('formatMeasurement', () => {
  it('formats millimetres for a British reader', () => {
    expect(formatMeasurement(34.5, 'millimeter', 'en-GB')).toBe('34.5 mm');
  });

  it('uses the comma decimal separator for a German reader', () => {
    // The reason units are never concatenated by hand: `${value}mm` would emit
    // a full stop here and read as wrong to most of Europe.
    expect(formatMeasurement(34.5, 'millimeter', 'de-DE')).toContain(',');
  });

  it('formats inches', () => {
    expect(formatMeasurement(2, 'inch', 'en-US')).toBe('2 in');
  });

  it('scales a ratio into a percentage', () => {
    expect(formatMeasurement(0.62, 'percent', 'en-GB')).toBe('62%');
  });
});
