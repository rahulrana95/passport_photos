import { MM_PER_INCH, POINTS_PER_INCH } from '@/constants/measurement.constants';
import {
  PDF_BINARY_COMMENT,
  PDF_CATALOG_OBJECT,
  PDF_CONTENTS_OBJECT,
  PDF_IMAGE_OBJECT,
  PDF_OBJECT_COUNT,
  PDF_PAGE_OBJECT,
  PDF_PAGES_OBJECT,
  PDF_PRECISION_DIGITS,
  XREF_FIRST_GENERATION,
  XREF_FREE_GENERATION,
  XREF_GENERATION_DIGITS,
  XREF_OFFSET_DIGITS,
} from './pdf-writer.constants';

/**
 * A PDF holding one photograph sheet, written by hand.
 *
 * NO PDF LIBRARY, and the reason is the JPEG rather than the page size. A PDF
 * can carry JPEG data verbatim — DCTDecode is the JPEG decoder, built into the
 * format — so the sheet this produces contains the exact bytes the encoder
 * produced, with no second compression pass. Every general-purpose library in
 * this space will happily re-encode on the way in, and a photograph compressed
 * twice is a photograph with visible artefacts around the eyes, which is a
 * rejection reason of its own.
 *
 * The rest of the file is five objects and a table. That is genuinely all a
 * single-page image PDF is, and it weighs nothing next to a library in a
 * product whose whole argument is that it runs on the reader's own device.
 *
 * What it deliberately does not do: fonts, transparency, colour profiles,
 * multiple pages, compression of its own. A sheet needs none of them, and each
 * one is a way to write a file that opens in a previewer and fails at a print
 * shop.
 */

export interface JpegPdfPage {
  /** The encoded photograph sheet, embedded without re-compression. */
  readonly jpeg: Uint8Array;
  readonly imageWidthPx: number;
  readonly imageHeightPx: number;
  readonly pageWidthMm: number;
  readonly pageHeightMm: number;
}

const concat = (parts: readonly Uint8Array[]): Uint8Array => {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let cursor = 0;

  for (const part of parts) {
    output.set(part, cursor);
    cursor += part.length;
  }

  return output;
};

const ascii = (text: string): Uint8Array =>
  Uint8Array.from([...text].map((character) => character.charCodeAt(0)));

const points = (millimetres: number): number => (millimetres / MM_PER_INCH) * POINTS_PER_INCH;

const fixed = (value: number): string => value.toFixed(PDF_PRECISION_DIGITS);

const pad = (value: number, digits: number): string => String(value).padStart(digits, '0');

/**
 * Builds a single-page PDF containing one image, filling the page exactly.
 *
 * The page is the sheet's physical size, in points, so a print dialogue set to
 * 100% produces a photograph of the size the specification asks for. That is
 * the only number in this file that a ruler can disagree with, and it is the
 * one the whole feature is for.
 */
export const buildJpegPdf = (page: JpegPdfPage): Uint8Array => {
  const widthPt = points(page.pageWidthMm);
  const heightPt = points(page.pageHeightMm);

  // The image is placed by a transform matrix scaling a unit square to the
  // page. Nothing is positioned inside it: the sheet raster already carries
  // the photographs where they belong, and a second coordinate system to get
  // wrong is a second coordinate system to get wrong.
  const content = `q\n${fixed(widthPt)} 0 0 ${fixed(heightPt)} 0 0 cm\n/Im0 Do\nQ\n`;

  const objects: readonly Uint8Array[] = [
    ascii(`${PDF_CATALOG_OBJECT} 0 obj\n<< /Type /Catalog /Pages ${PDF_PAGES_OBJECT} 0 R >>\nendobj\n`),
    ascii(
      `${PDF_PAGES_OBJECT} 0 obj\n<< /Type /Pages /Kids [${PDF_PAGE_OBJECT} 0 R] /Count 1 >>\nendobj\n`,
    ),
    ascii(
      `${PDF_PAGE_OBJECT} 0 obj\n<< /Type /Page /Parent ${PDF_PAGES_OBJECT} 0 R ` +
        `/MediaBox [0 0 ${fixed(widthPt)} ${fixed(heightPt)}] ` +
        `/Resources << /XObject << /Im0 ${PDF_IMAGE_OBJECT} 0 R >> >> ` +
        `/Contents ${PDF_CONTENTS_OBJECT} 0 R >>\nendobj\n`,
    ),
    ascii(
      `${PDF_CONTENTS_OBJECT} 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`,
    ),
    concat([
      ascii(
        `${PDF_IMAGE_OBJECT} 0 obj\n<< /Type /XObject /Subtype /Image ` +
          `/Width ${page.imageWidthPx} /Height ${page.imageHeightPx} ` +
          `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode ` +
          `/Length ${page.jpeg.length} >>\nstream\n`,
      ),
      page.jpeg,
      ascii('\nendstream\nendobj\n'),
    ]),
  ];

  const header = concat([ascii('%PDF-1.4\n'), Uint8Array.from(PDF_BINARY_COMMENT), ascii('\n')]);

  const offsets: number[] = [];
  let cursor = header.length;
  for (const object of objects) {
    offsets.push(cursor);
    cursor += object.length;
  }

  const entries = [
    `${pad(0, XREF_OFFSET_DIGITS)} ${pad(XREF_FREE_GENERATION, XREF_GENERATION_DIGITS)} f \n`,
    ...offsets.map(
      (offset) =>
        `${pad(offset, XREF_OFFSET_DIGITS)} ${pad(XREF_FIRST_GENERATION, XREF_GENERATION_DIGITS)} n \n`,
    ),
  ].join('');

  const trailer = ascii(
    `xref\n0 ${PDF_OBJECT_COUNT}\n${entries}trailer\n` +
      `<< /Size ${PDF_OBJECT_COUNT} /Root ${PDF_CATALOG_OBJECT} 0 R >>\n` +
      `startxref\n${cursor}\n%%EOF\n`,
  );

  return concat([header, ...objects, trailer]);
};
