import { describe, expect, it } from 'vitest';
import { EN_CONTENT } from '@/content/en.content';
import { resolveSpec } from '@/photo-spec/photo-spec.utils';
import { US_PASSPORT } from '@/photo-spec/specs/us.spec';
import {
  buildRuleInput,
  eyeLineOf,
  headHeightOf,
  PASSING_RULE_INPUT,
  withBackground,
  withMeasurements,
} from '@/testing/fixtures/rule-input.builder';
import { evaluateRules } from './evaluate-rules';
import { RULE_MESSAGE_IDS } from './rule-message.constants';
import { resolveRuleMessage } from './rule-message.utils';
import type { RuleStatus } from '@/constants/rule-status.constants';
import type { ResolvedPhotoSpec } from '@/photo-spec/photo-spec.types';
import type { RuleId } from './rule-id.constants';
import type { RuleMessageId } from './rule-message.constants';
import type { RuleInput } from './rule.types';

const NOW = new Date('2026-08-27T00:00:00Z');
const SPEC = resolveSpec(US_PASSPORT, NOW);

const specWith = (overrides: Partial<ResolvedPhotoSpec>): ResolvedPhotoSpec => ({
  ...SPEC,
  ...overrides,
});

const geometryFailure = (
  reason: Extract<RuleInput['geometry'], { ok: false }>['reason'],
): RuleInput => buildRuleInput({ geometry: { ok: false, reason } });

interface Scenario {
  readonly name: string;
  readonly ruleId: RuleId;
  readonly status: RuleStatus;
  readonly messageId: RuleMessageId;
  readonly input: RuleInput;
  readonly spec: ResolvedPhotoSpec;
}

const scenario = (
  name: string,
  ruleId: RuleId,
  status: RuleStatus,
  messageId: RuleMessageId,
  input: RuleInput,
  spec: ResolvedPhotoSpec = SPEC,
): Scenario => ({ name, ruleId, status, messageId, input, spec });

/**
 * One scenario per thing a rule can say.
 *
 * The table is the point rather than the convenience. A rule engine's failure
 * mode is not a wrong threshold — that shows up the first time somebody uses
 * it — but a state nobody exercised, which sits there returning a plausible
 * verdict for the wrong reason. So the last test in this file asserts that
 * every message the content module holds is produced by a scenario here: a
 * message with no path to it is either dead copy or an unreachable branch, and
 * both are worth failing a build over.
 */
const SCENARIOS: readonly Scenario[] = [
  scenario('a photo meeting every requirement', 'head-height', 'pass', 'shared.pass', PASSING_RULE_INPUT),
  scenario(
    'a measurement that never arrived',
    'eye-distance',
    'undetectable',
    'shared.unmeasured',
    buildRuleInput({ interOcularPx: undefined }),
  ),
  scenario(
    'a crown estimate too unsure to stand behind',
    'head-height',
    'manual',
    'shared.uncertain',
    buildRuleInput({ confidence: { landmarks: 0.95, crown: 0.2, segmentation: 0.9 } }),
  ),

  scenario('no crown to measure from', 'head-height', 'undetectable', 'geometry.crown-unmeasured', geometryFailure('crown-unmeasured')),
  scenario('a head running past the frame', 'head-height', 'undetectable', 'geometry.head-not-in-frame', geometryFailure('head-not-in-frame')),
  scenario('a crop that would run off the source', 'head-height', 'undetectable', 'geometry.crop-outside-source', geometryFailure('crop-outside-source')),
  scenario('a source too small to crop', 'head-height', 'undetectable', 'geometry.source-resolution-too-low', geometryFailure('source-resolution-too-low')),
  scenario('landmarks that do not describe a face', 'head-height', 'undetectable', 'geometry.degenerate-geometry', geometryFailure('degenerate-geometry')),

  scenario(
    'somebody else in the frame',
    'single-subject',
    'fail',
    'single-subject.multiple-faces',
    buildRuleInput({ detection: { ok: true, hadOtherFaces: true } }),
  ),
  scenario('no face at all', 'single-subject', 'undetectable', 'single-subject.no-face', buildRuleInput({ detection: { ok: false, reason: 'no-face' } })),
  scenario('a face too small to measure', 'single-subject', 'undetectable', 'single-subject.too-small', buildRuleInput({ detection: { ok: false, reason: 'too-small' } })),
  scenario('a face at the frame edge', 'single-subject', 'undetectable', 'single-subject.touches-frame-edge', buildRuleInput({ detection: { ok: false, reason: 'touches-frame-edge' } })),
  scenario('a pose too far turned to measure', 'single-subject', 'undetectable', 'single-subject.pose-unreliable', buildRuleInput({ detection: { ok: false, reason: 'pose-unreliable' } })),

  scenario('a head smaller than the band', 'head-height', 'fail', 'head-height.below', headHeightOf(20)),
  scenario('a head larger than the band', 'head-height', 'fail', 'head-height.above', headHeightOf(40)),
  scenario('a head measuring nothing at all', 'head-height', 'undetectable', 'shared.unmeasured', headHeightOf(0)),

  scenario(
    'a crop that produced no eye line at all',
    'eye-line',
    'undetectable',
    'shared.unmeasured',
    withMeasurements({ eyeLine: undefined, eyeLineFromBottomMm: undefined }),
  ),
  scenario('eyes sitting too low', 'eye-line', 'fail', 'eye-line.below', eyeLineOf(20)),
  scenario('eyes sitting too high', 'eye-line', 'fail', 'eye-line.above', eyeLineOf(40)),

  scenario('a subject left of centre', 'horizontal-centring', 'fail', 'horizontal-centring.left', withMeasurements({ horizontalOffsetRatio: -0.12 })),
  scenario('a subject right of centre', 'horizontal-centring', 'fail', 'horizontal-centring.right', withMeasurements({ horizontalOffsetRatio: 0.12 })),

  scenario('too few pixels between the eyes', 'eye-distance', 'fail', 'eye-distance.too-few-pixels', buildRuleInput({ interOcularPx: 50 })),
  scenario('an export smaller than the minimum', 'resolution', 'fail', 'resolution.too-small', buildRuleInput({ outputPx: { widthPx: 400, heightPx: 400 } })),

  scenario('a soft face', 'focus', 'fail', 'focus.soft', buildRuleInput({ sharpness: { verdict: 'soft', laplacianVariance: 12, sampleCount: 90_000 } })),
  scenario('too little face to judge focus', 'focus', 'undetectable', 'focus.too-small-to-judge', buildRuleInput({ sharpness: { verdict: 'too-small-to-judge', laplacianVariance: 0, sampleCount: 40 } })),

  scenario('crushed shadows', 'exposure', 'fail', 'exposure.clipped-shadows', buildRuleInput({ exposure: { verdict: 'clipped-shadows', tonalRange: 60, clippedBlackRatio: 0.2, clippedWhiteRatio: 0 } })),
  scenario('blown highlights', 'exposure', 'fail', 'exposure.clipped-highlights', buildRuleInput({ exposure: { verdict: 'clipped-highlights', tonalRange: 60, clippedBlackRatio: 0, clippedWhiteRatio: 0.2 } })),
  scenario('a face with no tone left', 'exposure', 'fail', 'exposure.flat', buildRuleInput({ exposure: { verdict: 'flat', tonalRange: 8, clippedBlackRatio: 0, clippedWhiteRatio: 0 } })),

  scenario('a background of the wrong colour', 'background-colour', 'fail', 'background-colour.wrong-colour', withBackground({ colourWithinRange: false })),
  scenario('a patterned background', 'background-uniformity', 'fail', 'background-uniformity.not-uniform', withBackground({ isUniform: false })),
  scenario('a shadow across the wall', 'background-shadow', 'fail', 'background-shadow.shadowed', withBackground({ isEvenlyLit: false })),
  scenario('barely any background in view', 'background-colour', 'undetectable', 'background.too-little-background', withBackground({ hasEnoughSamples: false })),
  scenario('barely any background, uniformity', 'background-uniformity', 'undetectable', 'background.too-little-background', withBackground({ hasEnoughSamples: false })),
  scenario('barely any background, shadow', 'background-shadow', 'undetectable', 'background.too-little-background', withBackground({ hasEnoughSamples: false })),

  scenario('a tilted head', 'head-tilt', 'fail', 'head-tilt.tilted', withMeasurements({ rollDegrees: 9 })),
  scenario('a turned head', 'head-turn', 'fail', 'head-turn.turned', buildRuleInput({ pose: { yawDegrees: 12, pitchDegrees: 0 } })),
  scenario('a chin off level', 'head-pitch', 'fail', 'head-pitch.tilted', buildRuleInput({ pose: { yawDegrees: 0, pitchDegrees: 12 } })),

  scenario('closed eyes', 'eyes-open', 'fail', 'eyes-open.closed', buildRuleInput({ blendshapes: { eyeBlinkLeft: 0.8, eyeBlinkRight: 0.1, jawOpen: 0.04 } })),
  scenario('an open mouth', 'mouth-closed', 'fail', 'mouth-closed.open', buildRuleInput({ blendshapes: { jawOpen: 0.6 } })),
  scenario('a smile where none is allowed', 'neutral-expression', 'fail', 'neutral-expression.smiling', buildRuleInput({ blendshapes: { mouthSmileLeft: 0.6 } })),
  scenario(
    'a smile where a slight one is allowed',
    'neutral-expression',
    'warning',
    'neutral-expression.smiling',
    buildRuleInput({ blendshapes: { mouthSmileLeft: 0.6 } }),
    specWith({ expression: 'neutral-slight-smile-allowed' }),
  ),

  scenario(
    'a flat-topped silhouette',
    'head-covering-visible',
    'warning',
    'head-covering-visible.may-include-covering',
    buildRuleInput({ crown: { ok: true, crownY: 40, confidence: 0.55, mayIncludeCovering: true }, confidence: { landmarks: 0.95, crown: 0.9, segmentation: 0.9 } }),
  ),
  scenario(
    'a crown estimate that failed outright',
    'head-covering-visible',
    'undetectable',
    'shared.unmeasured',
    buildRuleInput({ crown: { ok: false, reason: 'mask-unreliable' } }),
  ),

  scenario('glasses banned outright', 'glasses', 'manual', 'glasses.prohibited', PASSING_RULE_INPUT),
  scenario('glasses allowed without glare', 'glasses', 'manual', 'glasses.no-glare', PASSING_RULE_INPUT, specWith({ glasses: 'permitted-no-glare' })),
  scenario('glasses allowed', 'glasses', 'manual', 'glasses.permitted', PASSING_RULE_INPUT, specWith({ glasses: 'permitted' })),

  scenario('head coverings banned', 'head-covering-policy', 'manual', 'head-covering-policy.prohibited', PASSING_RULE_INPUT, specWith({ headCovering: 'prohibited' })),
  scenario('head coverings for religious reasons', 'head-covering-policy', 'manual', 'head-covering-policy.religious-only', PASSING_RULE_INPUT),
  scenario('head coverings allowed', 'head-covering-policy', 'manual', 'head-covering-policy.permitted', PASSING_RULE_INPUT, specWith({ headCovering: 'permitted' })),

  scenario('a veil to check for', 'veil-over-face', 'manual', 'veil-over-face.check', PASSING_RULE_INPUT),
  scenario('hair to check for', 'hair-across-eyes', 'manual', 'hair-across-eyes.check', PASSING_RULE_INPUT),
  scenario('marks to check for', 'ink-or-crease', 'manual', 'ink-or-crease.check', PASSING_RULE_INPUT),
  scenario('a photo whose age only the reader knows', 'photo-age', 'manual', 'photo-age.check', PASSING_RULE_INPUT),
];

const resultFor = (entry: Scenario): ReturnType<typeof evaluateRules>['results'][number] => {
  const report = evaluateRules(entry.input, entry.spec);
  const found = [...report.results, ...report.manualChecklist].find(
    (result) => result.ruleId === entry.ruleId,
  );

  if (found === undefined) throw new Error(`No result for ${entry.ruleId} in "${entry.name}".`);
  return found;
};

describe('every rule, in every state it can reach', () => {
  it.each(SCENARIOS)('$ruleId reports $status for $name', (entry) => {
    const result = resultFor(entry);

    expect(result.status).toBe(entry.status);
    expect(result.messageId).toBe(entry.messageId);
  });

  it.each(SCENARIOS.filter((entry) => entry.status === 'fail'))(
    '$ruleId gives the reader something to do about $name',
    (entry) => {
      // A verdict without an action leaves the reader stuck, which is the one
      // thing a compliance report must never do. Framing failures may defer
      // their instruction to another rule in their group — but they must point
      // at the rule that carries it rather than simply going quiet.
      const result = resultFor(entry);

      expect(result.fix ?? result.fixDeferredTo).toBeDefined();
    },
  );
});

describe('resolving a result into words', () => {
  it.each(SCENARIOS)('leaves no placeholder unfilled for $name', (entry) => {
    const resolved = resolveRuleMessage(resultFor(entry), entry.spec, EN_CONTENT.rules);

    expect(resolved.label.length).toBeGreaterThan(0);
    expect(resolved.message).not.toMatch(/\{\w+\}/);
    expect(resolved.fixInstruction ?? '').not.toMatch(/\{\w+\}/);
  });

  it('spells out the photo age the specification asks for', () => {
    const entry = SCENARIOS.find((candidate) => candidate.messageId === 'photo-age.check');
    if (entry === undefined) throw new Error('The photo age scenario must exist.');

    expect(resolveRuleMessage(resultFor(entry), entry.spec, EN_CONTENT.rules).message).toContain(
      '6 months',
    );
  });
});

describe('message coverage', () => {
  it('has a scenario producing every message the content module holds', () => {
    // A message with no path to it is either copy nobody can ever read or a
    // branch nobody can ever take. Both are worth failing a build over, and
    // neither is visible in a diff.
    const produced = new Set(SCENARIOS.map((entry) => entry.messageId));

    expect([...RULE_MESSAGE_IDS].filter((id) => !produced.has(id))).toEqual([]);
  });
});
