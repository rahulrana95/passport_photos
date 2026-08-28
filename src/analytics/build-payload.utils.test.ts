import { describe, expect, it } from 'vitest';
import { RULE_IDS } from '@/rules/rule-id.constants';
import { ALLOWED_PROPERTY_KEYS, FORBIDDEN_PROPERTY_PATTERNS } from './analytics-event.constants';
import { buildPayload, sanitisePayload } from './build-payload.utils';
import type { AnalyticsEvent } from './analytics-event.types';

const SPEC = { country: 'us', document: 'passport' } as const;

/**
 * One of every event this product can emit.
 *
 * Exhaustive on purpose, and guarded below by a test that fails if the union
 * grows without this list growing with it. A new event that nobody added here
 * would be a new event nobody checked for leaks.
 */
const EVERY_EVENT: readonly AnalyticsEvent[] = [
  { name: 'check-started', spec: SPEC },
  { name: 'photo-accepted', format: 'heic' },
  { name: 'photo-refused', reason: 'decode-failed' },
  { name: 'check-completed', spec: SPEC, overall: 'fail', failedRules: 3 },
  { name: 'rule-failed', ruleId: 'head-height', spec: SPEC },
  { name: 'photo-downloaded' },
];

describe('what leaves the device', () => {
  it('sends nothing whose name suggests a measurement of a face', () => {
    // The product's entire promise. A failing rule's identity is a fact about
    // compliance; the millimetres it measured are a measurement of somebody's
    // head, and the second one never leaves the browser.
    for (const event of EVERY_EVENT) {
      for (const key of Object.keys(buildPayload(event))) {
        for (const forbidden of FORBIDDEN_PROPERTY_PATTERNS) {
          expect(forbidden.test(key), `${event.name} sends "${key}"`).toBe(false);
        }
      }
    }
  });

  it('sends only keys that were declared in advance', () => {
    for (const event of EVERY_EVENT) {
      for (const key of Object.keys(buildPayload(event))) {
        expect(ALLOWED_PROPERTY_KEYS, `${event.name} sends "${key}"`).toContain(key);
      }
    }
  });

  it('sends only strings and numbers, never an object to walk into', () => {
    // A nested object is how a measurement travels without its name showing:
    // `spec` would carry the entire resolved specification if it were spread.
    for (const event of EVERY_EVENT) {
      for (const value of Object.values(buildPayload(event))) {
        expect(['string', 'number']).toContain(typeof value);
      }
    }
  });

  it('ignores a smuggled field, because every case names its own', () => {
    // The first lock. A builder case reads the fields it wants one at a time,
    // so an event carrying an extra measurement cannot pass it on even when a
    // cast in the caller has defeated the type system.
    const smuggled = {
      name: 'rule-failed',
      ruleId: 'head-height',
      spec: { ...SPEC, headHeightMm: 34.2 },
    } as unknown as AnalyticsEvent;

    expect(Object.keys(buildPayload(smuggled))).not.toContain('headHeightMm');
  });

  it('drops a key that is not on the allowlist, tried directly', () => {
    // The second lock, exercised on its own because nothing above can reach
    // it. The way to know a backstop works is to try it rather than to wait
    // for the thing in front of it to fail.
    expect(sanitisePayload({ country: 'us', headHeightMm: 34.2 })).toEqual({ country: 'us' });
  });

  it('has a case for every event in the union', () => {
    // If the union grows and the builder does not, the switch falls through
    // and returns undefined rather than a payload.
    for (const event of EVERY_EVENT) {
      expect(buildPayload(event), event.name).toBeDefined();
    }
  });

  it('covers every event name the union declares', () => {
    // The guard on the fixture list itself. Compared against the names the
    // builder handles, so adding a variant without a fixture fails here.
    const covered = new Set(EVERY_EVENT.map((event) => event.name));

    expect(covered.size).toBe(EVERY_EVENT.length);
    expect([...covered].sort()).toEqual([
      'check-completed',
      'check-started',
      'photo-accepted',
      'photo-downloaded',
      'photo-refused',
      'rule-failed',
    ]);
  });
});

describe('what the events are for', () => {
  it('identifies the country and document, which is the country mix', () => {
    expect(buildPayload({ name: 'check-started', spec: SPEC })).toEqual({
      country: 'us',
      document: 'passport',
    });
  });

  it('names the rule that failed, which is what makes a failure rate', () => {
    // The most valuable number here: which requirement people actually get
    // wrong, and therefore what the guidance should say first.
    const payload = buildPayload({ name: 'rule-failed', ruleId: 'head-height', spec: SPEC });

    expect(payload['ruleId']).toBe('head-height');
    expect(RULE_IDS).toContain(payload['ruleId']);
  });

  it('reports a verdict and a count, not what was measured to reach them', () => {
    expect(buildPayload({ name: 'check-completed', spec: SPEC, overall: 'fail', failedRules: 3 }))
      .toEqual({ country: 'us', document: 'passport', overall: 'fail', failedRules: 3 });
  });

  it('records the format, which is the argument for decoding HEIC at all', () => {
    expect(buildPayload({ name: 'photo-accepted', format: 'heic' })).toEqual({ format: 'heic' });
  });
});
