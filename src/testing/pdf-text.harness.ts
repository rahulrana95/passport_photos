import { WINANSI_HIGH_RANGE } from '@/report/winansi.constants';

/**
 * Pulls the readable text back out of a PDF.
 *
 * A second, independent implementation on purpose. Asserting that a document
 * contains the bytes we just wrote into it proves only that concatenation
 * works; asserting that text can be got back out the way a reader gets it out
 * is the claim that matters — a report whose text cannot be selected, searched
 * or read aloud is a picture of a report.
 *
 * It reads the file the way a reader does: find the string literals the text
 * operator draws, undo the escaping, and map the bytes back through WinAnsi.
 *
 * It reads files THIS writer produces, and takes one liberty on that basis: a
 * literal ends at the first unescaped closing parenthesis, with no nesting to
 * track, because the writer escapes every parenthesis it emits. A general PDF
 * reader would need the depth counter; a test double that carried one would be
 * carrying two branches nothing in this repository can reach.
 */

const HIGH_RANGE_BY_BYTE = new Map(
  Object.entries(WINANSI_HIGH_RANGE).map(([character, byte]) => [byte, character]),
);

const BACKSLASH = 0x5c;
const OPEN_PARENTHESIS = 0x28;
const CLOSE_PARENTHESIS = 0x29;
/** An escape is the backslash plus the byte it protects. */
const ESCAPE_LENGTH = 2;
/** Enough of what follows a literal to see whether it is drawn. */
const OPERATOR_LOOKAHEAD = 4;

const decodeWinAnsi = (bytes: readonly number[]): string =>
  bytes.map((byte) => HIGH_RANGE_BY_BYTE.get(byte) ?? String.fromCharCode(byte)).join('');

/**
 * Every string literal drawn by a text-showing operator, in document order.
 *
 * Scans the raw file rather than only the streams: this product writes no
 * string literals anywhere else, so anything found here is text a reader
 * would render, and a scanner that had to parse the object graph first would
 * be a second thing that could be wrong.
 */
export const extractPdfText = (pdf: Uint8Array): readonly string[] => {
  const found: string[] = [];
  let index = 0;

  while (index < pdf.length) {
    if (pdf[index] !== OPEN_PARENTHESIS) {
      index += 1;
      continue;
    }

    const literal: number[] = [];
    let cursor = index + 1;

    while (cursor < pdf.length) {
      const byte = Number(pdf[cursor]);

      if (byte === BACKSLASH) {
        literal.push(Number(pdf[cursor + 1]));
        cursor += ESCAPE_LENGTH;
        continue;
      }
      if (byte === CLOSE_PARENTHESIS) break;

      literal.push(byte);
      cursor += 1;
    }

    // Only a literal a text operator actually draws counts. A parenthesis
    // inside the compressed photograph is not text, and it is followed by
    // whatever the next byte of the image happens to be rather than by Tj.
    const follows = String.fromCharCode(...pdf.subarray(cursor + 1, cursor + OPERATOR_LOOKAHEAD));
    if (follows.trimStart().startsWith('Tj')) found.push(decodeWinAnsi(literal));

    index = cursor + 1;
  }

  return found;
};
