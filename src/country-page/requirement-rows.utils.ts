import { formatMeasurement } from '@/measurement/format-measurement.utils';
import { interpolate } from '@/content/interpolate.utils';
import { MONTHS_PER_YEAR } from './country-page.constants';
import { formatFileSize } from './file-size.utils';
import type { ContentTree } from '@/content/content.types';
import type { PrintSize } from '@/photo-spec/photo-spec.schemas';
import type { RequirementRow } from '@/components/content/RequirementsTable/RequirementsTable.types';
import type { ResolvedPhotoSpec } from '@/photo-spec/photo-spec.types';

/**
 * Turns a specification into the table a country page ranks for.
 *
 * Pure, and the reason it is not inline in the page: this is the content, and
 * content that only exists inside a Server Component can only be tested by
 * rendering one. Every value here is a claim about a government requirement.
 *
 * Nothing is invented. A spec that states no eye line gets no eye-line row
 * rather than a row saying "not specified" — a table that lists a requirement
 * the authority never published is a table a reader will act on.
 */
export const buildRequirementRows = (
  spec: ResolvedPhotoSpec,
  content: ContentTree,
  locale: string,
): readonly RequirementRow[] => {
  const { labels, values } = content.country;

  return [
    {
      label: labels.printSize,
      value: printSize(spec.print, values.printSize, locale),
      note: printNote(spec, values, locale),
    },
    { label: labels.digitalSize, value: digitalSize(spec, values) },
    ...fileRow(spec, labels, values, locale),
    {
      label: labels.headHeight,
      value: headHeight(spec, values, locale),
      note: values.crown[spec.crownDefinition],
    },
    ...eyeLineRow(spec, labels, values, locale),
    { label: labels.background, value: values.backgroundColours[spec.background.colour] },
    { label: labels.glasses, value: values.glasses[spec.glasses] },
    { label: labels.headCovering, value: values.headCovering[spec.headCovering] },
    { label: labels.expression, value: values.expression[spec.expression] },
    { label: labels.photoAge, value: photoAge(spec.maxAgeMonths, values.photoAge, locale) },
    { label: labels.aiEditing, value: values.aiEditing[spec.aiEditingPolicy] },
  ];
};

const printSize = (size: PrintSize, template: string, locale: string): string =>
  interpolate(template, {
    width: formatMeasurement(size.widthMm, 'millimeter', locale),
    height: formatMeasurement(size.heightMm, 'millimeter', locale),
  });

/**
 * The print resolution, and any second size the authority also accepts.
 *
 * Both belong under the size rather than beside it: a reader scanning for "what
 * size" wants one answer, and the alternatives are a footnote to it. Several
 * authorities publish a legacy format alongside the current one, and a page
 * that showed only the first would send somebody to reprint a photo that was
 * already acceptable.
 */
const printNote = (
  spec: ResolvedPhotoSpec,
  values: ContentTree['country']['values'],
  locale: string,
): string => {
  const resolution = interpolate(values.printResolution, { dpi: String(spec.print.dpi) });
  const alternatives = spec.alternativePrintSizes ?? [];

  if (alternatives.length === 0) return resolution;

  const sizes = alternatives
    .map((size) => printSize(size, values.printSize, locale))
    .join(', ');

  return `${resolution}. ${interpolate(values.alsoAccepted, { sizes })}`;
};

const digitalSize = (
  spec: ResolvedPhotoSpec,
  values: ContentTree['country']['values'],
): string => {
  const min = String(spec.digital.minEdgePx);

  return spec.digital.maxEdgePx === undefined
    ? interpolate(values.pixelMinimum, { min })
    : interpolate(values.pixelRange, { min, max: String(spec.digital.maxEdgePx) });
};

/**
 * Only when the authority states a ceiling.
 *
 * Where one exists it is often the single most common reason an upload is
 * rejected — the DS-160's 240KB, for instance, which no phone photograph meets
 * untouched — so it earns a row of its own rather than a clause in another.
 */
const fileRow = (
  spec: ResolvedPhotoSpec,
  labels: ContentTree['country']['labels'],
  values: ContentTree['country']['values'],
  locale: string,
): readonly RequirementRow[] => {
  const format = interpolate(values.fileFormat, { format: spec.digital.format.toUpperCase() });

  if (spec.digital.maxBytes === undefined) {
    return [{ label: labels.fileSize, value: format }];
  }

  const size = formatFileSize(spec.digital.maxBytes, locale);

  return [
    {
      label: labels.fileSize,
      value: `${format}. ${interpolate(values.maxFileSize, { size })}`,
    },
  ];
};

/**
 * In the unit the authority published, with the other in the note.
 *
 * Authorities disagree about which is authoritative — the US publishes a
 * proportion, the UK millimetres — and rewriting one into the other loses the
 * form a reader will be comparing against the official page in another tab.
 */
const headHeight = (
  spec: ResolvedPhotoSpec,
  values: ContentTree['country']['values'],
  locale: string,
): string => {
  const { headHeight: head } = spec;

  return head.authoredUnit === 'mm'
    ? interpolate(values.range, {
        min: formatMeasurement(head.minMm, 'millimeter', locale),
        max: formatMeasurement(head.maxMm, 'millimeter', locale),
      })
    : interpolate(values.range, {
        min: formatMeasurement(head.minRatio, 'percent', locale),
        max: formatMeasurement(head.maxRatio, 'percent', locale),
      });
};

const eyeLineRow = (
  spec: ResolvedPhotoSpec,
  labels: ContentTree['country']['labels'],
  values: ContentTree['country']['values'],
  locale: string,
): readonly RequirementRow[] => {
  const { eyeLine } = spec;
  if (eyeLine === undefined) return [];

  return [
    {
      label: labels.eyeLine,
      value: interpolate(values.range, {
        min: formatMeasurement(eyeLine.minFromBottomMm, 'millimeter', locale),
        max: formatMeasurement(eyeLine.maxFromBottomMm, 'millimeter', locale),
      }),
      note: values.eyeLineNote,
    },
  ];
};

/**
 * Written the way the authority's own page writes it.
 *
 * Six months stays six months; twelve becomes a year. "Within the last 24
 * months" is technically the same sentence as "within the last two years" and
 * nobody reads it the same way.
 */
export const photoAge = (months: number, template: string, locale: string): string => {
  const asYears = months / MONTHS_PER_YEAR;
  const unit = Number.isInteger(asYears) ? 'year' : 'month';

  return interpolate(template, {
    months: formatMeasurement(unit === 'year' ? asYears : months, unit, locale),
  });
};
