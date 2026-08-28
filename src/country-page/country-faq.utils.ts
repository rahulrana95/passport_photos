import { COUNTRY_NAMES } from '@/constants/country.constants';
import { DOCUMENT_TYPE_LABELS } from '@/constants/document-type.constants';
import { formatMeasurement } from '@/measurement/format-measurement.utils';
import { interpolate } from '@/content/interpolate.utils';
import { MONTHS_PER_YEAR } from './country-page.constants';
import type { ContentTree } from '@/content/content.types';
import type { FaqEntry } from '@/components/content/FaqList/FaqList.types';
import type { ResolvedPhotoSpec } from '@/photo-spec/photo-spec.types';

/**
 * The questions people actually type, answered from this country's own numbers.
 *
 * THE ANSWERS ARE BUILT FROM THE SPECIFICATION, NOT WRITTEN PER COUNTRY. Forty
 * pages asking "what size is a passport photo?" and answering "check the
 * requirements above" is forty pages of the same page, which is how a site of
 * this shape gets treated as thin content and stops ranking at all. Every
 * answer here contains numbers that differ between countries — the size, the
 * head height, the background, the glasses rule — so the pages differ in
 * substance rather than in the country name at the top.
 *
 * Every answer is also visible on the page. FAQ structured data that promises
 * text the reader cannot find is a manual action waiting to happen, which is
 * why this array feeds both the list and the JSON-LD.
 */
export const buildFaqEntries = (
  spec: ResolvedPhotoSpec,
  content: ContentTree,
  locale: string,
): readonly FaqEntry[] => {
  const { faq, values } = content.country;
  const names = {
    country: COUNTRY_NAMES[spec.country],
    document: DOCUMENT_TYPE_LABELS[spec.document].toLowerCase(),
  };

  const ask = (template: string): string => interpolate(template, names);

  return [
    { question: ask(faq.sizeQuestion), answer: sizeAnswer(spec, content, locale, names) },
    { question: ask(faq.headQuestion), answer: headAnswer(spec, content, locale, names) },
    {
      question: ask(faq.backgroundQuestion),
      answer: interpolate(faq.backgroundAnswer, {
        background: values.backgroundColours[spec.background.colour],
      }),
    },
    { question: ask(faq.glassesQuestion), answer: values.glasses[spec.glasses] },
    { question: ask(faq.smileQuestion), answer: values.expression[spec.expression] },
    ...ageEntry(spec, faq, locale, ask),
    { question: faq.costQuestion, answer: faq.costAnswer },
  ];
};

interface Names {
  readonly country: string;
  readonly document: string;
}

const sizeAnswer = (
  spec: ResolvedPhotoSpec,
  content: ContentTree,
  locale: string,
  names: Names,
): string => {
  const { values, faq } = content.country;
  const print = interpolate(values.printSize, {
    width: formatMeasurement(spec.print.widthMm, 'millimeter', locale),
    height: formatMeasurement(spec.print.heightMm, 'millimeter', locale),
  });

  // Where no pixel requirement was published there is no second sentence to
  // write. Saying "and digitally, nothing specified" answers a question the
  // authority never posed.
  const { digital } = spec;
  if (digital === undefined) return interpolate(faq.sizePrintOnlyAnswer, { ...names, print });

  const pixels =
    digital.maxEdgePx === undefined
      ? interpolate(values.pixelMinimum, { min: String(digital.minEdgePx) })
      : interpolate(values.pixelRange, {
          min: String(digital.minEdgePx),
          max: String(digital.maxEdgePx),
        });

  return interpolate(faq.sizeAnswer, { ...names, print, digital: pixels.toLowerCase() });
};

/**
 * Both forms of the head height, and how the top of the head is measured.
 *
 * The crown definition is in the answer rather than a footnote because it is
 * the difference people lose photographs to: the US measures to the top of the
 * hair and the UK to the skull beneath it, which on a tall hairstyle is most of
 * the tolerance.
 */
const headAnswer = (
  spec: ResolvedPhotoSpec,
  content: ContentTree,
  locale: string,
  names: Names,
): string => {
  const { values, faq } = content.country;
  const head = spec.headHeight;

  return interpolate(faq.headAnswer, {
    ...names,
    head: interpolate(values.range, {
      min: formatMeasurement(head.minMm, 'millimeter', locale),
      max: formatMeasurement(head.maxMm, 'millimeter', locale),
    }),
    crown: values.crown[spec.crownDefinition],
    ratio: interpolate(values.range, {
      min: formatMeasurement(head.minRatio, 'percent', locale),
      max: formatMeasurement(head.maxRatio, 'percent', locale),
    }),
  });
};

/**
 * Only where the authority published a maximum age.
 *
 * A question-and-answer pair saying "no maximum is published" is worse than no
 * pair at all: it fills the page with a non-answer and it puts the words in
 * search results under a question somebody asked hoping for a number.
 */
const ageEntry = (
  spec: ResolvedPhotoSpec,
  faq: ContentTree['country']['faq'],
  locale: string,
  ask: (template: string) => string,
): readonly FaqEntry[] => {
  const months = spec.maxAgeMonths;
  if (months === undefined) return [];

  return [
    {
      question: ask(faq.ageQuestion),
      answer: interpolate(faq.ageAnswer, { months: ageWords(months, locale) }),
    },
  ];
};

const ageWords = (months: number, locale: string): string => {
  const asYears = months / MONTHS_PER_YEAR;

  return Number.isInteger(asYears)
    ? formatMeasurement(asYears, 'year', locale)
    : formatMeasurement(months, 'month', locale);
};
