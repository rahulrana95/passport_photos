import { formatFileSize } from '@/country-page/file-size.utils';
import {
  formatMeasurement,
  formatNumber,
  millimetresToInches,
} from '@/measurement/format-measurement.utils';
import { interpolate } from '@/content/interpolate.utils';
import type { ContentTree } from '@/content/content.types';
import type { SizeFamily } from './size-family.types';

/**
 * What this size is called, in the unit the reader was given it in.
 *
 * Derived rather than written per family: the numbers are already in the
 * family, and a hand-written "2×2 inch" beside a stored 50.8mm is two facts
 * that can drift apart. Intl also puts the separator and the unit where the
 * reader's locale expects them, which hand-joining never does.
 */
export const familyLabel = (family: SizeFamily, content: ContentTree, locale: string): string => {
  const { values } = content.dimension;

  if (family.kind === 'print') {
    const [width, height] =
      family.unit === 'inch'
        ? [millimetresToInches(family.widthMm), millimetresToInches(family.heightMm)]
        : [family.widthMm, family.heightMm];

    // The unit goes on the second number only. "2 in × 2 in" is how a machine
    // writes a size; "2 × 2 in" is how everybody else does.
    return interpolate(values.printSize, {
      width: formatNumber(width, locale),
      height: formatMeasurement(height, family.unit === 'inch' ? 'inch' : 'millimeter', locale),
    });
  }

  if (family.kind === 'pixels') {
    return interpolate(values.pixelSize, { edge: String(family.edgePx) });
  }

  return formatFileSize(family.maxBytes, locale);
};

/**
 * The sentence the page's heading is built from, per kind.
 *
 * Three different questions wear these three numbers. "What is a 2x2 photo?"
 * is about a printed square; "600x600" is about an upload that keeps being
 * rejected; "resize to 240kb" is an instruction somebody has been given and
 * cannot follow. One heading template for all three would answer none of them.
 */
export const familyHeading = (
  family: SizeFamily,
  content: ContentTree,
  locale: string,
): string =>
  interpolate(content.dimension.headings[family.kind], {
    size: familyLabel(family, content, locale),
  });
