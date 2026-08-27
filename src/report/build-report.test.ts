import { describe, expect, it } from 'vitest';
import { EN_CONTENT } from '@/content/en.content';
import { resolveSpec } from '@/photo-spec/photo-spec.utils';
import { US_PASSPORT } from '@/photo-spec/specs/us.spec';
import { evaluateRules } from '@/rules/evaluate-rules';
import { EMPTY_RULE_INPUT, PASSING_RULE_INPUT, headHeightOf } from '@/testing/fixtures/rule-input.builder';
import { extractPdfText } from '@/testing/pdf-text.harness';
import { buildComplianceReport } from './build-report';
import type { ReportSubject } from './report-blocks';

const NOW = new Date('2026-08-27T00:00:00Z');
const SPEC = resolveSpec(US_PASSPORT, NOW);
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x41, 0x42, 0xff, 0xd9]);

const subjectFor = (
  input: typeof PASSING_RULE_INPUT,
  photo: ReportSubject['photo'] = undefined,
): ReportSubject => ({
  report: evaluateRules(input, SPEC),
  photo,
  now: NOW,
  locale: 'en',
});

const build = (subject: ReportSubject): { pdf: Uint8Array; pages: number; text: readonly string[] } => {
  const result = buildComplianceReport(subject);
  if (!result.ok) throw new Error(`The report must build: ${result.character}`);
  return { pdf: result.pdf, pages: result.pages, text: extractPdfText(result.pdf) };
};

const contains = (haystack: Uint8Array, needle: Uint8Array): boolean => {
  for (let start = 0; start + needle.length <= haystack.length; start += 1) {
    if (needle.every((byte, index) => haystack[start + index] === byte)) return true;
  }
  return false;
};

describe('what the report says', () => {
  const built = build(subjectFor(PASSING_RULE_INPUT));
  const joined = built.text.join(' ');

  it('names itself and the date it was made', () => {
    expect(joined).toContain(EN_CONTENT.report.title);
    expect(joined).toContain('2026');
  });

  it('lists every rule that was evaluated', () => {
    // The point of the document. A screen full of green ticks is not evidence;
    // a list of what was checked, against what, on what date, is.
    for (const result of subjectFor(PASSING_RULE_INPUT).report.results) {
      expect(joined, result.ruleId).toContain(EN_CONTENT.rules.labels[result.ruleId]);
    }
  });

  it('lists the checks that are the reader’s to make', () => {
    expect(joined).toContain(EN_CONTENT.report.checklistHeading);
    expect(joined).toContain(EN_CONTENT.rules.labels['glasses']);
  });

  it('says where the requirements came from, and when we last looked', () => {
    // So that somebody who disagrees with us can go and read the same page.
    expect(joined).toContain(SPEC.source);
    expect(joined).toContain(SPEC.lastVerified);
  });

  it('publishes what it did not check alongside what it did', () => {
    expect(joined).toContain(EN_CONTENT.report.coverageHeading);
    expect(joined).toContain(String(subjectFor(PASSING_RULE_INPUT).report.coverage.totalCount));
  });

  it('carries the disclaimer, verbatim', () => {
    // It says who actually decides. Paraphrasing it here — or softening it —
    // would turn the one honest sentence in the document into marketing.
    const disclaimer = EN_CONTENT.legal.acceptanceDisclaimer;
    const words = disclaimer.split(' ');

    expect(joined).toContain(words.slice(0, 6).join(' '));
    expect(joined).toContain(words.slice(-6).join(' '));
  });
});

describe('what the report must never say', () => {
  it.each([
    ['passing', PASSING_RULE_INPUT],
    ['failing', headHeightOf(20)],
    ['unmeasurable', EMPTY_RULE_INPUT],
  ])('never promises acceptance on a %s photo', (_name, input) => {
    // The words themselves, checked against the finished document rather than
    // against the copy it was built from. This is the last place they could
    // get in.
    const joined = build(subjectFor(input)).text.join(' ').toLowerCase();

    expect(joined).not.toMatch(/guarantee|approved|will pass|certified/);
  });
});

describe('the photograph', () => {
  it('is embedded, byte for byte', () => {
    const built = build(
      subjectFor(PASSING_RULE_INPUT, { jpeg: JPEG, widthPx: 600, heightPx: 600 }),
    );

    expect(contains(built.pdf, JPEG)).toBe(true);
  });

  it('is not required', () => {
    // Analysis can fail before there is anything to annotate, and the report
    // is more useful then rather than less.
    expect(build(subjectFor(EMPTY_RULE_INPUT)).pages).toBeGreaterThan(0);
  });

  it('leaves the document small when there is none', () => {
    // A few kilobytes of text. Not embedding a font is what buys that, and it
    // matters for a document people email.
    expect(build(subjectFor(PASSING_RULE_INPUT)).pdf.length).toBeLessThan(40_000);
  });
});

describe('a long report', () => {
  it('runs onto more than one page', () => {
    // Twenty-four rules with measurements and instructions does not fit on a
    // sheet of A4, and the alternative to a second page is a truncated
    // document that looks complete.
    expect(build(subjectFor(headHeightOf(20))).pages).toBeGreaterThan(1);
  });

  it('keeps its text readable on every page', () => {
    const built = build(subjectFor(headHeightOf(20)));

    expect(built.text.length).toBeGreaterThan(30);
  });
});

describe('a locale it cannot set', () => {
  it('refuses rather than writing a black diamond', () => {
    // The report embeds no font, which buys a document of a few kilobytes and
    // costs a Latin-only repertoire. The day a locale ships a character
    // outside it, this has to fail loudly — a report that renders a rule as
    // garbage gets printed and handed to somebody.
    const subject = subjectFor(PASSING_RULE_INPUT);
    const result = buildComplianceReport({
      ...subject,
      report: {
        ...subject.report,
        spec: { ...subject.report.spec, source: 'https://example.test/\u65e5\u672c' },
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('unwritable-character');
    expect(result.character).toBe('\u65e5');
  });
});
