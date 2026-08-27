import { AUTOMATIC_RULE_IDS, MANUAL_RULE_IDS, RULE_IDS } from './rule-id.constants';
import {
  backgroundColourRule,
  backgroundShadowRule,
  backgroundUniformityRule,
} from './definitions/background.rules';
import { exposureRule, focusRule, resolutionRule } from './definitions/capture.rules';
import {
  eyesOpenRule,
  mouthClosedRule,
  neutralExpressionRule,
} from './definitions/expression.rules';
import {
  eyeDistanceRule,
  eyeLineRule,
  headHeightRule,
  horizontalCentringRule,
} from './definitions/framing.rules';
import {
  glassesRule,
  hairAcrossEyesRule,
  headCoveringPolicyRule,
  inkOrCreaseRule,
  photoAgeRule,
  veilOverFaceRule,
} from './definitions/manual.rules';
import { headPitchRule, headTiltRule, headTurnRule } from './definitions/pose.rules';
import { headCoveringVisibleRule, singleSubjectRule } from './definitions/subject.rules';
import type { RuleId } from './rule-id.constants';
import type { RuleDefinition } from './rule.types';

/**
 * Every rule, addressed by id.
 *
 * Typed as a complete record rather than as an array, so a rule id declared
 * without a definition — or a definition written and never registered — is a
 * compile error. The alternative is a rule that exists in the constants, is
 * counted in the coverage map, and is silently never evaluated: a published
 * claim to check something we do not check, which is the one kind of bug this
 * product cannot afford.
 */
const DEFINITIONS: Readonly<Record<RuleId, RuleDefinition>> = {
  'single-subject': singleSubjectRule,
  'head-height': headHeightRule,
  'eye-line': eyeLineRule,
  'horizontal-centring': horizontalCentringRule,
  'eye-distance': eyeDistanceRule,
  resolution: resolutionRule,
  focus: focusRule,
  exposure: exposureRule,
  'background-colour': backgroundColourRule,
  'background-uniformity': backgroundUniformityRule,
  'background-shadow': backgroundShadowRule,
  'head-tilt': headTiltRule,
  'head-turn': headTurnRule,
  'head-pitch': headPitchRule,
  'eyes-open': eyesOpenRule,
  'mouth-closed': mouthClosedRule,
  'neutral-expression': neutralExpressionRule,
  'head-covering-visible': headCoveringVisibleRule,
  glasses: glassesRule,
  'head-covering-policy': headCoveringPolicyRule,
  'veil-over-face': veilOverFaceRule,
  'hair-across-eyes': hairAcrossEyesRule,
  'ink-or-crease': inkOrCreaseRule,
  'photo-age': photoAgeRule,
};

export const getRule = (id: RuleId): RuleDefinition => DEFINITIONS[id];

/** In declaration order, which is the order the report presents them in. */
export const ALL_RULES: readonly RuleDefinition[] = RULE_IDS.map(getRule);
export const AUTOMATIC_RULES: readonly RuleDefinition[] = AUTOMATIC_RULE_IDS.map(getRule);
export const MANUAL_RULES: readonly RuleDefinition[] = MANUAL_RULE_IDS.map(getRule);

/** Where a rule sits in the report, used to break ties deterministically. */
export const ruleOrder = (id: RuleId): number => RULE_IDS.indexOf(id);
