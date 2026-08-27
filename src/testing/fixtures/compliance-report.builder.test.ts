import { describe, expect, it } from 'vitest';
import { failingReport, fixtureSpec, passingReport, undetectableReport } from './compliance-report.builder';

describe('fixtureSpec', () => {
  it('resolves a real authored specification', () => {
    expect(fixtureSpec().print.heightMm).toBeGreaterThan(0);
  });

  it('is deterministic, so a report built twice is the same report', () => {
    expect(fixtureSpec().lastVerified).toEqual(fixtureSpec().lastVerified);
  });

  it('fails loudly rather than quietly producing an empty report', () => {
    // An empty registry would otherwise give every panel test a screen with
    // nothing on it to pass against.
    expect(() => fixtureSpec([])).toThrow(/registry is empty/);
  });
});

describe('the report fixtures', () => {
  it('produce a passing verdict from the passing bundle', () => {
    expect(passingReport().overall).toBe('pass');
  });

  it('produce a failure from a head outside the band', () => {
    // Built by moving one measurement rather than by writing a status down: a
    // fixture that asserted its own verdicts would let the engine and the
    // panel disagree without any test noticing.
    expect(failingReport().overall).toBe('fail');
  });

  it('never report a pass when nothing was measured', () => {
    expect(undetectableReport().results.some((result) => result.status === 'pass')).toBe(false);
  });
});
