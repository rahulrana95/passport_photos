import {
  DECIMAL_RADIX,
  MEASUREMENT_PRECISION_DIGITS,
  PERCENT_PRECISION_DIGITS,
  MM_PER_INCH,
  PERCENT_SCALE,
} from '@/constants/measurement.constants';

/**
 * Measurement formatting.
 *
 * Units are never concatenated onto a number by hand: `${value}mm` produces the
 * wrong decimal separator for most of Europe, and the wrong unit spacing almost
 * everywhere. Intl.NumberFormat handles both.
 */

export type MeasurementUnit = 'millimeter' | 'inch' | 'percent' | 'degree';

export const roundMeasurement = (
  value: number,
  digits: number = MEASUREMENT_PRECISION_DIGITS,
): number => {
  const factor = DECIMAL_RADIX ** digits;
  return Math.round(value * factor) / factor;
};

export const millimetresToInches = (millimetres: number): number => millimetres / MM_PER_INCH;

export const inchesToMillimetres = (inches: number): number => inches * MM_PER_INCH;

export const millimetresToPixels = (millimetres: number, dpi: number): number =>
  Math.round((millimetres / MM_PER_INCH) * dpi);

export const pixelsToMillimetres = (pixels: number, dpi: number): number =>
  (pixels / dpi) * MM_PER_INCH;

export const formatMeasurement = (
  value: number,
  unit: MeasurementUnit,
  locale: string,
): string =>
  new Intl.NumberFormat(locale, {
    style: 'unit',
    unit,
    unitDisplay: 'short',
    maximumFractionDigits:
      unit === 'percent' ? PERCENT_PRECISION_DIGITS : MEASUREMENT_PRECISION_DIGITS,
  }).format(unit === 'percent' ? value * PERCENT_SCALE : value);
