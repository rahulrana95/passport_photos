import { describe, expect, it } from 'vitest';
import { evaluateRules } from '@/rules/evaluate-rules';
import { listAuthoredSpecs } from '@/photo-spec/photo-spec.registry';
import { resolveSpec } from '@/photo-spec/photo-spec.utils';
import { PASSING_RULE_INPUT } from '@/testing/fixtures/rule-input.builder';
import { reportShape } from './report-shape.utils';
import type { ResolvedPhotoSpec } from '@/photo-spec/photo-spec.types';

const NOW = new Date('2026-01-01T00:00:00Z');

/**
 * The real authored specifications, not hand-rolled ones.
 *
 * A skeleton is only worth testing against the shapes it will actually be
 * asked to predict, and a fixture assembled here would drift from the registry
 * the moment a rule started reading a field the fixture never had.
 */
const authored = (): readonly ResolvedPhotoSpec[] =>
  listAuthoredSpecs().map((spec) => resolveSpec(spec, NOW));

const withEyeLine = (): ResolvedPhotoSpec | undefined =>
  authored().find((spec) => spec.eyeLine !== undefined);

const withoutEyeLine = (): ResolvedPhotoSpec | undefined =>
  authored().find((spec) => spec.eyeLine === undefined);

describe('reportShape', () => {
  it('has real specifications to predict for', () => {
    // Without this the suite below would pass vacuously the day the registry
    // is emptied or renamed.
    expect(authored().length).toBeGreaterThan(0);
  });

  it.each(authored().map((spec) => [`${spec.country}:${spec.document}`, spec] as const))(
    'predicts exactly the rows a real report produces for %s',
    (_name, spec) => {
      // This is what makes the loading state cost nothing in layout shift. A
      // skeleton of "about six rows" jumps when the seventh arrives.
      const predicted = reportShape(spec);
      const actual = evaluateRules(PASSING_RULE_INPUT, spec);

      expect(predicted.ruleRows).toHaveLength(actual.results.length);
      expect(predicted.manualRows).toHaveLength(actual.manualChecklist.length);
    },
  );

  it('counts a specification that states an eye line above one that does not', () => {
    // An eye line is stated by Schengen and by almost nobody else. A skeleton
    // that ignored the difference would be wrong on one of them by a whole row.
    const stated = withEyeLine();
    const silent = withoutEyeLine();
    expect(stated).toBeDefined();
    expect(silent).toBeDefined();

    expect(reportShape(stated as ResolvedPhotoSpec).ruleRows.length).toBeGreaterThan(
      reportShape(silent as ResolvedPhotoSpec).ruleRows.length,
    );
  });

  it('says which rows will carry a measurement, not just how many there are', () => {
    // A row reporting a number is one line taller than one that does not.
    // Reserving two lines for every row shrinks the page by a fifth when the
    // answer lands; reserving one grows it.
    const [spec] = authored();
    const shape = reportShape(spec as ResolvedPhotoSpec);

    expect(shape.ruleRows.some((measures) => measures)).toBe(true);
    expect(shape.ruleRows.some((measures) => !measures)).toBe(true);
    expect(shape.manualRows.every((measures) => !measures)).toBe(true);
  });

  it('predicts rows to draw rather than none', () => {
    const [spec] = authored();

    expect(reportShape(spec as ResolvedPhotoSpec).ruleRows.length).toBeGreaterThan(0);
    expect(reportShape(spec as ResolvedPhotoSpec).manualRows.length).toBeGreaterThan(0);
  });
});
