/**
 * RGBA byte layout, shared by the generator and the measurement helpers so the
 * two cannot disagree about how a pixel is addressed.
 */
export const CHANNELS_PER_PIXEL = 4;

export const CHANNEL_OFFSET_RED = 0;
export const CHANNEL_OFFSET_GREEN = 1;
export const CHANNEL_OFFSET_BLUE = 2;
export const CHANNEL_OFFSET_ALPHA = 3;

export const CHANNEL_MIN = 0;
export const CHANNEL_MAX = 255;
export const ALPHA_OPAQUE = 255;

/** An ellipse's semi-axis is half its extent. Named so the intent is legible. */
export const HALF = 2;
