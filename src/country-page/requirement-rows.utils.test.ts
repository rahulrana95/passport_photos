import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE } from '@/constants/site.constants';
import { getContent } from '@/content/content.registry';
import { listServableSpecs } from '@/photo-spec/photo-spec.registry';
import { resolveSpec } from '@/photo-spec/photo-spec.utils';
import { buildRequirementRows } from './requirement-rows.utils';
import type { PhotoSpec } from '@/photo-spec/photo-spec.schemas';
import type { RequirementRow } from '@/components/content/RequirementsTable/RequirementsTable.types';
import type { ResolvedPhotoSpec } from '@/photo-spec/photo-spec.types';
import { FRANCE_PASSPORT } from '@/photo-spec/specs/france.spec';
import { US_PASSPORT } from '@/photo-spec/specs/us.spec';
import { GERMANY_PASSPORT } from '@/photo-spec/specs/germany.spec';
import { NETHERLANDS_PASSPORT } from '@/photo-spec/specs/netherlands.spec';

const content = getContent();

/** Fixed, so a row built twice is the same row. */
const NOW = new Date('2026-01-01T00:00:00Z');

const authored = (country: string, document: string): PhotoSpec => {
  const spec = listServableSpecs().find(
    (candidate) => candidate.country === country && candidate.document === document,
  );
  if (spec === undefined) throw new Error(`No servable specification for ${country} ${document}.`);
  return spec;
};

const rowsFor = (
  country: string,
  document: string,
  overrides: Partial<PhotoSpec> = {},
): readonly RequirementRow[] =>
  buildRequirementRows(
    resolveSpec({ ...authored(country, document), ...overrides } as PhotoSpec, NOW),
    content,
    DEFAULT_LOCALE,
  );

const valueOf = (rows: readonly RequirementRow[], label: string): string => {
  const row = rows.find((candidate) => candidate.label === label);
  if (row === undefined) throw new Error(`No row labelled ${label}.`);
  return row.value;
};

const has = (rows: readonly RequirementRow[], label: string): boolean =>
  rows.some((row) => row.label === label);

describe('the requirements table', () => {
  it('states the printed size in millimetres, with the resolution beneath it', () => {
    const rows = rowsFor('us', 'passport');
    const row = rows.find((candidate) => candidate.label === content.country.labels.printSize);

    expect(row?.value).toContain('50.8');
    expect(row?.note).toContain('300');
  });

  it('writes a ten megabyte ceiling as megabytes, not as ten thousand kilobytes', () => {
    // "Up to 9,765.63 kB" is what a binary divisor produces, and it is not a
    // number anybody can compare their file against.
    expect(valueOf(rowsFor('us', 'passport'), content.country.labels.fileSize)).toContain('10 MB');
  });

  it('writes the consular ceiling as the authority publishes it', () => {
    // 240,000 bytes is "240 kB" on the DS-160's own page. A binary divisor
    // would print 234 next to an official 240 and read as our being wrong.
    expect(valueOf(rowsFor('us', 'visa'), content.country.labels.fileSize)).toContain('240 kB');
  });

  it('spells out how recent a photo must be', () => {
    // Intl's short form is "6 mths", which reads as a typo in a sentence.
    expect(valueOf(rowsFor('us', 'passport'), content.country.labels.photoAge)).toContain('months');
  });

  it('writes a two-year window as two years, not twenty-four months', () => {
    // Several authorities publish a two-year window. "Within the last 24
    // months" is the same sentence and nobody reads it the same way.
    const rows = rowsFor('us', 'passport', { maxAgeMonths: 24 });

    expect(valueOf(rows, content.country.labels.photoAge)).toContain('2 years');
  });

  it('says pixels where it means pixels', () => {
    // "600 to 1200 on the longest edge" leaves the reader to guess the unit,
    // and millimetres are the wrong guess on the row above.
    expect(valueOf(rowsFor('us', 'passport'), content.country.labels.digitalSize)).toContain(
      'pixels',
    );
  });

  it('states head height in the unit the authority published', () => {
    // The US publishes a proportion and the UK millimetres. Rewriting either
    // into the other loses the form the reader is comparing against.
    expect(valueOf(rowsFor('us', 'passport'), content.country.labels.headHeight)).toContain('%');
    expect(valueOf(rowsFor('uk', 'passport'), content.country.labels.headHeight)).toContain('mm');
  });

  it('says how the top of the head is measured, which is not the same everywhere', () => {
    const us = rowsFor('us', 'passport');
    const uk = rowsFor('uk', 'passport');
    const noteFor = (rows: readonly RequirementRow[]): string | undefined =>
      rows.find((row) => row.label === content.country.labels.headHeight)?.note;

    expect(noteFor(us)).toBe(content.country.values.crown['visible-top']);
    expect(noteFor(uk)).toBe(content.country.values.crown.skull);
  });

  it('omits the eye line where the authority never published one', () => {
    // A row saying "not specified" is a row a reader will try to satisfy.
    const withoutEyeLine = rowsFor('us', 'passport', { eyeLine: undefined });

    expect(has(rowsFor('us', 'passport'), content.country.labels.eyeLine)).toBe(true);
    expect(has(withoutEyeLine, content.country.labels.eyeLine)).toBe(false);
  });

  it('lists a second accepted size rather than only the first', () => {
    // Several authorities publish a legacy format alongside the current one,
    // and showing one would send somebody to reprint an acceptable photo.
    const rows = rowsFor('us', 'passport', {
      alternativePrintSizes: [{ widthMm: 35, heightMm: 45, dpi: 300 }],
    });
    const note = rows.find((row) => row.label === content.country.labels.printSize)?.note;

    expect(note).toContain('35');
    expect(note).toContain('45');
  });

  it('states a digital minimum on its own where there is no ceiling', () => {
    const rows = rowsFor('uk', 'passport');

    expect(valueOf(rows, content.country.labels.digitalSize)).toContain('At least');
  });

  it('names the file format even where no size ceiling is published', () => {
    const rows = rowsFor('us', 'passport', {
      digital: { minEdgePx: 600, format: 'png' },
    });

    expect(valueOf(rows, content.country.labels.fileSize)).toContain('PNG');
  });

  it('leaves no placeholder unfilled in any served country', () => {
    // A stray "{country}" on a government-requirements page is the kind of
    // defect that survives review because nobody reads every row.
    for (const spec of listServableSpecs()) {
      const rows = buildRequirementRows(
        resolveSpec(spec, NOW) as ResolvedPhotoSpec,
        content,
        DEFAULT_LOCALE,
      );

      for (const row of rows) {
        expect(row.value).not.toMatch(/\{\w+\}/);
        expect(row.note ?? '').not.toMatch(/\{\w+\}/);
      }
    }
  });

  it('describes every specification the product serves', () => {
    // Not a fixture: the real registry. A spec whose shape this builder cannot
    // read would otherwise fail on the page rather than here.
    for (const spec of listServableSpecs()) {
      const rows = buildRequirementRows(resolveSpec(spec, NOW), content, DEFAULT_LOCALE);

      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) expect(row.value.length).toBeGreaterThan(0);
    }
  });
});

describe('a requirement the authority never published', () => {
  const germany = resolveSpec(GERMANY_PASSPORT, NOW);
  const rows = buildRequirementRows(germany, content, DEFAULT_LOCALE);
  const labels = rows.map((row) => row.label);

  it('gets no row rather than a row saying nothing', () => {
    // Germany publishes no pixel requirement, no file limit and no maximum
    // age. A table listing them as unspecified is a table a reader will act on.
    expect(labels).not.toContain(content.country.labels.digitalSize);
    expect(labels).not.toContain(content.country.labels.fileSize);
    expect(labels).not.toContain(content.country.labels.photoAge);
  });

  it('still carries everything the authority did publish', () => {
    expect(labels).toContain(content.country.labels.printSize);
    expect(labels).toContain(content.country.labels.headHeight);
    expect(labels).toContain(content.country.labels.background);
  });

  it('shows no print resolution where none was stated', () => {
    const print = rows.find((row) => row.label === content.country.labels.printSize);

    expect(print?.note).toBeUndefined();
  });

  it('shows the resolution where the authority did state one', () => {
    // The Netherlands publishes 400 dpi, so the note exists and says so.
    const dutch = buildRequirementRows(
      resolveSpec(NETHERLANDS_PASSPORT, NOW),
      content,
      DEFAULT_LOCALE,
    );
    const print = dutch.find((row) => row.label === content.country.labels.printSize);

    expect(print?.note).toContain('400');
  });
});

describe('who may take the photo', () => {
  it('is a row on every country, because it decides whether the rest matters', () => {
    for (const spec of [US_PASSPORT, FRANCE_PASSPORT, GERMANY_PASSPORT]) {
      const rows = buildRequirementRows(resolveSpec(spec, NOW), content, DEFAULT_LOCALE);

      expect(rows.map((row) => row.label)).toContain(content.country.labels.submission);
    }
  });

  it('says plainly that a self-taken photo cannot be submitted', () => {
    const rows = buildRequirementRows(resolveSpec(FRANCE_PASSPORT, NOW), content, DEFAULT_LOCALE);
    const row = rows.find((entry) => entry.label === content.country.labels.submission);

    expect(row?.value).toContain('cannot be submitted');
  });
});
