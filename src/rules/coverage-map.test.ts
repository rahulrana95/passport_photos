import { describe, expect, it } from 'vitest';
import { EN_CONTENT } from '@/content/en.content';
import { buildCoverageSummary, COVERAGE_SUMMARY } from './coverage-map';
import {
  APPLICATION_REQUIREMENT_DISPOSITION,
  APPLICATION_REQUIREMENT_IDS,
  ISO_REQUIREMENT_DISPOSITION,
  ISO_REQUIREMENT_IDS,
} from './iso-requirement.constants';
import { AUTOMATIC_RULE_IDS } from './rule-id.constants';
import { ALL_RULES } from './rule-registry';

const SUMMARY = COVERAGE_SUMMARY;
const key = (standard: string, id: string): string => `${standard}:${id}`;

describe('the published coverage map', () => {
  it('accounts for every requirement in both taxonomies', () => {
    // The map's whole value is that it is exhaustive. A requirement that falls
    // out of it disappears from the page silently, and what a reader takes
    // from a list of checks that omits one is that it passed.
    expect(SUMMARY.totalCount).toBe(ISO_REQUIREMENT_IDS.length + APPLICATION_REQUIREMENT_IDS.length);
  });

  it('lists each requirement exactly once', () => {
    const keys = SUMMARY.entries.map((entry) => key(entry.requirement.standard, entry.requirement.id));

    expect(new Set(keys).size).toBe(keys.length);
  });

  it('adds up', () => {
    expect(
      SUMMARY.checkedCount +
        SUMMARY.manualCount +
        SUMMARY.undetectableCount +
        SUMMARY.plannedCount,
    ).toBe(SUMMARY.totalCount);
  });

  it('admits to more than it measures', () => {
    // Not an assertion about a number so much as about a posture: this map
    // exists to say what we do not check, and a version of it with nothing in
    // the last two columns would mean somebody had quietly reclassified an
    // impossibility as a feature.
    expect(SUMMARY.undetectableCount).toBeGreaterThan(0);
    expect(SUMMARY.plannedCount).toBeGreaterThan(0);
    expect(SUMMARY.manualCount).toBeGreaterThan(0);
  });

  it('names a rule for everything it claims to check or ask about', () => {
    for (const entry of SUMMARY.entries) {
      const covered = entry.kind === 'checked' || entry.kind === 'manual';

      expect(entry.ruleIds.length > 0, `${entry.requirement.id} claims ${entry.kind}`).toBe(covered);
    }
  });

  it('counts a requirement as measured whenever any rule measures it', () => {
    // Head coverings are the case: the silhouette check reports what it can
    // see and the checklist asks the reader about their own hat. Filing that
    // as "you check this" would hide a measurement we do make.
    const entry = SUMMARY.entries.find((candidate) => candidate.requirement.id === 'hat-or-cap');

    expect(entry?.kind).toBe('checked');
    expect(entry?.ruleIds).toContain('head-covering-visible');
    expect(entry?.ruleIds).toContain('head-covering-policy');
  });

  it('marks every requirement a rule answers as answered by a rule', () => {
    // The other direction: a rule quietly pointing at a requirement the
    // disposition table calls undetectable would publish a contradiction.
    const answered = new Set(
      ALL_RULES.flatMap((rule) =>
        rule.requirements.map((requirement) => key(requirement.standard, requirement.id)),
      ),
    );

    for (const id of ISO_REQUIREMENT_IDS) {
      if (!answered.has(key('iso-19794-5', id))) continue;
      expect(ISO_REQUIREMENT_DISPOSITION[id], id).toBe('by-rule');
    }
  });

  it('has a rule for every requirement the disposition table promises one for', () => {
    const answered = new Set(
      ALL_RULES.flatMap((rule) =>
        rule.requirements.map((requirement) => key(requirement.standard, requirement.id)),
      ),
    );

    const promised = [
      ...ISO_REQUIREMENT_IDS.filter((id) => ISO_REQUIREMENT_DISPOSITION[id] === 'by-rule').map(
        (id) => key('iso-19794-5', id),
      ),
      ...APPLICATION_REQUIREMENT_IDS.filter(
        (id) => APPLICATION_REQUIREMENT_DISPOSITION[id] === 'by-rule',
      ).map((id) => key('issuing-authority', id)),
    ];

    expect(promised.filter((entry) => !answered.has(entry))).toEqual([]);
  });

  it('gives an uncovered requirement no rules to point at', () => {
    const uncovered = SUMMARY.entries.filter(
      (entry) => entry.kind === 'undetectable' || entry.kind === 'planned',
    );

    expect(uncovered.every((entry) => entry.ruleIds.length === 0)).toBe(true);
  });

  it('backs every checked requirement with a rule that runs automatically', () => {
    const automatic = new Set<string>(AUTOMATIC_RULE_IDS);

    for (const entry of SUMMARY.entries.filter((candidate) => candidate.kind === 'checked')) {
      expect(entry.ruleIds.some((id) => automatic.has(id)), entry.requirement.id).toBe(true);
    }
  });

  it('has a human name for every requirement it lists', () => {
    // The map is published. A row reading "flash-reflection-on-lenses" is a
    // developer's identifier shown to somebody trying to work out whether
    // their photo is usable.
    for (const entry of SUMMARY.entries) {
      expect(EN_CONTENT.rules.requirements[entry.requirement.id]?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('has a name for every kind of answer it can give', () => {
    for (const entry of SUMMARY.entries) {
      expect(EN_CONTENT.rules.coverageKinds[entry.kind].length).toBeGreaterThan(0);
    }
  });

  it('is built once and does not change between reports', () => {
    expect(buildCoverageSummary()).toEqual(SUMMARY);
  });
});
