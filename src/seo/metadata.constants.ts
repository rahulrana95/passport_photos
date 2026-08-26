/**
 * Search engines truncate beyond these lengths. Exceeding them does not hurt
 * ranking, but it does mean the reader never sees the end of your sentence —
 * so the factory warns in development rather than failing the build.
 */
export const TITLE_MAX_LENGTH = 60;
export const DESCRIPTION_MIN_LENGTH = 70;
export const DESCRIPTION_MAX_LENGTH = 158;

export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;
export const DEFAULT_OG_IMAGE_PATH = '/og-default.png';

/** The x-default hreflang target, used when no locale matches the visitor. */
export const HREFLANG_DEFAULT = 'x-default';
