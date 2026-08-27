import { evaluateRules } from '@/rules/evaluate-rules';
import { NO_EVIDENCE_INPUT } from '@/rules/no-evidence.constants';
import { getRule } from '@/rules/rule-registry';
import type { ResolvedPhotoSpec } from '@/photo-spec/photo-spec.types';

export interface ReportShape {
  /**
   * One entry per row, saying whether that row will carry a measurement line.
   *
   * A count would not be enough: a row that reports a number is one line
   * taller than one that does not, and eight of the twenty-four rules report
   * one. Reserving two lines for every row makes the page shrink by a fifth
   * when the answer lands; reserving one makes it grow.
   */
  readonly ruleRows: readonly boolean[];
  readonly manualRows: readonly boolean[];
}

/**
 * How many rows a specification's report will have, before it has one.
 *
 * DERIVED, NOT GUESSED, and that is what makes the loading state cost nothing
 * in layout shift. A skeleton of "about six rows" is a skeleton that jumps
 * when the seventh arrives; this asks the engine the same question it will be
 * asked for real, with the evidence bundle that says nothing ran, and gets
 * back exactly the rows this specification states. A rule the spec is silent
 * about — an eye line, in most countries — is absent from both.
 *
 * Cheap enough to call during a render: the rules are pure functions over a
 * bundle of undefineds, and every one of them returns on its first branch.
 */
export const reportShape = (spec: ResolvedPhotoSpec): ReportShape => {
  const report = evaluateRules(NO_EVIDENCE_INPUT, spec);
  return {
    ruleRows: report.results.map((result) => getRule(result.ruleId).measures),
    manualRows: report.manualChecklist.map((result) => getRule(result.ruleId).measures),
  };
};
