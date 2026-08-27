/**
 * JPEG markers, named.
 *
 * Every one of these is transcribed from the JPEG specification's marker
 * table. That is exactly why they belong in a constants file rather than as
 * literals inside a walker: 0xda is meaningless and SOS_MARKER is not.
 */

export const MARKER_PREFIX = 0xff;
export const SOI_MARKER = 0xd8;
export const EOI_MARKER = 0xd9;
export const APP0_MARKER = 0xe0;
export const APP1_MARKER = 0xe1;
/** Start of scan. Everything after it is entropy-coded data, not segments. */
export const SOS_MARKER = 0xda;

/** A segment's length field counts itself. */
export const SEGMENT_LENGTH_BYTES = 2;
/** The two bytes of a marker: the 0xff prefix and the marker itself. */
export const MARKER_BYTES = 2;

export const JFIF_IDENTIFIER = 'JFIF\u0000';
export const EXIF_IDENTIFIER = 'Exif\u0000\u0000';

/**
 * Offsets within a JFIF APP0 payload, counted from the first byte after the
 * length field.
 *
 *   0..4   identifier "JFIF\0"
 *   5..6   version, major then minor
 *   7      density units
 *   8..9   horizontal density
 *   10..11 vertical density
 *   12..13 thumbnail width and height
 */
export const JFIF_UNITS_OFFSET = 7;
export const JFIF_X_DENSITY_OFFSET = 8;
export const JFIF_Y_DENSITY_OFFSET = 10;
export const JFIF_PAYLOAD_BYTES = 14;

/**
 * What the density numbers mean.
 *
 * Zero is the value libjpeg writes by default, and it is the one that gets
 * photographs rejected: it says the two numbers are an aspect ratio and carry
 * no physical size at all. A 600x600 file with units 0 prints at whatever size
 * the receiving software guesses.
 */
export const JFIF_UNITS_NONE = 0;
export const JFIF_UNITS_PER_INCH = 1;
export const JFIF_UNITS_PER_CENTIMETRE = 2;

export const JFIF_VERSION_MAJOR = 1;
export const JFIF_VERSION_MINOR = 2;

/** The comment marker. Its payload is arbitrary, which is what a fake needs. */
export const COMMENT_MARKER = 0xfe;

/** A segment's length field is sixteen bits wide, and it counts itself. */
export const MAX_SEGMENT_LENGTH = 0xffff;

/** Splitting a sixteen-bit value into two bytes, big-endian as JPEG is. */
export const BYTE_MASK = 0xff;
export const BYTE_SHIFT = 8;
