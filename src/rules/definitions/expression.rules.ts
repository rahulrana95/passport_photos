import {
  EYE_CLOSED_BLENDSHAPE_RATIO,
  MOUTH_OPEN_BLENDSHAPE_RATIO,
  SMILE_BLENDSHAPE_RATIO,
} from '@/constants/analysis.constants';
import {
  BLINK_BLENDSHAPES,
  MOUTH_OPEN_BLENDSHAPES,
  SMILE_BLENDSHAPES,
} from '../rule-threshold.constants';
import { fixAction } from '../fix-action.utils';
import { passed, ruleOutcome, unmeasured } from '../rule-outcome.utils';
import type { RuleDefinition, RuleOutcome } from '../rule.types';

/**
 * The rules read from the expression model's blendshape scores.
 *
 * Scores, not classifications: the model reports how open a jaw is on a scale,
 * and where the line falls between "closed" and "open" is our judgement, kept
 * in analysis.constants where it can be tuned in one diff.
 */

/**
 * The highest score among several related shapes.
 *
 * Highest rather than mean, because these come in left and right pairs and a
 * person can have one eye closed. Averaging a closed eye with an open one
 * produces a number that reads as a blink in progress and passes.
 */
const strongest = (
  blendshapes: Readonly<Record<string, number>>,
  names: readonly string[],
): number => Math.max(0, ...names.map((name) => blendshapes[name] ?? 0));

export const eyesOpenRule: RuleDefinition = {
  id: 'eyes-open',
  requirements: [{ standard: 'iso-19794-5', id: 'eyes-closed' }],
  severity: 'blocking',
  evidence: 'landmarks',
  fixGroup: undefined,
  measures: false,
  evaluate: (input): RuleOutcome => {
    if (input.blendshapes === undefined) return unmeasured();

    return strongest(input.blendshapes, BLINK_BLENDSHAPES) > EYE_CLOSED_BLENDSHAPE_RATIO
      ? ruleOutcome('fail', 'eyes-open.closed', { fix: fixAction('open-eyes') })
      : passed();
  },
};

export const mouthClosedRule: RuleDefinition = {
  id: 'mouth-closed',
  requirements: [{ standard: 'iso-19794-5', id: 'mouth-open' }],
  severity: 'blocking',
  evidence: 'landmarks',
  fixGroup: undefined,
  measures: false,
  // Checked against every expression policy, not only the strict one. Both
  // policies in the registry require the mouth closed — one of them permits a
  // slight smile, which is a smile with the lips together.
  evaluate: (input): RuleOutcome => {
    if (input.blendshapes === undefined) return unmeasured();

    return strongest(input.blendshapes, MOUTH_OPEN_BLENDSHAPES) > MOUTH_OPEN_BLENDSHAPE_RATIO
      ? ruleOutcome('fail', 'mouth-closed.open', { fix: fixAction('close-mouth') })
      : passed();
  },
};

export const neutralExpressionRule: RuleDefinition = {
  id: 'neutral-expression',
  requirements: [{ standard: 'iso-19794-5', id: 'neutral-expression' }],
  severity: 'blocking',
  evidence: 'landmarks',
  fixGroup: undefined,
  measures: false,
  evaluate: (input, spec): RuleOutcome => {
    if (input.blendshapes === undefined) return unmeasured();
    if (strongest(input.blendshapes, SMILE_BLENDSHAPES) <= SMILE_BLENDSHAPE_RATIO) return passed();

    // The same measurement means different things in different countries, so
    // the status comes from the specification rather than from the rule. Where
    // a slight smile is permitted, a detected smile is a warning: the model
    // cannot tell a permitted slight smile from a disqualifying broad one, and
    // failing a photograph on that distinction would be a confident answer to
    // a question it did not settle.
    return spec.expression === 'neutral-slight-smile-allowed'
      ? ruleOutcome('warning', 'neutral-expression.smiling', {
          fix: fixAction('relax-expression'),
        })
      : ruleOutcome('fail', 'neutral-expression.smiling', { fix: fixAction('relax-expression') });
  },
};
