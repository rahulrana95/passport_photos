const HEX_RADIX = 16;
const SHORT_HEX_LENGTH = 3;
const CHANNEL_HEX_LENGTH = 2;
const CHANNEL_MAX = 255;

/** Coefficients and constants from WCAG 2.2, relative luminance and contrast. */
const SRGB_LINEAR_THRESHOLD = 0.03928;
const SRGB_LINEAR_DIVISOR = 12.92;
const SRGB_GAMMA_OFFSET = 0.055;
const SRGB_GAMMA_DIVISOR = 1.055;
const SRGB_GAMMA_EXPONENT = 2.4;
const LUMINANCE_RED_WEIGHT = 0.2126;
const LUMINANCE_GREEN_WEIGHT = 0.7152;
const LUMINANCE_BLUE_WEIGHT = 0.0722;
const CONTRAST_OFFSET = 0.05;

/** WCAG 2.2 AA, normal-size text. Large text is 3:1, which nothing here relies on. */
export const WCAG_AA_NORMAL_TEXT = 4.5;

const expandShorthand = (digits: string): string =>
  digits.length === SHORT_HEX_LENGTH
    ? digits
        .split('')
        .map((character) => character.repeat(CHANNEL_HEX_LENGTH))
        .join('')
    : digits;

/** Parses #rgb or #rrggbb. Throws rather than guessing at anything else. */
export const parseHexColour = (colour: string): readonly [number, number, number] => {
  const digits = expandShorthand(colour.trim().replace('#', ''));

  if (!/^[0-9a-f]{6}$/i.test(digits)) {
    throw new Error(`Not a hex colour: ${colour}`);
  }

  const channel = (index: number): number =>
    Number.parseInt(digits.slice(index, index + CHANNEL_HEX_LENGTH), HEX_RADIX);

  return [channel(0), channel(CHANNEL_HEX_LENGTH), channel(CHANNEL_HEX_LENGTH * 2)];
};

const toLinear = (channel: number): number => {
  const normalised = channel / CHANNEL_MAX;

  return normalised <= SRGB_LINEAR_THRESHOLD
    ? normalised / SRGB_LINEAR_DIVISOR
    : ((normalised + SRGB_GAMMA_OFFSET) / SRGB_GAMMA_DIVISOR) ** SRGB_GAMMA_EXPONENT;
};

export const relativeLuminance = (colour: string): number => {
  const [red, green, blue] = parseHexColour(colour).map(toLinear) as [number, number, number];

  return (
    LUMINANCE_RED_WEIGHT * red + LUMINANCE_GREEN_WEIGHT * green + LUMINANCE_BLUE_WEIGHT * blue
  );
};

/**
 * WCAG contrast ratio between two colours, from 1 to 21.
 *
 * Order-independent, as the specification defines it: the lighter colour is
 * always the numerator.
 */
export const contrastRatio = (first: string, second: string): number => {
  const a = relativeLuminance(first);
  const b = relativeLuminance(second);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);

  return (lighter + CONTRAST_OFFSET) / (darker + CONTRAST_OFFSET);
};
