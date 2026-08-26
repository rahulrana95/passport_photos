import { describe, expect, it } from 'vitest';
import { EN_CONTENT } from './en.content';
import { getContent, isSupportedLocale, SUPPORTED_LOCALES } from './content.registry';

const leafValues = (tree: object): string[] =>
  Object.values(tree).flatMap((value) =>
    typeof value === 'string' ? [value] : leafValues(value as object),
  );

const ALL_COPY = leafValues(EN_CONTENT);

describe('copy invariants', () => {
  it('has copy to check', () => {
    expect(ALL_COPY.length).toBeGreaterThan(20);
  });

  it.each(ALL_COPY)('is non-empty and trimmed: %s', (copy) => {
    expect(copy.length).toBeGreaterThan(0);
    expect(copy).toBe(copy.trim());
  });

  it.each(ALL_COPY)('never promises acceptance: %s', (copy) => {
    expect(copy.toLowerCase()).not.toMatch(/guarantee|approved|will pass|certified|100% accurate/);
  });

  it('tells the reader what to do next in every error message', () => {
    // An error that only says what went wrong leaves the user stuck. Each of
    // ours has to carry an action.
    for (const [key, message] of Object.entries(EN_CONTENT.upload)) {
      if (!key.startsWith('error')) continue;
      expect(message.toLowerCase(), `${key} must suggest an action`).toMatch(
        /try|use|open|choose|share|retake/,
      );
    }
  });

  it('states who makes the final decision', () => {
    expect(EN_CONTENT.legal.acceptanceDisclaimer.toLowerCase()).toContain('final decision');
  });

  it('explains how to verify the privacy claim rather than only asserting it', () => {
    expect(EN_CONTENT.legal.verifyPrivacyHint.toLowerCase()).toContain('network');
  });
});

describe('content registry', () => {
  it('returns the default locale content when none is given', () => {
    expect(getContent()).toBe(EN_CONTENT);
  });

  it('returns the requested locale when supported', () => {
    expect(getContent('en')).toBe(EN_CONTENT);
  });

  it('falls back to the default rather than throwing on an unknown locale', () => {
    expect(getContent('xx')).toBe(EN_CONTENT);
  });

  it.each(SUPPORTED_LOCALES)('recognises %s as supported', (locale) => {
    expect(isSupportedLocale(locale)).toBe(true);
  });

  it('rejects an unsupported locale', () => {
    expect(isSupportedLocale('xx')).toBe(false);
  });
});
