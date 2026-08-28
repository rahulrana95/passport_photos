import { DEFAULT_LOCALE } from '@/constants/site.constants';
import { interpolate } from '@/content/interpolate.utils';
import { formatAmount, formatBand } from './format-amount.utils';
import type { RuleContent } from '@/content/content.types';
import type { ResolvedPhotoSpec } from '@/photo-spec/photo-spec.types';
import type { RuleResult } from './rule.types';

/**
 * Turning a rule result into the four strings a report row shows.
 *
 * The engine never touches copy and the copy never does arithmetic. This is
 * the one place they meet, which is what makes a second language a content
 * file rather than a second engine — and what makes the copy invariants
 * (nothing promises acceptance, every failure carries an action) enforceable
 * over the whole product from a single test.
 */
export interface ResolvedRuleMessage {
  readonly label: string;
  readonly message: string;
  /** What we measured, formatted with its unit. */
  readonly measurement: string | undefined;
  /** What the specification requires, formatted the same way. */
  readonly requirement: string | undefined;
  /** The physical action, present whenever the engine had one to give. */
  readonly fixInstruction: string | undefined;
}

/**
 * How long the photograph may be, spelled out.
 *
 * Through Intl rather than "{n} months", because the plural of a month is not
 * a suffix in most languages and the number does not always come first.
 */
const formatMonths = (months: number, locale: string): string =>
  new Intl.NumberFormat(locale, { style: 'unit', unit: 'month', unitDisplay: 'long' }).format(
    months,
  );

export const resolveRuleMessage = (
  result: RuleResult,
  spec: ResolvedPhotoSpec,
  content: RuleContent,
  locale: string = DEFAULT_LOCALE,
): ResolvedRuleMessage => {
  const unit = result.measurement?.unit;

  return {
    label: content.labels[result.ruleId],
    message: interpolate(
      content.messages[result.messageId],
      // Only where the authority published one. The message chosen for a spec
      // without a maximum age has no {months} in it to fill.
      spec.maxAgeMonths === undefined
        ? {}
        : { months: formatMonths(spec.maxAgeMonths, locale) },
    ),
    measurement:
      result.measurement === undefined
        ? undefined
        : formatAmount(result.measurement.value, result.measurement.unit, locale, content.formats),
    // A band is only meaningful in the unit its measurement was taken in, so a
    // requirement without a measurement beside it is not rendered at all
    // rather than guessed at.
    requirement:
      result.band === undefined || unit === undefined
        ? undefined
        : formatBand(result.band, unit, locale, content.formats),
    fixInstruction:
      result.fix === undefined
        ? undefined
        : interpolate(content.fixes[result.fix.kind], {
            amount:
              result.fix.amount === undefined
                ? ''
                : formatAmount(
                    result.fix.amount.value,
                    result.fix.amount.unit,
                    locale,
                    content.formats,
                  ),
          }),
  };
};
