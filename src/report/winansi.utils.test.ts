import { describe, expect, it } from 'vitest';
import { EN_CONTENT } from '@/content/en.content';
import { encodeWinAnsi, isWinAnsiRepresentable } from './winansi.utils';

const leaves = (tree: object): string[] =>
  Object.values(tree).flatMap((value) =>
    typeof value === 'string' ? [value] : leaves(value as object),
  );

describe('encoding text for a document with no embedded fonts', () => {
  it('passes plain ASCII through unchanged', () => {
    const encoded = encodeWinAnsi('Head height');

    expect(encoded.ok).toBe(true);
    expect(encoded.ok && [...encoded.value.bytes]).toEqual([...'Head height'].map((c) => c.charCodeAt(0)));
  });

  it('maps typographic punctuation to where WinAnsi keeps it', () => {
    // The entire reason this is not a charCodeAt. Our copy is written with
    // curly quotes and en dashes, and every one of those lives between 128
    // and 159 under WinAnsi and nowhere near its Unicode code point. Written
    // naively they emit control characters.
    const encoded = encodeWinAnsi('\u2018a\u2019 \u201cb\u201d \u2013 \u2014');

    expect(encoded.ok).toBe(true);
    if (!encoded.ok) return;
    expect([...encoded.value.bytes]).toEqual([
      0x91, 0x61, 0x92, 0x20, 0x93, 0x62, 0x94, 0x20, 0x96, 0x20, 0x97,
    ]);
  });

  it('passes Latin-1 accents through', () => {
    expect(isWinAnsiRepresentable('Ångström café naïve')).toBe(true);
  });

  it('keeps the original text, so a refusal can name the line', () => {
    const encoded = encodeWinAnsi('Head height');

    expect(encoded.ok && encoded.value.source).toBe('Head height');
  });
});

describe('refusing what it cannot carry', () => {
  it.each([
    ['Japanese', '\u65e5\u672c'],
    ['Devanagari', '\u0928\u093e\u092e'],
    ['Cyrillic', '\u0418\u043c\u044f'],
    ['an emoji', '\u2705'],
  ])('refuses %s rather than writing a black diamond', (_name, text) => {
    // A report that renders a rule as garbage is worse than one that failed to
    // build. The first gets printed and handed to somebody.
    const encoded = encodeWinAnsi(text);

    expect(encoded.ok).toBe(false);
  });

  it('names the character and where it was', () => {
    const encoded = encodeWinAnsi('Head \u65e5 height');

    expect(encoded.ok).toBe(false);
    if (encoded.ok) return;
    expect(encoded.character).toBe('\u65e5');
    expect(encoded.index).toBe(5);
  });
});

describe('the copy this product actually ships', () => {
  it('can be written without embedding a font', () => {
    // The property that makes the whole no-font decision safe. If this ever
    // fails, a locale has grown a character the report cannot set — and this
    // fails before anybody ships it rather than after somebody prints it.
    for (const text of leaves(EN_CONTENT)) {
      expect(isWinAnsiRepresentable(text), text).toBe(true);
    }
  });
});
