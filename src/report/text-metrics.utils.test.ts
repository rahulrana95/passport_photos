import { describe, expect, it } from 'vitest';
import { BODY_SIZE_PT } from './pdf-text.constants';
import { measureText, wrapText } from './text-metrics.utils';

const COLUMN_PT = 300;

describe('estimating how wide text sets', () => {
  it('grows with the length of the text', () => {
    expect(measureText('aaaa', BODY_SIZE_PT)).toBeGreaterThan(measureText('aa', BODY_SIZE_PT));
  });

  it('grows with the type size', () => {
    expect(measureText('abc', 20)).toBeGreaterThan(measureText('abc', 10));
  });

  it('makes capitals wider than lowercase', () => {
    expect(measureText('WWWW', BODY_SIZE_PT)).toBeGreaterThan(measureText('wwww', BODY_SIZE_PT));
  });

  it('makes narrow letters narrower', () => {
    expect(measureText('iiii', BODY_SIZE_PT)).toBeLessThan(measureText('oooo', BODY_SIZE_PT));
  });

  it('measures nothing as nothing', () => {
    expect(measureText('', BODY_SIZE_PT)).toBe(0);
  });
});

describe('wrapping to a column', () => {
  it('keeps short text on one line', () => {
    expect(wrapText('Head height', BODY_SIZE_PT, COLUMN_PT)).toEqual(['Head height']);
  });

  it('breaks long text into lines that fit', () => {
    const text =
      'Move a little closer to the camera so that your head is about twenty per cent taller in the frame, then take the photograph again.';
    const lines = wrapText(text, BODY_SIZE_PT, COLUMN_PT);

    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(measureText(line, BODY_SIZE_PT), line).toBeLessThanOrEqual(COLUMN_PT);
    }
  });

  it('loses no words', () => {
    const text = 'one two three four five six seven eight nine ten eleven twelve thirteen';

    expect(wrapText(text, BODY_SIZE_PT, 80).join(' ')).toBe(text);
  });

  it('errs wide, so even a line of capitals fits', () => {
    // Erring narrow costs a line of text running off the edge of a page
    // somebody is about to hand to a government department.
    const lines = wrapText('WWWWW WWWWW WWWWW WWWWW WWWWW WWWWW', BODY_SIZE_PT, COLUMN_PT);

    for (const line of lines) {
      expect(measureText(line, BODY_SIZE_PT)).toBeLessThanOrEqual(COLUMN_PT);
    }
  });

  it('leaves a word longer than the column alone', () => {
    // The specification source is always a URL, and a hyphenated URL is a URL
    // nobody can type back in. It is the one thing allowed to reach the
    // margin.
    const url = 'https://travel.state.gov/content/travel/en/passports/how-apply/photos.html';

    expect(wrapText(url, BODY_SIZE_PT, 60)).toEqual([url]);
  });

  it('has nothing to say about empty text', () => {
    expect(wrapText('', BODY_SIZE_PT, COLUMN_PT)).toEqual([]);
  });

  it('ignores runs of spaces rather than emitting empty lines', () => {
    expect(wrapText('one    two', BODY_SIZE_PT, COLUMN_PT)).toEqual(['one two']);
  });
});
