import { formatMeasurement } from '@/measurement/format-measurement.utils';
import { interpolate } from '@/content/interpolate.utils';
import type { RuleFormatContent } from '@/content/content.types';
import type { RuleMeasurementUnit } from './rule-message.constants';
import type { Band } from '@/measurement/band.types';

/**
 * Rendering a measured number for a reader.
 *
 * Everything except pixels goes through Intl, which puts the unit where the
 * reader's language puts it and uses the decimal separator their country uses.
 * Concatenating "mm" onto a number is wrong in most of Europe before you even
 * reach the unit.
 */

/** Pixels are not an internationalised unit, so their symbol is copy. */
const isIntlUnit = (unit: RuleMeasurementUnit): unit is Exclude<RuleMeasurementUnit, 'pixel'> =>
  unit !== 'pixel';

export const formatAmount = (
  value: number,
  unit: RuleMeasurementUnit,
  locale: string,
  formats: RuleFormatContent,
): string =>
  isIntlUnit(unit)
    ? formatMeasurement(value, unit, locale)
    : interpolate(formats.pixels, {
        value: new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value),
      });

/**
 * Writes a band as the requirement it is.
 *
 * An open-topped band — at least ninety pixels between the eyes, and no
 * ceiling — is written as a minimum rather than as a range ending in infinity.
 */
export const formatBand = (
  band: Band,
  unit: RuleMeasurementUnit,
  locale: string,
  formats: RuleFormatContent,
): string =>
  Number.isFinite(band.max)
    ? interpolate(formats.range, {
        min: formatAmount(band.min, unit, locale, formats),
        max: formatAmount(band.max, unit, locale, formats),
      })
    : interpolate(formats.minimum, { min: formatAmount(band.min, unit, locale, formats) });
