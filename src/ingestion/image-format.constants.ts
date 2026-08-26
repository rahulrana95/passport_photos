/**
 * Image container formats this product can recognise.
 *
 * Recognising a format is not the same as being able to decode it. HEIC is
 * recognised precisely so it can be refused with useful instructions, which is
 * the difference between losing an iPhone user and keeping one.
 */
export const IMAGE_FORMATS = [
  'jpeg',
  'png',
  'webp',
  'gif',
  'heic',
  'avif',
  'bmp',
  'tiff',
] as const;

export type ImageFormat = (typeof IMAGE_FORMATS)[number];

/**
 * Formats every target browser can decode natively.
 *
 * GIF and BMP are decodable but deliberately absent from the accepted list —
 * see ACCEPTED_IMAGE_MIME_TYPES. A GIF passport photo is a screenshot or a
 * meme, never a camera original, and accepting one produces a measurably worse
 * result than telling the user to send the photo itself.
 */
export const NATIVELY_DECODABLE_FORMATS: readonly ImageFormat[] = [
  'jpeg',
  'png',
  'webp',
  'gif',
  'bmp',
];

/** The MIME type each format is reported as, for messages and for output. */
export const FORMAT_MIME_TYPES: Readonly<Record<ImageFormat, string>> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  avif: 'image/avif',
  bmp: 'image/bmp',
  tiff: 'image/tiff',
};

/**
 * Bytes needed before a format can be identified.
 *
 * Driven by the longest signature that must be read: an ISO base media file
 * puts its brand at offset 8, and the compatible-brand list that follows can
 * matter, so 32 bytes covers every case here with room to spare and costs
 * nothing to read.
 */
export const FORMAT_SNIFF_BYTES = 32;

/**
 * The leading bytes that identify each container.
 *
 * Kept here with the rest of the format data rather than beside the sniffing
 * logic: these are transcribed from format specifications, and a file of
 * transcribed constants is reviewed differently from a file of decisions.
 */
export const JPEG_SIGNATURE = [0xff, 0xd8, 0xff] as const;
export const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;
export const TIFF_LITTLE_ENDIAN_SIGNATURE = [0x49, 0x49, 0x2a, 0x00] as const;
export const TIFF_BIG_ENDIAN_SIGNATURE = [0x4d, 0x4d, 0x00, 0x2a] as const;

/** ASCII tags read at a fixed offset rather than matched from byte zero. */
export const BMP_TAG = 'BM';
export const GIF_TAG = 'GIF';
export const RIFF_TAG = 'RIFF';
export const WEBP_FORM_TAG = 'WEBP';
export const ISO_FILE_TYPE_TAG = 'ftyp';

/** Offsets within an ISO base media file and a RIFF container. */
export const ISO_TAG_OFFSET = 4;
export const ISO_BRAND_OFFSET = 8;
export const RIFF_FORM_OFFSET = 8;
export const CONTAINER_TAG_LENGTH = 4;

/**
 * ISO base media brands that mean a still image rather than video.
 *
 * mif1 and msf1 are the generic image and image-sequence brands. An iPhone
 * photo can carry either, and treating them as unknown refuses a file the user
 * can plainly see is a photograph.
 */
export const HEIF_BRANDS: readonly string[] = [
  'heic',
  'heix',
  'hevc',
  'heim',
  'heis',
  'hevm',
  'hevs',
  'mif1',
  'msf1',
];

export const AVIF_BRANDS: readonly string[] = ['avif', 'avis'];
