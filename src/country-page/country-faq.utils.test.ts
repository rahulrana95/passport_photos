import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE } from '@/constants/site.constants';
import { getContent } from '@/content/content.registry';
import { listServableSpecs } from '@/photo-spec/photo-spec.registry';
import { resolveSpec } from '@/photo-spec/photo-spec.utils';
import { buildFaqEntries } from './country-faq.utils';
import type { FaqEntry } from '@/components/content/FaqList/FaqList.types';
import { GERMANY_PASSPORT } from '@/photo-spec/specs/germany.spec';

const content = getContent();
const NOW = new Date('2026-01-01T00:00:00Z');

/** Positions of the two answers built from this country's own measurements. */
const SIZE_ANSWER = 0;
const HEAD_ANSWER = 1;

const entriesFor = (country: string, document: string): readonly FaqEntry[] => {
  const spec = listServableSpecs().find(
    (candidate) => candidate.country === country && candidate.document === document,
  );
  if (spec === undefined) throw new Error(`No servable specification for ${country} ${document}.`);

  return buildFaqEntries(resolveSpec(spec, NOW), content, DEFAULT_LOCALE);
};

const answersOf = (entries: readonly FaqEntry[]): readonly string[] =>
  entries.map((entry) => entry.answer);

describe('the questions a country page answers', () => {
  it('answers the size question with this country’s own numbers', () => {
    const size = entriesFor('us', 'passport')[SIZE_ANSWER];

    expect(size?.question).toContain('United States');
    expect(size?.answer).toContain('50.8');
  });

  it('never gives two documents the same answer about size or head height', () => {
    // THE POINT OF THE WHOLE FILE. Forty pages answering "what size is a
    // passport photo?" identically is forty pages of one page, and a site of
    // this shape gets treated as thin content and stops ranking at all.
    //
    // Asserted on the two answers that carry this country's numbers rather
    // than on every answer: some requirements genuinely ARE identical
    // everywhere — a neutral expression with the mouth closed is asked for by
    // most authorities — and writing those differently per country would be
    // inventing a difference rather than reporting one.
    const served = listServableSpecs().map((spec) =>
      buildFaqEntries(resolveSpec(spec, NOW), content, DEFAULT_LOCALE),
    );
    const distinguishing = served.map((entries) =>
      [entries[SIZE_ANSWER]?.answer, entries[HEAD_ANSWER]?.answer].join(' '),
    );

    expect(new Set(distinguishing).size).toBe(served.length);
  });

  it('shares an answer only where the requirement is genuinely shared', () => {
    // The cost of the checker is a fact about this product, not about a
    // country, and it would be dishonest to phrase it differently per page.
    const us = answersOf(entriesFor('us', 'passport'));
    const uk = answersOf(entriesFor('uk', 'passport'));
    const shared = us.filter((answer) => uk.includes(answer));

    expect(shared).toContain(content.country.faq.costAnswer);
    expect(shared.length).toBeLessThan(us.length / 2);
  });

  it('says how the top of the head is measured, where authorities disagree', () => {
    // The US measures to the top of the hair and the UK to the skull beneath
    // it. On a tall hairstyle that is most of the tolerance, and it is the
    // difference people lose photographs to.
    const us = entriesFor('us', 'passport')[HEAD_ANSWER]?.answer ?? '';
    const uk = entriesFor('uk', 'passport')[HEAD_ANSWER]?.answer ?? '';

    expect(us).toContain('hair');
    expect(uk).toContain('skull');
  });

  it('answers in both units, whichever the authority published', () => {
    const answer = entriesFor('uk', 'passport')[HEAD_ANSWER]?.answer ?? '';

    expect(answer).toMatch(/mm/);
    expect(answer).toMatch(/%/);
  });

  it('answers a two-year window in years', () => {
    // The same reading problem as the table: "24 months" is a number people
    // convert in their head and get wrong.
    const spec = listServableSpecs().find((candidate) => candidate.country === 'us');
    if (spec === undefined) throw new Error('The registry serves no US specification.');

    const entries = buildFaqEntries(
      resolveSpec({ ...spec, maxAgeMonths: 24 }, NOW),
      content,
      DEFAULT_LOCALE,
    );

    expect(entries.some((entry) => entry.answer.includes('2 years'))).toBe(true);
  });

  it('leaves no placeholder unfilled in any served country', () => {
    for (const spec of listServableSpecs()) {
      for (const entry of buildFaqEntries(resolveSpec(spec, NOW), content, DEFAULT_LOCALE)) {
        expect(entry.question).not.toMatch(/\{\w+\}/);
        expect(entry.answer).not.toMatch(/\{\w+\}/);
      }
    }
  });

  it('asks nothing it does not answer', () => {
    // These entries feed FAQPage structured data as well as the visible list.
    // An empty answer there is a promise of content the reader cannot see.
    for (const spec of listServableSpecs()) {
      for (const entry of buildFaqEntries(resolveSpec(spec, NOW), content, DEFAULT_LOCALE)) {
        expect(entry.question.length).toBeGreaterThan(0);
        expect(entry.answer.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('a country that publishes less', () => {
  const entries = buildFaqEntries(resolveSpec(GERMANY_PASSPORT, NOW), content, DEFAULT_LOCALE);

  it('asks no question it cannot answer', () => {
    // Germany publishes no maximum photo age. A pair reading "no maximum is
    // published" puts a non-answer into search results under a question
    // somebody asked hoping for a number.
    const questions = entries.map((entry) => entry.question);

    expect(questions.some((question) => question.includes('recent'))).toBe(false);
  });

  it('still answers the size question, without inventing a digital one', () => {
    const size = entries[0];

    expect(size?.answer).toContain('35');
    expect(size?.answer).toContain('publishes no separate digital size');
  });

  it('leaves no placeholder unfilled', () => {
    for (const entry of entries) {
      expect(entry.question).not.toMatch(/\{\w+\}/);
      expect(entry.answer).not.toMatch(/\{\w+\}/);
    }
  });
});
