import {
  DEFAULT_WIDTH_FACTOR,
  NARROW_CHARACTERS,
  NARROW_WIDTH_FACTOR,
  UPPERCASE_WIDTH_FACTOR,
  WIDE_CHARACTERS,
  WIDE_WIDTH_FACTOR,
} from './pdf-text.constants';

/**
 * An estimate of how wide a string sets, in points.
 *
 * Estimate is the honest word, and the estimate errs wide — see the width
 * factors for why. The only decision it drives is where a line breaks.
 */
export const measureText = (text: string, sizePt: number): number => {
  let factors = 0;

  for (const character of text) {
    if (NARROW_CHARACTERS.includes(character)) factors += NARROW_WIDTH_FACTOR;
    else if (WIDE_CHARACTERS.includes(character)) factors += WIDE_WIDTH_FACTOR;
    else if (character !== character.toLowerCase()) factors += UPPERCASE_WIDTH_FACTOR;
    else factors += DEFAULT_WIDTH_FACTOR;
  }

  return factors * sizePt;
};

/**
 * Breaks text into lines that fit a column.
 *
 * Breaks on spaces only. A word longer than the column — a URL, and the spec
 * source is always a URL — is left long rather than broken mid-word: a
 * hyphenated URL is a URL nobody can follow, and the reader needs to be able
 * to type it in. It is the one thing in this document allowed to reach the
 * margin.
 */
export const wrapText = (text: string, sizePt: number, widthPt: number): readonly string[] => {
  const words = text.split(' ').filter((word) => word.length > 0);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current === '' ? word : `${current} ${word}`;

    if (current !== '' && measureText(candidate, sizePt) > widthPt) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current !== '') lines.push(current);

  return lines;
};
