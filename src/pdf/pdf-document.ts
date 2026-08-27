import { REPORT_FONTS } from '@/report/pdf-text.constants';
import {
  PDF_BINARY_COMMENT,
  PDF_CATALOG_OBJECT,
  PDF_FIRST_ALLOCATED_OBJECT,
  PDF_OBJECTS_PER_PAGE,
  PDF_PAGES_OBJECT,
  PDF_PRECISION_DIGITS,
  XREF_FIRST_GENERATION,
  XREF_FREE_GENERATION,
  XREF_GENERATION_DIGITS,
  XREF_OFFSET_DIGITS,
} from './pdf-document.constants';
import type { ReportFont } from '@/report/pdf-text.constants';
import type { PdfDocumentSpec, PdfItem, PdfPageSpec } from './pdf-document.types';

/**
 * A PDF writer, written by hand, covering exactly what this product produces.
 *
 * NO LIBRARY, for two reasons that are both about the photograph. A PDF can
 * carry JPEG data verbatim through DCTDecode, so a sheet or a report built
 * this way contains the exact bytes the encoder produced — every
 * general-purpose library in this space will happily re-encode on the way in,
 * and a photograph compressed twice has visible artefacts around the eyes.
 * And the alternative is several hundred kilobytes of dependency in a product
 * whose entire argument is that it runs on the reader's own device.
 *
 * NO EMBEDDED FONTS either. The report is set in Helvetica, which every
 * reader has had since 1993. The price is a Latin-only character repertoire,
 * which is why this accepts only text that has already been proven writable —
 * a WinAnsiText can be made in exactly one place, so the refusal happens where
 * the words are chosen and this writer has no failure path to test.
 *
 * What it deliberately does not do: transparency, colour profiles, outlines,
 * compression of its own, or anything that is not a page of text and pictures.
 * Each of those is a way to write a file that opens in a previewer and fails
 * at a print shop.
 */

const ascii = (text: string): Uint8Array =>
  Uint8Array.from([...text].map((character) => character.charCodeAt(0)));

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

const fixed = (value: number): string => value.toFixed(PDF_PRECISION_DIGITS);

const pad = (value: number, digits: number): string => String(value).padStart(digits, '0');

const fontResourceName = (font: ReportFont): string => `/F${REPORT_FONTS.indexOf(font)}`;

/**
 * A PDF string literal, with the three bytes that would end it escaped.
 *
 * Parentheses and the backslash. Everything else goes in raw, including the
 * high WinAnsi bytes: a stream is binary, and octal-escaping printable text
 * would triple the size of the document for no reader's benefit.
 */
const OPEN_PARENTHESIS = 0x28;
const CLOSE_PARENTHESIS = 0x29;
const BACKSLASH = 0x5c;

const escapeString = (bytes: Uint8Array): Uint8Array => {
  const output: number[] = [];

  for (const byte of bytes) {
    if (byte === OPEN_PARENTHESIS || byte === CLOSE_PARENTHESIS || byte === BACKSLASH) {
      output.push(BACKSLASH);
    }
    output.push(byte);
  }

  return Uint8Array.from(output);
};

const itemStream = (item: PdfItem, imageObjectName: (index: number) => string): Uint8Array =>
  item.kind === 'image'
    ? ascii(
        `q\n${fixed(item.widthPt)} 0 0 ${fixed(item.heightPt)} ${fixed(item.xPt)} ${fixed(item.yPt)} cm\n` +
          `${imageObjectName(item.image)} Do\nQ\n`,
      )
    : concat([
        ascii(
          `BT\n${fontResourceName(item.font)} ${fixed(item.sizePt)} Tf\n` +
            `1 0 0 1 ${fixed(item.xPt)} ${fixed(item.yPt)} Tm\n(`,
        ),
        escapeString(item.text.bytes),
        ascii(') Tj\nET\n'),
      ]);

const pageStream = (page: PdfPageSpec, imageObjectName: (index: number) => string): Uint8Array =>
  concat(page.items.map((item) => itemStream(item, imageObjectName)));

export const buildPdfDocument = (document: PdfDocumentSpec): Uint8Array => {
  const pageCount = document.pages.length;
  const fontBase = PDF_FIRST_ALLOCATED_OBJECT + pageCount * PDF_OBJECTS_PER_PAGE;
  const imageBase = fontBase + REPORT_FONTS.length;
  const imageObjectName = (index: number): string => `/Im${index}`;

  const resources =
    `<< /Font << ${REPORT_FONTS.map((font, index) => `${fontResourceName(font)} ${fontBase + index} 0 R`).join(' ')} >>` +
    (document.images.length === 0
      ? ''
      : ` /XObject << ${document.images.map((_image, index) => `${imageObjectName(index)} ${imageBase + index} 0 R`).join(' ')} >>`) +
    ' >>';

  const objects: Uint8Array[] = [
    ascii(`${PDF_CATALOG_OBJECT} 0 obj\n<< /Type /Catalog /Pages ${PDF_PAGES_OBJECT} 0 R >>\nendobj\n`),
    ascii(
      `${PDF_PAGES_OBJECT} 0 obj\n<< /Type /Pages /Count ${pageCount} /Kids [` +
        document.pages
          .map((_page, index) => `${PDF_FIRST_ALLOCATED_OBJECT + index * PDF_OBJECTS_PER_PAGE} 0 R`)
          .join(' ') +
        `] >>\nendobj\n`,
    ),
  ];

  for (const [index, page] of document.pages.entries()) {
    const pageObject = PDF_FIRST_ALLOCATED_OBJECT + index * PDF_OBJECTS_PER_PAGE;
    const contentObject = pageObject + 1;
    const stream = pageStream(page, imageObjectName);

    objects.push(
      ascii(
        `${pageObject} 0 obj\n<< /Type /Page /Parent ${PDF_PAGES_OBJECT} 0 R ` +
          `/MediaBox [0 0 ${fixed(page.widthPt)} ${fixed(page.heightPt)}] ` +
          `/Resources ${resources} /Contents ${contentObject} 0 R >>\nendobj\n`,
      ),
      concat([
        ascii(`${contentObject} 0 obj\n<< /Length ${stream.length} >>\nstream\n`),
        stream,
        ascii('endstream\nendobj\n'),
      ]),
    );
  }

  for (const [index, font] of REPORT_FONTS.entries()) {
    objects.push(
      ascii(
        `${fontBase + index} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /${font} ` +
          `/Encoding /WinAnsiEncoding >>\nendobj\n`,
      ),
    );
  }

  for (const [index, image] of document.images.entries()) {
    objects.push(
      concat([
        ascii(
          `${imageBase + index} 0 obj\n<< /Type /XObject /Subtype /Image ` +
            `/Width ${image.widthPx} /Height ${image.heightPx} ` +
            `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode ` +
            `/Length ${image.jpeg.length} >>\nstream\n`,
        ),
        image.jpeg,
        ascii('\nendstream\nendobj\n'),
      ]),
    );
  }

  const header = concat([ascii('%PDF-1.4\n'), Uint8Array.from(PDF_BINARY_COMMENT), ascii('\n')]);
  const offsets: number[] = [];
  let cursor = header.length;

  for (const object of objects) {
    offsets.push(cursor);
    cursor += object.length;
  }

  const size = objects.length + 1;
  const entries = [
    `${pad(0, XREF_OFFSET_DIGITS)} ${pad(XREF_FREE_GENERATION, XREF_GENERATION_DIGITS)} f \n`,
    ...offsets.map(
      (offset) =>
        `${pad(offset, XREF_OFFSET_DIGITS)} ${pad(XREF_FIRST_GENERATION, XREF_GENERATION_DIGITS)} n \n`,
    ),
  ].join('');

  const trailer = ascii(
    `xref\n0 ${size}\n${entries}trailer\n<< /Size ${size} /Root ${PDF_CATALOG_OBJECT} 0 R >>\n` +
      `startxref\n${cursor}\n%%EOF\n`,
  );

  return concat([header, ...objects, trailer]);
};
