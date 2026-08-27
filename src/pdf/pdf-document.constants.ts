/**
 * The shape of a PDF cross-reference table, which is unforgiving.
 *
 * Every entry is exactly twenty bytes — a ten-digit offset, a space, a
 * five-digit generation number, a space, one letter, then two more bytes of
 * end-of-line. Readers seek into this table by multiplying, so an entry one
 * byte short does not shift the next entry, it corrupts every entry after it.
 */
export const XREF_OFFSET_DIGITS = 10;
export const XREF_GENERATION_DIGITS = 5;
/** The generation number of an object that has never been superseded. */
export const XREF_FIRST_GENERATION = 0;
/** The free-list head, which every file has and which points nowhere. */
export const XREF_FREE_GENERATION = 65535;

/**
 * The two objects every document has, at fixed numbers.
 *
 * Everything after them is allocated as the document is laid out — two objects
 * per page, then a font, then one per image — so the numbers cannot be
 * constants. These two can be, and being able to write /Root 1 0 R without
 * looking it up is worth the pair.
 */
export const PDF_CATALOG_OBJECT = 1;
export const PDF_PAGES_OBJECT = 2;
export const PDF_FIRST_ALLOCATED_OBJECT = 3;

/** Two objects per page: the page itself and the stream of its content. */
export const PDF_OBJECTS_PER_PAGE = 2;

/** Coordinates are written to this many places. A tenth of a point is 35 microns. */
export const PDF_PRECISION_DIGITS = 3;

/**
 * Four bytes above 127, directly after the header.
 *
 * Every PDF carries them. They exist so that software moving the file — mail
 * gateways, version control, anything with an opinion about line endings —
 * sees it as binary and does not helpfully rewrite the carriage returns inside
 * the embedded photograph.
 */
export const PDF_BINARY_COMMENT = [0x25, 0xe2, 0xe3, 0xcf, 0xd3];
