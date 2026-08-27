import { describe, expect, it } from 'vitest';
import { EN_CONTENT } from '@/content/en.content';
import { resolveSpec } from '@/photo-spec/photo-spec.utils';
import { US_PASSPORT } from '@/photo-spec/specs/us.spec';
import { resolveRuleMessage } from './rule-message.utils';
import type { RuleResult } from './rule.types';

const SPEC = resolveSpec(US_PASSPORT, new Date('2026-08-27T00:00:00Z'));
const CONTENT = EN_CONTENT.rules;

const result = (overrides: Partial<RuleResult> = {}): RuleResult => ({
  ruleId: 'head-height',
  requirements: [{ standard: 'iso-19794-5', id: 'head-image-height-ratio' }],
  severity: 'blocking',
  status: 'fail',
  computedStatus: 'fail',
  messageId: 'head-height.below',
  measurement: { value: 20, unit: 'millimeter' },
  band: { min: 25.4, max: 34.9 },
  fix: { kind: 'move-closer', amount: { value: 0.27, unit: 'percent' } },
  fixDeferredTo: undefined,
  confidence: 0.9,
  ...overrides,
});

describe('turning a result into words', () => {
  it('names what was checked, what we found and what to do', () => {
    const resolved = resolveRuleMessage(result(), SPEC, CONTENT);

    expect(resolved.label).toBe('Head height');
    expect(resolved.message).toContain('smaller');
    expect(resolved.measurement).toBe('20 mm');
    expect(resolved.requirement).toBe('25.4 mm to 34.9 mm');
    expect(resolved.fixInstruction).toContain('27%');
  });

  it('follows the locale it is given', () => {
    expect(resolveRuleMessage(result(), SPEC, CONTENT, 'de-DE').measurement).toBe('20 mm');
    expect(resolveRuleMessage(result(), SPEC, CONTENT, 'de-DE').requirement).toContain('25,4');
  });

  it('omits the requirement when there is no measurement to read it in', () => {
    // A band means nothing without the unit its measurement was taken in, and
    // guessing one would print a range in the wrong units beside no number.
    const resolved = resolveRuleMessage(
      result({ measurement: undefined, band: { min: 1, max: 2 } }),
      SPEC,
      CONTENT,
    );

    expect(resolved.measurement).toBeUndefined();
    expect(resolved.requirement).toBeUndefined();
  });

  it('omits the instruction when the engine had none to give', () => {
    expect(resolveRuleMessage(result({ fix: undefined }), SPEC, CONTENT).fixInstruction).toBeUndefined();
  });

  it('renders an instruction that carries no amount', () => {
    const resolved = resolveRuleMessage(
      result({ messageId: 'eyes-open.closed', fix: { kind: 'open-eyes', amount: undefined } }),
      SPEC,
      CONTENT,
    );

    expect(resolved.fixInstruction).toBe(CONTENT.fixes['open-eyes']);
  });

  it('spells the photo age out as a duration rather than a bare number', () => {
    const resolved = resolveRuleMessage(
      result({ ruleId: 'photo-age', messageId: 'photo-age.check' }),
      SPEC,
      CONTENT,
    );

    expect(resolved.message).toContain('6 months');
  });
});
