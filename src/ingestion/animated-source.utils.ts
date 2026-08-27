import {
  BYTE_RANGE,
  GIF_BYTES_PER_COLOUR,
  GIF_COLOUR_TABLE_BASE,
  GIF_COLOUR_TABLE_SIZE_MASK,
  GIF_EXTENSION_INTRODUCER,
  GIF_GLOBAL_COLOUR_TABLE_FLAG,
  GIF_HEADER_LENGTH,
  GIF_EXTENSION_HEADER_LENGTH,
  GIF_IMAGE_DESCRIPTOR_LENGTH,
  GIF_IMAGE_SEPARATOR,
  GIF_LOCAL_COLOUR_TABLE_FLAG,
  GIF_LZW_CODE_SIZE_LENGTH,
  GIF_PACKED_FIELD_OFFSET,
  GIF_SCREEN_DESCRIPTOR_LENGTH,
  GIF_TRAILER,
  PNG_ANIMATION_CHUNK,
  PNG_CHUNK_CRC_BYTES,
  PNG_CHUNK_LENGTH_BYTES,
  PNG_CHUNK_TYPE_BYTES,
  PNG_IMAGE_DATA_CHUNK,
  PNG_SIGNATURE_LENGTH,
  RIFF_CHUNK_ALIGNMENT,
  RIFF_CHUNK_HEADER_LENGTH,
  RIFF_HEADER_LENGTH,
  WEBP_ANIMATION_CHUNK,
  WEBP_EXTENDED_CHUNK,
  WEBP_VP8X_ANIMATION_FLAG,
  WEBP_VP8X_FLAGS_OFFSET,
} from './animated-source.constants';
import type { ImageFormat } from './image-format.constants';

/**
 * Whether a file holds more than one frame.
 *
 * IT MUST BE ANSWERED FROM THE BYTES. createImageBitmap hands back a single
 * frame from an animation without complaint, so a decoder that did not look
 * would silently analyse frame one of a GIF and report on a photograph the
 * reader never chose. The ingestion pipeline already has a refusal for this;
 * nothing could produce it until now.
 *
 * Each format is walked rather than scanned for a marker. A substring search
 * for "ANIM" or "acTL" finds those letters inside compressed image data too,
 * and a false positive here refuses a perfectly good still.
 */

/**
 * A chunk type, read as characters.
 *
 * No bounds guard, because there is nothing for one to do: both callers only
 * reach here having checked the whole header fits, and `subarray` clamps
 * anyway — a short read gives a short string, which can never equal a
 * four-character chunk name. A guard here would be a branch no input can take.
 */
const asciiAt = (bytes: Uint8Array, offset: number, length: number): string =>
  Array.from(bytes.subarray(offset, offset + length), (byte) =>
    String.fromCharCode(byte),
  ).join('');

const byteAt = (bytes: Uint8Array, offset: number): number => Number(bytes[offset]);

/**
 * Reads an unsigned integer, accumulated rather than shifted.
 *
 * Multiplication keeps the result a positive number. A shift would make it a
 * signed 32-bit one, so a chunk length above two gigabytes — which a corrupt
 * file can easily claim — comes back negative and walks the reader backwards
 * through the file for as long as the loop will let it.
 */
const uintBigEndian = (bytes: Uint8Array, offset: number, length: number): number => {
  let value = 0;
  for (let index = 0; index < length; index += 1) {
    value = value * BYTE_RANGE + byteAt(bytes, offset + index);
  }
  return value;
};

const uintLittleEndian = (bytes: Uint8Array, offset: number, length: number): number => {
  let value = 0;
  for (let index = length - 1; index >= 0; index -= 1) {
    value = value * BYTE_RANGE + byteAt(bytes, offset + index);
  }
  return value;
};

/** Skips a run of length-prefixed sub-blocks, which is how GIF stores data. */
const skipSubBlocks = (bytes: Uint8Array, start: number): number => {
  let offset = start;

  while (offset < bytes.length) {
    const size = byteAt(bytes, offset);
    offset += 1;
    if (size === 0) return offset;
    offset += size;
  }

  return offset;
};

const colourTableBytes = (packed: number): number =>
  GIF_BYTES_PER_COLOUR * GIF_COLOUR_TABLE_BASE ** ((packed & GIF_COLOUR_TABLE_SIZE_MASK) + 1);

/**
 * Counts a GIF's image descriptors, stopping as soon as a second is found.
 *
 * The whole block structure has to be walked because an image separator byte,
 * 0x2C, occurs constantly inside compressed pixel data. Counting occurrences
 * of it would call almost every still GIF an animation.
 */
const gifIsAnimated = (bytes: Uint8Array): boolean => {
  const packed = byteAt(bytes, GIF_PACKED_FIELD_OFFSET);
  let offset = GIF_HEADER_LENGTH + GIF_SCREEN_DESCRIPTOR_LENGTH;
  if ((packed & GIF_GLOBAL_COLOUR_TABLE_FLAG) !== 0) offset += colourTableBytes(packed);

  let images = 0;

  while (offset < bytes.length) {
    const introducer = byteAt(bytes, offset);

    if (introducer === GIF_TRAILER) return false;

    if (introducer === GIF_EXTENSION_INTRODUCER) {
      // Introducer, label, then length-prefixed sub-blocks.
      offset = skipSubBlocks(bytes, offset + GIF_EXTENSION_HEADER_LENGTH);
      continue;
    }

    if (introducer !== GIF_IMAGE_SEPARATOR) return false;

    images += 1;
    if (images > 1) return true;

    const localPacked = byteAt(bytes, offset + GIF_IMAGE_DESCRIPTOR_LENGTH);
    offset += 1 + GIF_IMAGE_DESCRIPTOR_LENGTH;
    if ((localPacked & GIF_LOCAL_COLOUR_TABLE_FLAG) !== 0) offset += colourTableBytes(localPacked);
    offset = skipSubBlocks(bytes, offset + GIF_LZW_CODE_SIZE_LENGTH);
  }

  return false;
};

/**
 * Looks for PNG's animation control chunk.
 *
 * The specification requires acTL to appear before the first IDAT, so the walk
 * stops there — which also means it never reads the megabytes of image data
 * that follow.
 */
const pngIsAnimated = (bytes: Uint8Array): boolean => {
  let offset = PNG_SIGNATURE_LENGTH;

  while (offset + PNG_CHUNK_LENGTH_BYTES + PNG_CHUNK_TYPE_BYTES <= bytes.length) {
    const length = uintBigEndian(bytes, offset, PNG_CHUNK_LENGTH_BYTES);
    const type = asciiAt(bytes, offset + PNG_CHUNK_LENGTH_BYTES, PNG_CHUNK_TYPE_BYTES);

    if (type === PNG_ANIMATION_CHUNK) return true;
    if (type === PNG_IMAGE_DATA_CHUNK) return false;

    offset += PNG_CHUNK_LENGTH_BYTES + PNG_CHUNK_TYPE_BYTES + length + PNG_CHUNK_CRC_BYTES;
  }

  return false;
};

/**
 * Walks a RIFF container for the markers an animated WebP carries.
 *
 * Either is enough. VP8X states the file's capabilities in a flags byte and
 * ANIM carries the loop count; a file with one and not the other is malformed,
 * and treating it as animated is the safer reading of a malformed animation.
 */
const webpIsAnimated = (bytes: Uint8Array): boolean => {
  let offset = RIFF_HEADER_LENGTH;

  while (offset + RIFF_CHUNK_HEADER_LENGTH <= bytes.length) {
    const type = asciiAt(bytes, offset, PNG_CHUNK_TYPE_BYTES);
    const length = uintLittleEndian(
      bytes,
      offset + PNG_CHUNK_TYPE_BYTES,
      PNG_CHUNK_LENGTH_BYTES,
    );
    const payload = offset + RIFF_CHUNK_HEADER_LENGTH;

    if (type === WEBP_ANIMATION_CHUNK) return true;

    if (type === WEBP_EXTENDED_CHUNK) {
      const flags = byteAt(bytes, payload + WEBP_VP8X_FLAGS_OFFSET);
      if ((flags & WEBP_VP8X_ANIMATION_FLAG) !== 0) return true;
    }

    // Chunks are padded to an even length, and forgetting that walks the
    // reader half a byte out of step for the rest of the file.
    offset = payload + length + (length % RIFF_CHUNK_ALIGNMENT);
  }

  return false;
};

/**
 * Formats that can hold an animation. Everything else is a still by
 * construction, and asking the question of a JPEG would be a walk that always
 * returns the same answer.
 */
const DETECTORS: Partial<Record<ImageFormat, (bytes: Uint8Array) => boolean>> = {
  gif: gifIsAnimated,
  png: pngIsAnimated,
  webp: webpIsAnimated,
};

export const isAnimatedSource = (bytes: Uint8Array, format: ImageFormat): boolean =>
  DETECTORS[format]?.(bytes) ?? false;
