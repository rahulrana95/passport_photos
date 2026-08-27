import { ruleOutcome } from '../rule-outcome.utils';
import type { GlassesPolicy, HeadCoveringPolicy } from '@/photo-spec/photo-spec.constants';
import type { RuleMessageId } from '../rule-message.constants';
import type { RuleDefinition, RuleOutcome } from '../rule.types';

/**
 * The checks only the reader can make.
 *
 * These are not placeholders for detection we mean to add later. Each asks
 * something a person settles by looking at their own photograph for a second
 * and a model does not settle at all: whether those are the glasses they wear
 * every day, whether the print has picked up a crease, when it was taken.
 *
 * They always return 'manual'. The wording changes with the specification —
 * a country that bans glasses outright and one that allows them without glare
 * are asking the reader to check different things — but the status does not,
 * because there is no photograph these become answerable from.
 */

const GLASSES_MESSAGES: Readonly<Record<GlassesPolicy, RuleMessageId>> = {
  prohibited: 'glasses.prohibited',
  'permitted-no-glare': 'glasses.no-glare',
  permitted: 'glasses.permitted',
};

const HEAD_COVERING_MESSAGES: Readonly<Record<HeadCoveringPolicy, RuleMessageId>> = {
  prohibited: 'head-covering-policy.prohibited',
  'religious-only': 'head-covering-policy.religious-only',
  permitted: 'head-covering-policy.permitted',
};

export const glassesRule: RuleDefinition = {
  id: 'glasses',
  // One rule, four requirements. Heavy frames, tinted lenses, glare and a
  // frame across the eyes are four separate entries in the standard and one
  // glance in a mirror, and splitting them into four checklist items that all
  // say "look at your glasses" would be padding a report to look thorough.
  requirements: [
    { standard: 'iso-19794-5', id: 'dark-tinted-lenses' },
    { standard: 'iso-19794-5', id: 'flash-reflection-on-lenses' },
    { standard: 'iso-19794-5', id: 'frames-too-heavy' },
    { standard: 'iso-19794-5', id: 'frame-covering-eyes' },
  ],
  severity: 'blocking',
  evidence: 'none',
  fixGroup: undefined,
  evaluate: (_input, spec): RuleOutcome =>
    ruleOutcome('manual', GLASSES_MESSAGES[spec.glasses]),
};

export const headCoveringPolicyRule: RuleDefinition = {
  id: 'head-covering-policy',
  requirements: [{ standard: 'iso-19794-5', id: 'hat-or-cap' }],
  severity: 'blocking',
  evidence: 'none',
  fixGroup: undefined,
  evaluate: (_input, spec): RuleOutcome =>
    ruleOutcome('manual', HEAD_COVERING_MESSAGES[spec.headCovering]),
};

export const veilOverFaceRule: RuleDefinition = {
  id: 'veil-over-face',
  requirements: [{ standard: 'iso-19794-5', id: 'veil-over-face' }],
  severity: 'blocking',
  evidence: 'none',
  fixGroup: undefined,
  evaluate: (): RuleOutcome => ruleOutcome('manual', 'veil-over-face.check'),
};

export const hairAcrossEyesRule: RuleDefinition = {
  id: 'hair-across-eyes',
  requirements: [{ standard: 'iso-19794-5', id: 'hair-across-eyes' }],
  severity: 'blocking',
  evidence: 'none',
  fixGroup: undefined,
  evaluate: (): RuleOutcome => ruleOutcome('manual', 'hair-across-eyes.check'),
};

export const inkOrCreaseRule: RuleDefinition = {
  id: 'ink-or-crease',
  requirements: [{ standard: 'iso-19794-5', id: 'ink-marked-creased' }],
  severity: 'blocking',
  evidence: 'none',
  fixGroup: undefined,
  evaluate: (): RuleOutcome => ruleOutcome('manual', 'ink-or-crease.check'),
};

export const photoAgeRule: RuleDefinition = {
  id: 'photo-age',
  // Not an ISO requirement, and filed accordingly. How recently a photograph
  // was taken is not a property of its pixels; it is a rule one government
  // wrote on one web page, and dressing it up with an ISO identifier would
  // give a local policy the standing of an international standard.
  requirements: [{ standard: 'issuing-authority', id: 'photo-age' }],
  severity: 'blocking',
  evidence: 'none',
  fixGroup: undefined,
  evaluate: (): RuleOutcome => ruleOutcome('manual', 'photo-age.check'),
};
