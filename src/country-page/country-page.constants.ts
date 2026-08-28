/**
 * What every document segment ends with, e.g. 'passport-photo'.
 *
 * Written once because two places must agree forever: the route builder that
 * produces the URL and the parser that reads it back. A published URL cannot
 * change without losing whatever ranking it earned, so this constant is as
 * permanent as the country slugs beside it.
 */
export const DOCUMENT_SEGMENT_SUFFIX = '-photo';

/**
 * Decimal, not binary, and that is the point.
 *
 * Every authority that publishes a file-size ceiling publishes it in decimal —
 * the DS-160's "240 KB" is 240,000 bytes. Dividing by 1024 would print 234
 * beside an official page saying 240.
 */
export const BYTES_PER_KB = 1000;
export const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB;

/** Months in a year, for turning a spec's month count into "two years". */
export const MONTHS_PER_YEAR = 12;

/**
 * How many other countries a page links to.
 *
 * Enough to be useful to a reader who landed on the wrong one, few enough that
 * the block does not become the largest thing on the page — a footer of forty
 * links on forty pages is the shape of a link farm, and it dilutes every link.
 */
export const RELATED_COUNTRY_LIMIT = 6;
