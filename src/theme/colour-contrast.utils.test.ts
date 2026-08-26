import { describe, expect, it } from 'vitest';
import {
  contrastRatio,
  parseHexColour,
  relativeLuminance,
  WCAG_AA_NORMAL_TEXT,
} from './colour-contrast.utils';

describe('parseHexColour', () => {
  it('reads a six-digit colour', () => {
    expect(parseHexColour('#1a2b3c')).toEqual([26, 43, 60]);
  });

  it('expands a three-digit shorthand the way CSS does', () => {
    expect(parseHexColour('#fff')).toEqual([255, 255, 255]);
  });

  it('accepts a colour without the leading hash', () => {
    expect(parseHexColour('000000')).toEqual([0, 0, 0]);
  });

  it('refuses anything it cannot parse rather than guessing', () => {
    // Silently returning black would make every contrast assertion pass.
    expect(() => parseHexColour('rebeccapurple')).toThrow(/Not a hex colour/);
    expect(() => parseHexColour('#12345')).toThrow(/Not a hex colour/);
  });
});

describe('relativeLuminance', () => {
  it('puts white at 1 and black at 0', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
  });

  it('uses the low-end linear segment for very dark channels', () => {
    // Below the 0.03928 breakpoint sRGB is linear, not gamma-encoded. Getting
    // this wrong shifts every dark-theme measurement.
    expect(relativeLuminance('#010101')).toBeCloseTo(0.000303527, 7);
  });
});

describe('contrastRatio', () => {
  it('reports the maximum of 21 for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
  });

  it('reports 1 for a colour against itself', () => {
    expect(contrastRatio('#4a7c59', '#4a7c59')).toBeCloseTo(1, 5);
  });

  it('is order-independent, as the specification defines it', () => {
    expect(contrastRatio('#333333', '#ffffff')).toBeCloseTo(
      contrastRatio('#ffffff', '#333333'),
      10,
    );
  });

  it('agrees with a known published value', () => {
    // #777777 on white is 4.48 — the canonical example of a colour that looks
    // fine and misses AA.
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
    expect(contrastRatio('#777777', '#ffffff')).toBeLessThan(WCAG_AA_NORMAL_TEXT);
  });
});
