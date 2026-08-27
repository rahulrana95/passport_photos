import { describe, expect, it } from 'vitest';
import { EN_CONTENT } from '@/content/en.content';
import { formatAmount, formatBand } from './format-amount.utils';

const FORMATS = EN_CONTENT.rules.formats;
const LOCALE = 'en-GB';

describe('formatting a measured amount', () => {
  it('writes a percentage from the ratio it is stored as', () => {
    // Every percentage in this product is carried as a ratio, so 0.2 is twenty
    // per cent. A value scaled twice would read as 2000%.
    expect(formatAmount(0.2, 'percent', LOCALE, FORMATS)).toContain('20');
    expect(formatAmount(0.2, 'percent', LOCALE, FORMATS)).toContain('%');
  });

  it('writes millimetres and degrees through Intl', () => {
    expect(formatAmount(31.5, 'millimeter', LOCALE, FORMATS)).toContain('mm');
    expect(formatAmount(7, 'degree', LOCALE, FORMATS)).toContain('7');
  });

  it('writes pixels from copy, since no internationalised unit exists', () => {
    expect(formatAmount(140, 'pixel', LOCALE, FORMATS)).toBe('140 px');
  });

  it('follows the reader’s locale rather than a fixed separator', () => {
    // "31,5 mm" is correct in most of Europe and "31.5 mm" is wrong there.
    expect(formatAmount(31.5, 'millimeter', 'de-DE', FORMATS)).toContain('31,5');
  });
});

describe('formatting a requirement', () => {
  it('writes a closed band as a range', () => {
    expect(formatBand({ min: 25.4, max: 34.9 }, 'millimeter', LOCALE, FORMATS)).toBe(
      '25.4 mm to 34.9 mm',
    );
  });

  it('writes an open-topped band as a minimum', () => {
    // "90 px to ∞ px" is arithmetic leaking onto the page. There is no such
    // thing as too much detail between the eyes.
    expect(
      formatBand({ min: 90, max: Number.POSITIVE_INFINITY }, 'pixel', LOCALE, FORMATS),
    ).toBe('at least 90 px');
  });
});
