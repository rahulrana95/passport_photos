import { fixAction } from '../fix-action.utils';
import { passed, ruleOutcome, unmeasured } from '../rule-outcome.utils';
import type { BackgroundResult } from '@/quality/background.utils';
import type { RuleOutcome } from '../rule.types';
import type { RuleDefinition } from '../rule.types';

/**
 * The three background rules, each answering one question about the same
 * region: is it the right colour, is it plain, is it evenly lit.
 *
 * Split rather than merged because the corrections are different. A blue wall
 * needs a different wall; a patterned white one needs a sheet; an evenly
 * coloured, evenly patterned wall with the subject's shadow on it needs the
 * subject to step away from it. One "background" verdict would have to pick
 * one of those to say.
 *
 * Not a fix group: those three actions do not undo one another.
 */

/**
 * Every background rule is unanswerable in the same circumstance, and it is
 * worth being precise about what that circumstance is. Too few background
 * pixels does not mean the background is bad — it means the photograph is
 * cropped so tightly that whatever is behind the subject is barely in it, and
 * a standard deviation over a few hundred corner pixels would be a confident
 * statement about a wall we can hardly see.
 */
const unanswerable = (background: BackgroundResult): boolean => !background.hasEnoughSamples;

export const backgroundColourRule: RuleDefinition = {
  id: 'background-colour',
  requirements: [{ standard: 'iso-19794-5', id: 'unnatural-background-colour' }],
  severity: 'blocking',
  evidence: 'segmentation',
  fixGroup: undefined,
  evaluate: (input): RuleOutcome => {
    if (input.background === undefined) return unmeasured();
    if (unanswerable(input.background)) {
      return ruleOutcome('undetectable', 'background.too-little-background');
    }

    return input.background.colourWithinRange
      ? passed()
      : ruleOutcome('fail', 'background-colour.wrong-colour', {
          fix: fixAction('change-background-colour'),
        });
  },
};

export const backgroundUniformityRule: RuleDefinition = {
  id: 'background-uniformity',
  requirements: [{ standard: 'iso-19794-5', id: 'varied-background' }],
  severity: 'blocking',
  evidence: 'segmentation',
  fixGroup: undefined,
  evaluate: (input): RuleOutcome => {
    if (input.background === undefined) return unmeasured();
    if (unanswerable(input.background)) {
      return ruleOutcome('undetectable', 'background.too-little-background');
    }

    // A wrong-coloured background can still pass this rule, and that is
    // correct: this rule is about pattern, and a plain blue wall is plain. The
    // colour rule has already said what is wrong with it, and saying it twice
    // in different words is how a reader comes to believe there are two
    // problems. Read from the uniformity flag rather than the verdict, so a
    // wall that is both blue and patterned is reported as both.
    return input.background.isUniform
      ? passed()
      : ruleOutcome('fail', 'background-uniformity.not-uniform', {
          fix: fixAction('use-plain-background'),
        });
  },
};

export const backgroundShadowRule: RuleDefinition = {
  id: 'background-shadow',
  requirements: [{ standard: 'iso-19794-5', id: 'shadows-behind-head' }],
  severity: 'blocking',
  evidence: 'segmentation',
  fixGroup: undefined,
  evaluate: (input): RuleOutcome => {
    if (input.background === undefined) return unmeasured();
    if (unanswerable(input.background)) {
      return ruleOutcome('undetectable', 'background.too-little-background');
    }

    return input.background.isEvenlyLit
      ? passed()
      : ruleOutcome('fail', 'background-shadow.shadowed', { fix: fixAction('move-from-wall') });
  },
};
