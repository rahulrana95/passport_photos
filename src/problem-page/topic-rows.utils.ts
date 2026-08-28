import { COUNTRY_NAMES } from '@/constants/country.constants';
import { DOCUMENT_TYPE_LABELS } from '@/constants/document-type.constants';
import { formatMeasurement } from '@/measurement/format-measurement.utils';
import { interpolate } from '@/content/interpolate.utils';
import { listServableSpecs } from '@/photo-spec/photo-spec.registry';
import { resolveSpec } from '@/photo-spec/photo-spec.utils';
import type { ContentTree } from '@/content/content.types';
import type { PhotoSpec } from '@/photo-spec/photo-spec.schemas';
import type { RequirementRow } from '@/components/content/RequirementsTable/RequirementsTable.types';

/**
 * One requirement, across every country — the mirror of a country page.
 *
 * A country page answers "what does the United States want?"; these answer
 * "what does everybody want about head size?" Same registry, different axis,
 * and neither is a duplicate of the other: this table's rows are countries and
 * its columns are one requirement, which is exactly the comparison a reader
 * who has been refused in one country and is applying in another needs.
 *
 * The row label is the country and document rather than the requirement, so
 * the same RequirementsTable component renders both kinds of page.
 */
const rowLabel = (spec: PhotoSpec): string =>
  `${COUNTRY_NAMES[spec.country]} ${DOCUMENT_TYPE_LABELS[spec.document].toLowerCase()}`;

/**
 * Head height per country, in both units, with how the top is measured.
 *
 * The crown definition is in the note rather than a footnote: it is the reason
 * the same photograph passes in one country and fails in another, and a table
 * of bare numbers would hide exactly the thing this page exists to explain.
 */
export const headSizeRows = (
  content: ContentTree,
  locale: string,
  specs: readonly PhotoSpec[] = listServableSpecs(),
  now: Date = new Date(),
): readonly RequirementRow[] =>
  specs.map((spec) => {
    const resolved = resolveSpec(spec, now);
    const { values } = content.country;

    return {
      label: rowLabel(spec),
      value: interpolate(values.range, {
        min: formatMeasurement(resolved.headHeight.minMm, 'millimeter', locale),
        max: formatMeasurement(resolved.headHeight.maxMm, 'millimeter', locale),
      }),
      note: `${interpolate(values.range, {
        min: formatMeasurement(resolved.headHeight.minRatio, 'percent', locale),
        max: formatMeasurement(resolved.headHeight.maxRatio, 'percent', locale),
      })} — ${values.crown[resolved.crownDefinition]}`,
    };
  });

/**
 * Background colour per country.
 *
 * The colour is the easy half and the page says so; what the table carries is
 * that the answer is not the same everywhere, which is the thing people assume
 * it is.
 */
export const backgroundRows = (
  content: ContentTree,
  specs: readonly PhotoSpec[] = listServableSpecs(),
): readonly RequirementRow[] =>
  specs.map((spec) => ({
    label: rowLabel(spec),
    value: content.country.values.backgroundColours[spec.background.colour],
  }));
