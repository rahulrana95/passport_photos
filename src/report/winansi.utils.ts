import {
  ASCII_FIRST_PRINTABLE,
  ASCII_LAST_PRINTABLE,
  LATIN1_FIRST,
  LATIN1_LAST,
  WINANSI_HIGH_RANGE,
} from './winansi.constants';

/**
 * ENCODING TEXT FOR A PDF THAT EMBEDS NO FONTS.
 *
 * The report is set in Helvetica, one of the fourteen fonts every PDF reader
 * has had since 1993. Not embedding a font is what keeps this document a few
 * kilobytes of text rather than a few hundred, and it is the right trade for a
 * document whose job is to be printed, mailed and filed.
 *
 * The price is a character repertoire: WinAnsi covers Latin, and nothing else.
 * That is survivable ONLY because of a property of this product worth stating
 * plainly — the report contains no text the user supplied. There is no name
 * field, no free-text box, nothing typed. Every word in it comes from the
 * content module and every number from a measurement, so the repertoire is
 * whatever the shipped locale uses.
 *
 * Which makes this function a boundary rather than a formality. The day a
 * locale ships with a character WinAnsi cannot carry, this refuses instead of
 * emitting a black diamond into an official-looking document. A report that
 * renders a rule as garbage is worse than a report that failed to build: the
 * first one gets printed and handed to somebody.
 */

/**
 * Text that has been proven writable without a font.
 *
 * A type rather than a pair of loose values, and the point is that it can only
 * be made by encodeWinAnsi succeeding. The PDF writer accepts nothing else, so
 * the writer has no failure path at all — the one place a character can be
 * refused is the one place text is chosen, and there is no second branch
 * downstream that no input can reach.
 */
export interface WinAnsiText {
  readonly bytes: Uint8Array;
  /** The original, kept for messages about what could not be written. */
  readonly source: string;
}

export interface WinAnsiEncoding {
  readonly ok: true;
  readonly value: WinAnsiText;
}

export interface WinAnsiRefusal {
  readonly ok: false;
  /** The character that has no place in this encoding. */
  readonly character: string;
  readonly index: number;
}

export type WinAnsiResult = WinAnsiEncoding | WinAnsiRefusal;

const byteFor = (character: string): number | undefined => {
  const mapped = WINANSI_HIGH_RANGE[character];
  if (mapped !== undefined) return mapped;

  // Read through Number rather than defaulted. Iterating a string yields
  // whole characters, so there is always a code point here — and an absent one
  // would become NaN, fail both range checks below, and be refused, which is
  // the same answer a guard would have produced through a branch no input can
  // reach.
  const code = Number(character.codePointAt(0));
  const passesThrough =
    (code >= ASCII_FIRST_PRINTABLE && code <= ASCII_LAST_PRINTABLE) ||
    (code >= LATIN1_FIRST && code <= LATIN1_LAST);

  return passesThrough ? code : undefined;
};

export const encodeWinAnsi = (text: string): WinAnsiResult => {
  const bytes: number[] = [];

  for (const [index, character] of [...text].entries()) {
    const byte = byteFor(character);
    if (byte === undefined) return { ok: false, character, index };
    bytes.push(byte);
  }

  return { ok: true, value: { bytes: Uint8Array.from(bytes), source: text } };
};

export interface WinAnsiBatchRefusal extends WinAnsiRefusal {
  /** The whole line the character appeared in, so the copy can be found. */
  readonly source: string;
}

/** True when every character in the text can be written without a font. */
export const isWinAnsiRepresentable = (text: string): boolean => encodeWinAnsi(text).ok;
