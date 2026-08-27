import { describe, expect, it } from 'vitest';
import { encodeWinAnsi } from '@/report/winansi.utils';
import { extractPdfText } from '@/testing/pdf-text.harness';
import { buildPdfDocument } from './pdf-document';
import type { PdfItem } from './pdf-document.types';
import type { WinAnsiText } from '@/report/winansi.utils';

const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x28, 0x29, 0x5c, 0xff, 0xd9]);

const proven = (text: string): WinAnsiText => {
  const encoded = encodeWinAnsi(text);
  if (!encoded.ok) throw new Error(`The fixture text must be writable: ${text}`);
  return encoded.value;
};

const textItem = (text: string, yPt = 700): PdfItem => ({
  kind: 'text',
  xPt: 50,
  yPt,
  sizePt: 10,
  font: 'Helvetica',
  text: proven(text),
});

const page = (items: readonly PdfItem[]): { widthPt: number; heightPt: number; items: readonly PdfItem[] } => ({
  widthPt: 595,
  heightPt: 842,
  items,
});

const source = (pdf: Uint8Array): string => String.fromCharCode(...pdf);

const contains = (haystack: Uint8Array, needle: Uint8Array): boolean => {
  for (let start = 0; start + needle.length <= haystack.length; start += 1) {
    if (needle.every((byte, index) => haystack[start + index] === byte)) return true;
  }
  return false;
};

describe('a document with text', () => {
  const pdf = buildPdfDocument({ pages: [page([textItem('Head height')])], images: [] });

  it('is a PDF, marked binary and properly ended', () => {
    expect(source(pdf).startsWith('%PDF-1.4')).toBe(true);
    expect(pdf[10]).toBeGreaterThan(127);
    expect(source(pdf).endsWith('%%EOF\n')).toBe(true);
  });

  it('declares the fonts it uses without embedding them', () => {
    // Not embedding is what keeps this a few kilobytes rather than a few
    // hundred, and Helvetica is one of the fourteen every reader has had
    // since 1993.
    expect(source(pdf)).toContain('/BaseFont /Helvetica /Encoding /WinAnsiEncoding');
    expect(source(pdf)).toContain('/BaseFont /Helvetica-Bold');
  });

  it('has text a reader can actually get back out', () => {
    // The claim that matters. A report whose text cannot be selected,
    // searched or read aloud is a picture of a report.
    expect(extractPdfText(pdf)).toEqual(['Head height']);
  });

  it('omits an image dictionary when there are no images', () => {
    expect(source(pdf)).not.toContain('/XObject');
  });
});

describe('a document with an image', () => {
  const pdf = buildPdfDocument({
    pages: [
      page([{ kind: 'image', xPt: 0, yPt: 0, widthPt: 595, heightPt: 842, image: 0 }]),
    ],
    images: [{ jpeg: JPEG, widthPx: 100, heightPx: 140 }],
  });

  it('carries the photograph byte for byte', () => {
    // A PDF decodes JPEG natively, so nothing is re-compressed on the way in.
    expect(contains(pdf, JPEG)).toBe(true);
  });

  it('declares it as JPEG at its pixel size', () => {
    expect(source(pdf)).toContain('/Filter /DCTDecode');
    expect(source(pdf)).toContain('/Width 100 /Height 140');
  });

  it('finds no text in a page that has none', () => {
    // Also a check on the extractor: a parenthesis inside compressed image
    // data is not a string literal, and this fixture contains one.
    expect(extractPdfText(pdf)).toEqual([]);
  });
});

describe('escaping', () => {
  it('protects the characters that would end a string early', () => {
    const pdf = buildPdfDocument({
      pages: [page([textItem('a (b) c \\ d')])],
      images: [],
    });

    expect(extractPdfText(pdf)).toEqual(['a (b) c \\ d']);
  });

  it('writes high bytes raw rather than as octal', () => {
    // Octal-escaping printable text would triple the size of the document for
    // no reader's benefit.
    const pdf = buildPdfDocument({ pages: [page([textItem('caf\u00e9 \u2014 na\u00efve')])], images: [] });

    expect(extractPdfText(pdf)).toEqual(['caf\u00e9 \u2014 na\u00efve']);
  });
});

describe('several pages', () => {
  const pdf = buildPdfDocument({
    pages: [page([textItem('first')]), page([textItem('second')]), page([textItem('third')])],
    images: [],
  });

  it('counts them', () => {
    expect(source(pdf)).toContain('/Count 3');
  });

  it('lists every page as a child of the page tree', () => {
    expect(source(pdf)).toContain('/Kids [3 0 R 5 0 R 7 0 R]');
  });

  it('keeps their text in order', () => {
    expect(extractPdfText(pdf)).toEqual(['first', 'second', 'third']);
  });
});

describe('the cross-reference table', () => {
  const pdf = buildPdfDocument({
    pages: [page([textItem('one')]), page([textItem('two')])],
    images: [{ jpeg: JPEG, widthPx: 10, heightPx: 10 }],
  });
  const text = source(pdf);

  it('points at where each object actually begins', () => {
    // Readers seek by these offsets. An entry one byte out does not shift the
    // next one, it corrupts every object after it — and the file still opens
    // in a previewer willing to rebuild the table, then fails at a print shop.
    const declared = Number(text.slice(text.indexOf('xref\n0 ') + 'xref\n0 '.length, text.indexOf('\n', text.indexOf('xref\n0 ') + 7)));
    const entries = text.slice(text.indexOf(`xref\n0 ${declared}\n`) + `xref\n0 ${declared}\n`.length);

    for (let object = 1; object < declared; object += 1) {
      const offset = Number(entries.slice(object * 20, object * 20 + 10));
      expect(text.slice(offset, offset + `${object} 0 obj`.length), `object ${object}`).toBe(
        `${object} 0 obj`,
      );
    }
  });

  it('points startxref at the table itself', () => {
    const after = text.slice(text.lastIndexOf('startxref\n') + 'startxref\n'.length);

    expect(text.slice(Number(after.slice(0, after.indexOf('\n'))), Number(after.slice(0, after.indexOf('\n'))) + 4)).toBe('xref');
  });

  it('grows with the objects the document needs', () => {
    // Two pages is four objects — each page and its content stream — plus the
    // catalogue, the page tree, two fonts and one image. Nine, and the table
    // also carries the free-list head.
    expect(text).toContain('/Size 10');
  });
});
