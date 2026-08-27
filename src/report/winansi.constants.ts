/**
 * The characters WinAnsi puts between 128 and 159, where Latin-1 has control codes.
 *
 * This range is the entire reason a text encoder is needed rather than a
 * charCodeAt. Our copy is written with typographic punctuation — curly quotes,
 * en and em dashes — and every one of those lives in this range under WinAnsi
 * and nowhere near its Unicode code point. Written naively they emit control
 * characters, and a reader shows a passport applicant a report full of black
 * diamonds.
 */
export const WINANSI_HIGH_RANGE: Readonly<Record<string, number>> = {
  '\u20ac': 0x80,
  '\u201a': 0x82,
  '\u0192': 0x83,
  '\u201e': 0x84,
  '\u2026': 0x85,
  '\u2020': 0x86,
  '\u2021': 0x87,
  '\u02c6': 0x88,
  '\u2030': 0x89,
  '\u0160': 0x8a,
  '\u2039': 0x8b,
  '\u0152': 0x8c,
  '\u017d': 0x8e,
  '\u2018': 0x91,
  '\u2019': 0x92,
  '\u201c': 0x93,
  '\u201d': 0x94,
  '\u2022': 0x95,
  '\u2013': 0x96,
  '\u2014': 0x97,
  '\u02dc': 0x98,
  '\u2122': 0x99,
  '\u0161': 0x9a,
  '\u203a': 0x9b,
  '\u0153': 0x9c,
  '\u017e': 0x9e,
  '\u0178': 0x9f,
};

/** The printable ASCII range, which WinAnsi shares with everything else. */
export const ASCII_FIRST_PRINTABLE = 0x20;
export const ASCII_LAST_PRINTABLE = 0x7e;
/** Latin-1 supplement, which WinAnsi also passes through unchanged. */
export const LATIN1_FIRST = 0xa0;
export const LATIN1_LAST = 0xff;
