/**
 * Byte-level markers that say a file holds more than one frame.
 *
 * Transcribed from each format's specification. Kept apart from the walking
 * logic for the same reason the format signatures are: a file of transcribed
 * constants is reviewed differently from a file of decisions.
 */

/** One more than the largest value a byte can hold. */
export const BYTE_RANGE = 256;

/** GIF89a block introducers. */
export const GIF_EXTENSION_INTRODUCER = 0x21;
export const GIF_IMAGE_SEPARATOR = 0x2c;
export const GIF_TRAILER = 0x3b;

/** Where the logical screen descriptor's packed field sits, and its flags. */
export const GIF_HEADER_LENGTH = 6;
export const GIF_SCREEN_DESCRIPTOR_LENGTH = 7;
export const GIF_PACKED_FIELD_OFFSET = 10;
export const GIF_GLOBAL_COLOUR_TABLE_FLAG = 0x80;
export const GIF_COLOUR_TABLE_SIZE_MASK = 0x07;
/** A colour table holds 2^(n+1) entries of three bytes each. */
export const GIF_COLOUR_TABLE_BASE = 2;
export const GIF_BYTES_PER_COLOUR = 3;

/** An image descriptor's own fields, before its data blocks. */
export const GIF_IMAGE_DESCRIPTOR_LENGTH = 9;
/** An extension block's introducer and its label, before its sub-blocks. */
export const GIF_EXTENSION_HEADER_LENGTH = 2;
export const GIF_LOCAL_COLOUR_TABLE_FLAG = 0x80;
export const GIF_LZW_CODE_SIZE_LENGTH = 1;

/** PNG's animation control chunk. Its presence is what makes a PNG an APNG. */
export const PNG_ANIMATION_CHUNK = 'acTL';
export const PNG_SIGNATURE_LENGTH = 8;
export const PNG_CHUNK_LENGTH_BYTES = 4;
export const PNG_CHUNK_TYPE_BYTES = 4;
export const PNG_CHUNK_CRC_BYTES = 4;
/** Nothing worth reading follows the image data, and a large file ends here. */
export const PNG_IMAGE_DATA_CHUNK = 'IDAT';

/** RIFF/WebP chunk names. ANIM carries the loop count of an animation. */
export const RIFF_HEADER_LENGTH = 12;
export const RIFF_CHUNK_HEADER_LENGTH = 8;
export const WEBP_ANIMATION_CHUNK = 'ANIM';
export const WEBP_EXTENDED_CHUNK = 'VP8X';
/** Bit 1 of the VP8X flags byte marks the file as animated. */
export const WEBP_VP8X_ANIMATION_FLAG = 0x02;
export const WEBP_VP8X_FLAGS_OFFSET = 0;
/** RIFF pads every chunk to an even length. */
export const RIFF_CHUNK_ALIGNMENT = 2;
