/**
 * Type sizes and the shape of the page.
 *
 * A4 because the report is filed and mailed rather than printed on photo
 * paper, and because a document that comes out of a European printer at the
 * wrong size is the same class of annoyance this product exists to remove.
 */
export const REPORT_PAGE_WIDTH_MM = 210;
export const REPORT_PAGE_HEIGHT_MM = 297;
export const REPORT_MARGIN_MM = 18;

export const TITLE_SIZE_PT = 18;
export const HEADING_SIZE_PT = 12;
export const BODY_SIZE_PT = 10;
export const SMALL_SIZE_PT = 8;

/** Multiplied by the type size to get the distance between baselines. */
export const LINE_HEIGHT_FACTOR = 1.35;

/** The two standard fonts this document uses, named as a PDF names them. */
export const REPORT_FONTS = ['Helvetica', 'Helvetica-Bold'] as const;

export type ReportFont = (typeof REPORT_FONTS)[number];

/**
 * HOW WIDE A CHARACTER IS, ESTIMATED BY CLASS RATHER THAN LOOKED UP.
 *
 * Helvetica's real metrics are a table of 224 numbers. Transcribing them by
 * hand into a file that claims to be exact is a way to be precisely wrong in
 * one entry nobody notices, and nothing in this document is justified or
 * kerned — the only thing the measurement decides is where a line wraps.
 *
 * So these are deliberate over-estimates, grouped by shape. Erring wide costs
 * a line that wraps a word early. Erring narrow costs a line of text running
 * off the edge of a page somebody is about to hand to a government
 * department, which is not a trade worth the tighter setting.
 */
export const NARROW_CHARACTERS = 'ijlItfr.,:;\'`!|()[]{}-';
export const WIDE_CHARACTERS = 'mMWQ@%&';

export const NARROW_WIDTH_FACTOR = 0.32;
export const WIDE_WIDTH_FACTOR = 0.92;
export const UPPERCASE_WIDTH_FACTOR = 0.75;
export const DEFAULT_WIDTH_FACTOR = 0.56;

/** Space left after each kind of block, in points. */
export const SECTION_GAP_PT = 14;
export const BLOCK_GAP_PT = 8;
export const LINE_GAP_PT = 3;

/** How far a rule's detail lines sit in from the label above them. */
export const DETAIL_INDENT_PT = 12;

/** The annotated photograph is given at most this much of the first page. */
export const PHOTO_MAX_WIDTH_PT = 200;
export const PHOTO_MAX_HEIGHT_PT = 260;
