import {
  AVIF_BRANDS,
  BMP_TAG,
  CONTAINER_TAG_LENGTH,
  GIF_TAG,
  HEIF_BRANDS,
  ISO_BRAND_OFFSET,
  ISO_FILE_TYPE_TAG,
  ISO_TAG_OFFSET,
  JPEG_SIGNATURE,
  PNG_SIGNATURE,
  RIFF_FORM_OFFSET,
  RIFF_TAG,
  TIFF_BIG_ENDIAN_SIGNATURE,
  TIFF_LITTLE_ENDIAN_SIGNATURE,
  WEBP_FORM_TAG,
} from './image-format.constants';
import type { ImageFormat } from './image-format.constants';

/** Reads a run of bytes as ASCII, for the four-character tags these formats use. */
const asciiAt = (bytes: Uint8Array, offset: number, length: number): string => {
  if (offset + length > bytes.length) return '';

  return Array.from(bytes.subarray(offset, offset + length), (byte) =>
    String.fromCharCode(byte),
  ).join('');
};

/** True when the file opens with `tag`, read at byte zero. */
const opensWith = (bytes: Uint8Array, tag: string): boolean =>
  asciiAt(bytes, 0, tag.length) === tag;

const startsWith = (bytes: Uint8Array, signature: readonly number[]): boolean =>
  signature.every((expected, index) => bytes[index] === expected);

/**
 * Identifies a format from the leading bytes of a file.
 *
 * Content, never the extension or the browser-reported MIME type. Both are
 * user-controlled and both lie routinely — a .jpg that is actually a HEIC is
 * the single most common upload on iOS, because that is what happens when
 * someone renames a file to make it "work".
 *
 * Returns undefined rather than guessing. A wrong guess here becomes a decode
 * error much later, with a message that describes the wrong problem.
 */
export const sniffImageFormat = (bytes: Uint8Array): ImageFormat | undefined => {
  if (startsWith(bytes, JPEG_SIGNATURE)) return 'jpeg';
  if (startsWith(bytes, PNG_SIGNATURE)) return 'png';
  if (
    startsWith(bytes, TIFF_LITTLE_ENDIAN_SIGNATURE) ||
    startsWith(bytes, TIFF_BIG_ENDIAN_SIGNATURE)
  ) {
    return 'tiff';
  }
  if (opensWith(bytes, BMP_TAG)) return 'bmp';
  if (opensWith(bytes, GIF_TAG)) return 'gif';

  if (
    opensWith(bytes, RIFF_TAG) &&
    asciiAt(bytes, RIFF_FORM_OFFSET, CONTAINER_TAG_LENGTH) === WEBP_FORM_TAG
  ) {
    return 'webp';
  }

  if (asciiAt(bytes, ISO_TAG_OFFSET, CONTAINER_TAG_LENGTH) === ISO_FILE_TYPE_TAG) {
    const brand = asciiAt(bytes, ISO_BRAND_OFFSET, CONTAINER_TAG_LENGTH);
    if (AVIF_BRANDS.includes(brand)) return 'avif';
    if (HEIF_BRANDS.includes(brand)) return 'heic';
  }

  return undefined;
};
