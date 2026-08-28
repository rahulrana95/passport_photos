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

/**
 * Every unit this product formats, and only units Intl sanctions.
 *
 * Wider than the geometry it started as, because a requirements table states a
 * file-size ceiling and how recent a photograph must be, and those are
 * measurements a reader compares against a number too. Hand-joining them —
 * `${kb}KB`, `${months} months` — is the same mistake as `${mm}mm`: wrong
 * separator, wrong spacing, and wrong word the moment there is one of them.
 */
export type MeasurementUnit =
  | 'millimeter'
  | 'inch'
  | 'percent'
  | 'degree'
  | 'kilobyte'
  | 'megabyte'
  | 'month'
  | 'year';

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

/**
 * Spelt out for durations, abbreviated for everything else.
 *
 * 'short' turns a month into "mths", which nobody writes and which reads as a
 * typo in a sentence about how recent a photograph must be. A millimetre is
 * "mm" in prose and in a table alike, so it stays short.
 */
const SPELT_OUT_UNITS: readonly MeasurementUnit[] = ['month', 'year'];

/**
 * A number with no unit on it.
 *
 * For the first half of a pair — "2 × 2 in", "35 × 45 mm" — where repeating the
 * unit on both sides is how a size gets written by a machine and never by a
 * person. Still Intl rather than String(): the decimal separator is a comma in
 * most of Europe.
 */
export const formatNumber = (value: number, locale: string): string =>
  new Intl.NumberFormat(locale, {
    maximumFractionDigits: MEASUREMENT_PRECISION_DIGITS,
  }).format(value);

export const formatMeasurement = (
  value: number,
  unit: MeasurementUnit,
  locale: string,
): string =>
  new Intl.NumberFormat(locale, {
    style: 'unit',
    unit,
    unitDisplay: SPELT_OUT_UNITS.includes(unit) ? 'long' : 'short',
    maximumFractionDigits:
      unit === 'percent' ? PERCENT_PRECISION_DIGITS : MEASUREMENT_PRECISION_DIGITS,
  }).format(unit === 'percent' ? value * PERCENT_SCALE : value);
