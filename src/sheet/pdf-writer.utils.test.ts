import { describe, expect, it } from 'vitest';
import { MM_PER_INCH, POINTS_PER_INCH } from '@/constants/measurement.constants';
import { buildJpegPdf } from './pdf-writer.utils';
import { PDF_OBJECT_COUNT } from './pdf-writer.constants';

const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x0a, 0x0d, 0xff, 0xd9]);

const PAGE = {
  jpeg: JPEG,
  imageWidthPx: 1200,
  imageHeightPx: 1800,
  pageWidthMm: 101.6,
  pageHeightMm: 152.4,
};

const text = (bytes: Uint8Array): string => String.fromCharCode(...bytes);

const contains = (haystack: Uint8Array, needle: Uint8Array): number => {
  for (let start = 0; start + needle.length <= haystack.length; start += 1) {
    if (needle.every((byte, index) => haystack[start + index] === byte)) return start;
  }
  return -1;
};

describe('the file a print shop opens', () => {
  const pdf = buildJpegPdf(PAGE);
  const source = text(pdf);

  it('announces itself as a PDF', () => {
    expect(source.startsWith('%PDF-1.4')).toBe(true);
  });

  it('marks itself binary, so nothing rewrites the photograph’s line endings', () => {
    // A comment line — a percent sign — followed by four bytes above 127.
    // Every PDF carries one so that software moving the file treats it as
    // binary rather than helpfully normalising its line endings.
    expect(pdf[9]).toBe('%'.charCodeAt(0));
    for (const index of [10, 11, 12, 13]) {
      expect(pdf[index], `byte ${index}`).toBeGreaterThan(127);
    }
  });

  it('ends where a reader expects to find the end', () => {
    expect(source.endsWith('%%EOF\n')).toBe(true);
  });

  it('is a single page of the sheet’s physical size', () => {
    // A print dialogue set to 100% has to produce a photograph of the size
    // the specification asks for. This is the number a ruler checks.
    const width = ((101.6 / MM_PER_INCH) * POINTS_PER_INCH).toFixed(3);
    const height = ((152.4 / MM_PER_INCH) * POINTS_PER_INCH).toFixed(3);

    expect(source).toContain(`/MediaBox [0 0 ${width} ${height}]`);
    expect(source).toContain('/Count 1');
  });
});

describe('the embedded photograph', () => {
  const pdf = buildJpegPdf(PAGE);
  const source = text(pdf);

  it('is carried as JPEG, decoded by the reader rather than by us', () => {
    expect(source).toContain('/Filter /DCTDecode');
  });

  it('is byte-for-byte the file the encoder produced', () => {
    // The whole reason this is written by hand. A library that re-encoded on
    // the way in would compress the photograph twice, and a photograph
    // compressed twice has visible artefacts around the eyes.
    expect(contains(pdf, JPEG)).toBeGreaterThan(0);
  });

  it('declares the length the reader will use to find the end of the stream', () => {
    expect(source).toContain(`/Length ${JPEG.length}`);
  });

  it('declares the image’s pixel dimensions', () => {
    expect(source).toContain('/Width 1200 /Height 1800');
  });

  it('fills the page exactly', () => {
    const width = ((101.6 / MM_PER_INCH) * POINTS_PER_INCH).toFixed(3);

    expect(source).toContain(`${width} 0 0 `);
    expect(source).toContain('/Im0 Do');
  });
});

describe('the cross-reference table', () => {
  const pdf = buildJpegPdf(PAGE);
  const source = text(pdf);

  it('lists every object, plus the free-list head', () => {
    expect(source).toContain(`xref\n0 ${PDF_OBJECT_COUNT}\n`);
    expect(source).toContain(`/Size ${PDF_OBJECT_COUNT}`);
  });

  it('points at where each object actually begins', () => {
    // Readers seek by these offsets. An entry that is one byte out does not
    // shift the next one, it corrupts every object after it — and the file
    // still opens in a previewer that is willing to rebuild the table, then
    // fails at the shop.
    const xrefAt = source.indexOf('xref\n0 ');
    const entries = source.slice(xrefAt + `xref\n0 ${PDF_OBJECT_COUNT}\n`.length);

    for (let object = 1; object < PDF_OBJECT_COUNT; object += 1) {
      const entry = entries.slice(object * 20, object * 20 + 10);
      const offset = Number(entry);
      expect(source.slice(offset, offset + 6), `object ${object}`).toBe(`${object} 0 ob`);
    }
  });

  it('records the free-list head as generation 65535', () => {
    const xrefAt = source.indexOf('xref\n0 ');
    const entries = source.slice(xrefAt + `xref\n0 ${PDF_OBJECT_COUNT}\n`.length);

    expect(entries.slice(0, 20)).toBe('0000000000 65535 f \n');
  });

  it('points startxref at the table itself', () => {
    const after = source.slice(source.lastIndexOf('startxref\n') + 'startxref\n'.length);
    const declared = Number(after.slice(0, after.indexOf('\n')));

    expect(source.slice(declared, declared + 4)).toBe('xref');
  });

  it('names the catalogue as the document root', () => {
    expect(source).toContain('/Root 1 0 R');
    expect(source).toContain('1 0 obj\n<< /Type /Catalog');
  });
});
