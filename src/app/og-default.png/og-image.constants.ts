/**
 * The card's own values, written out rather than read from the stylesheet.
 *
 * Satori renders this image and understands neither CSS custom properties nor
 * a stylesheet, so the design tokens cannot reach it. They are duplicated here
 * deliberately and in one place — the alternative is inline literals scattered
 * through the layout, which is what the no-hardcoded-values rule exists to
 * prevent. A token change needs a matching change here; the test asserts the
 * card still renders, and a human still has to look at it.
 */
export const OG_BACKGROUND = '#ffffff';
export const OG_TEXT_PRIMARY = '#1a1a1a';
export const OG_TEXT_MUTED = '#4a4a4a';
export const OG_ACCENT = '#2f6f4e';

export const OG_PADDING_PX = 80;
export const OG_GAP_PX = 24;
export const OG_TITLE_SIZE_PX = 72;
export const OG_CLAIM_SIZE_PX = 40;
export const OG_RULE_WIDTH_PX = 120;
export const OG_RULE_HEIGHT_PX = 8;
