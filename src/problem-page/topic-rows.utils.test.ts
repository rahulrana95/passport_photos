import { describe, expect, it } from 'vitest';
import { COUNTRY_NAMES } from '@/constants/country.constants';
import { DEFAULT_LOCALE } from '@/constants/site.constants';
import { getContent } from '@/content/content.registry';
import { listServableSpecs } from '@/photo-spec/photo-spec.registry';
import { backgroundRows, headSizeRows } from './topic-rows.utils';

const content = getContent();
const NOW = new Date('2026-01-01T00:00:00Z');

describe('one requirement across every country', () => {
  it('has a row for every specification that is served', () => {
    // The mirror of a country page. A country missing from the comparison is
    // a country somebody cannot compare against.
    expect(headSizeRows(content, DEFAULT_LOCALE, listServableSpecs(), NOW)).toHaveLength(
      listServableSpecs().length,
    );
    expect(backgroundRows(content, listServableSpecs())).toHaveLength(
      listServableSpecs().length,
    );
  });

  it('names each row by its country and document', () => {
    const rows = headSizeRows(content, DEFAULT_LOCALE, listServableSpecs(), NOW);

    expect(rows.some((row) => row.label === `${COUNTRY_NAMES.us} passport`)).toBe(true);
    expect(rows.some((row) => row.label === `${COUNTRY_NAMES.us} visa`)).toBe(true);
  });

  it('states head height in both units', () => {
    // The authorities publish in different ones, and a reader comparing two
    // countries needs the pair rather than whichever each chose.
    const [row] = headSizeRows(content, DEFAULT_LOCALE, listServableSpecs(), NOW);

    expect(row?.value).toContain('mm');
    expect(row?.note).toContain('%');
  });

  it('says where the top of the head is measured, on every row', () => {
    // The reason the same photograph passes in one country and fails in
    // another. A table of bare numbers would hide the thing the page is for.
    const rows = headSizeRows(content, DEFAULT_LOCALE, listServableSpecs(), NOW);
    const crowns = Object.values(content.country.values.crown);

    for (const row of rows) {
      expect(crowns.some((crown) => (row.note ?? '').includes(crown))).toBe(true);
    }
  });

  it('shows that the background colour is not the same everywhere', () => {
    // The assumption the page exists to correct.
    const values = backgroundRows(content, listServableSpecs()).map((row) => row.value);

    expect(new Set(values).size).toBeGreaterThan(1);
  });

  it('leaves no placeholder unfilled', () => {
    const rows = [
      ...headSizeRows(content, DEFAULT_LOCALE, listServableSpecs(), NOW),
      ...backgroundRows(content, listServableSpecs()),
    ];

    for (const row of rows) {
      expect(row.label).not.toMatch(/\{\w+\}/);
      expect(row.value).not.toMatch(/\{\w+\}/);
      expect(row.note ?? '').not.toMatch(/\{\w+\}/);
    }
  });
});
