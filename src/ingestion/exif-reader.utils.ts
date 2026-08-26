import { DEFAULT_ORIENTATION, isExifOrientation } from './exif-orientation.utils';
import type { ExifOrientation } from './exif-orientation.types';

const MARKER_PREFIX = 0xff;
const SOI_MARKER = 0xd8;
const APP1_MARKER = 0xe1;
const SOS_MARKER = 0xda;

const BYTE = 1;
const SHORT = 2;
const LONG = 4;

/** The APP1 payload begins "Exif" followed by two NUL bytes. */
const EXIF_HEADER = 'Exif\u0000\u0000';
const EXIF_HEADER_LENGTH = 6;
const SEGMENT_LENGTH_BYTES = 2;

const TIFF_LITTLE_ENDIAN_MARK = 0x4949;
const TIFF_BIG_ENDIAN_MARK = 0x4d4d;
const TIFF_MAGIC = 42;

const IFD_ENTRY_BYTES = 12;
const IFD_ENTRY_COUNT_BYTES = 2;
const IFD_VALUE_OFFSET = 8;

const TAG_ORIENTATION = 0x0112;
const TAG_DATE_TIME = 0x0132;
const TAG_EXIF_IFD_POINTER = 0x8769;
const TAG_DATE_TIME_ORIGINAL = 0x9003;

const TYPE_ASCII = 2;

/** "YYYY:MM:DD HH:MM:SS" — nineteen characters, then a NUL. */
const EXIF_DATE_LENGTH = 19;

const DECIMAL_RADIX = 10;
const BYTE_SHIFT = 8;
const WORD_SHIFT = 16;
const TRIPLE_SHIFT = 24;
const MONTH_INDEX_OFFSET = 1;

export interface ExifData {
  readonly orientation: ExifOrientation;
  readonly capturedAt?: Date;
}

const asciiAt = (bytes: Uint8Array, offset: number, length: number): string | undefined => {
  if (offset < 0 || offset + length > bytes.length) return undefined;

  // Mapped over a subarray rather than indexed. Indexing is optional under
  // noUncheckedIndexedAccess, which would add a per-byte absence check the
  // bounds test above has already ruled out — an unreachable branch in the
  // hottest loop in the file.
  return Array.from(bytes.subarray(offset, offset + length), (byte) =>
    String.fromCharCode(byte),
  ).join('');
};

const readUint16 = (
  bytes: Uint8Array,
  offset: number,
  littleEndian: boolean,
): number | undefined => {
  const first = bytes[offset];
  const second = bytes[offset + BYTE];
  if (first === undefined || second === undefined) return undefined;

  return littleEndian ? (second << BYTE_SHIFT) | first : (first << BYTE_SHIFT) | second;
};

const readUint32 = (
  bytes: Uint8Array,
  offset: number,
  littleEndian: boolean,
): number | undefined => {
  const a = bytes[offset];
  const b = bytes[offset + BYTE];
  const c = bytes[offset + SHORT];
  const d = bytes[offset + SHORT + BYTE];
  if (a === undefined || b === undefined || c === undefined || d === undefined) return undefined;

  const value = littleEndian
    ? (d << TRIPLE_SHIFT) | (c << WORD_SHIFT) | (b << BYTE_SHIFT) | a
    : (a << TRIPLE_SHIFT) | (b << WORD_SHIFT) | (c << BYTE_SHIFT) | d;

  // The shifts above produce a signed 32-bit result; TIFF offsets are unsigned.
  return value >>> 0;
};

/**
 * EXIF timestamps carry no time zone, so they are read as local time.
 *
 * That is what the camera recorded and what the person holding it would say the
 * time was. Reading them as UTC would move a photo taken this morning into
 * yesterday for everyone west of Greenwich.
 */
const EXIF_DATE_PATTERN = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;

export const parseExifDate = (stamp: string): Date | undefined => {
  // NUL first, then whitespace. The field is fixed-width and NUL-padded, and
  // String.trim does not treat NUL as whitespace — so trimming alone leaves a
  // terminator on the end and the pattern never matches.
  const match = EXIF_DATE_PATTERN.exec(stamp.replace(/\u0000+$/, '').trim());
  if (match === null) return undefined;

  const [year, month, day, hour, minute, second] = match
    .slice(1)
    .map((part) => Number.parseInt(part, DECIMAL_RADIX)) as [
    number,
    number,
    number,
    number,
    number,
    number,
  ];

  const date = new Date(year, month - MONTH_INDEX_OFFSET, day, hour, minute, second);

  // A camera with a dead clock writes 0000:00:00, and some write a day that
  // does not exist. Round-tripping catches both without a calendar table.
  return date.getFullYear() === year &&
    date.getMonth() === month - MONTH_INDEX_OFFSET &&
    date.getDate() === day
    ? date
    : undefined;
};

interface IfdFields {
  readonly orientation: ExifOrientation;
  readonly dateTime?: string;
  readonly dateTimeOriginal?: string;
  readonly exifIfdPointer?: number;
}

const readIfd = (
  bytes: Uint8Array,
  tiffStart: number,
  ifdStart: number,
  littleEndian: boolean,
): IfdFields => {
  const entryCount = readUint16(bytes, ifdStart, littleEndian);
  if (entryCount === undefined) return { orientation: DEFAULT_ORIENTATION };

  // Entry fields are read through a DataView because the loop below proves
  // each entry lies inside the buffer before reading it. The optional readers
  // above exist for offsets that have not been checked; using them here would
  // add absence branches that the bounds test makes unreachable.
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  let orientation: ExifOrientation = DEFAULT_ORIENTATION;
  let dateTime: string | undefined;
  let dateTimeOriginal: string | undefined;
  let exifIfdPointer: number | undefined;

  for (let index = 0; index < entryCount; index += 1) {
    const entry = ifdStart + IFD_ENTRY_COUNT_BYTES + index * IFD_ENTRY_BYTES;
    if (entry + IFD_ENTRY_BYTES > bytes.length) break;

    const tag = view.getUint16(entry, littleEndian);
    const type = view.getUint16(entry + SHORT, littleEndian);

    if (tag === TAG_ORIENTATION) {
      const value = view.getUint16(entry + IFD_VALUE_OFFSET, littleEndian);
      if (isExifOrientation(value)) orientation = value;
    } else if (tag === TAG_EXIF_IFD_POINTER) {
      exifIfdPointer = view.getUint32(entry + IFD_VALUE_OFFSET, littleEndian);
    } else if ((tag === TAG_DATE_TIME || tag === TAG_DATE_TIME_ORIGINAL) && type === TYPE_ASCII) {
      const valueOffset = view.getUint32(entry + IFD_VALUE_OFFSET, littleEndian);
      const text = asciiAt(bytes, tiffStart + valueOffset, EXIF_DATE_LENGTH);

      if (text !== undefined) {
        if (tag === TAG_DATE_TIME) dateTime = text;
        else dateTimeOriginal = text;
      }
    }
  }

  return {
    orientation,
    ...(dateTime === undefined ? {} : { dateTime }),
    ...(dateTimeOriginal === undefined ? {} : { dateTimeOriginal }),
    ...(exifIfdPointer === undefined ? {} : { exifIfdPointer }),
  };
};

/** Locates the TIFF header inside the APP1 Exif segment, if the file has one. */
const findExifSegment = (bytes: Uint8Array): number | undefined => {
  if (bytes[0] !== MARKER_PREFIX || bytes[1] !== SOI_MARKER) return undefined;

  let offset = SEGMENT_LENGTH_BYTES;

  while (offset + SEGMENT_LENGTH_BYTES * SHORT <= bytes.length) {
    if (bytes[offset] !== MARKER_PREFIX) return undefined;

    const marker = bytes[offset + BYTE];
    // Start of scan: past here is compressed image data, never metadata.
    if (marker === undefined || marker === SOS_MARKER) return undefined;

    const length = readUint16(bytes, offset + SEGMENT_LENGTH_BYTES, false);
    if (length === undefined || length < SEGMENT_LENGTH_BYTES) return undefined;

    const payload = offset + SEGMENT_LENGTH_BYTES + SEGMENT_LENGTH_BYTES;

    if (marker === APP1_MARKER && asciiAt(bytes, payload, EXIF_HEADER_LENGTH) === EXIF_HEADER) {
      return payload + EXIF_HEADER_LENGTH;
    }

    offset = payload + length - SEGMENT_LENGTH_BYTES;
  }

  return undefined;
};

const readTiff = (bytes: Uint8Array, tiffStart: number): ExifData => {
  const endianMark = readUint16(bytes, tiffStart, false);
  if (endianMark !== TIFF_LITTLE_ENDIAN_MARK && endianMark !== TIFF_BIG_ENDIAN_MARK) {
    return { orientation: DEFAULT_ORIENTATION };
  }

  const littleEndian = endianMark === TIFF_LITTLE_ENDIAN_MARK;
  if (readUint16(bytes, tiffStart + SHORT, littleEndian) !== TIFF_MAGIC) {
    return { orientation: DEFAULT_ORIENTATION };
  }

  const firstIfd = readUint32(bytes, tiffStart + LONG, littleEndian);
  if (firstIfd === undefined) return { orientation: DEFAULT_ORIENTATION };

  const zeroth = readIfd(bytes, tiffStart, tiffStart + firstIfd, littleEndian);

  // DateTimeOriginal, in the Exif sub-IFD, is when the shutter fired. DateTime
  // in IFD0 is when the file was last written, which any edit or export
  // rewrites — so it is the fallback, never the first choice.
  const exifIfdOffset = zeroth.exifIfdPointer;
  const original =
    exifIfdOffset === undefined
      ? undefined
      : readIfd(bytes, tiffStart, tiffStart + exifIfdOffset, littleEndian).dateTimeOriginal;

  const stamp = original ?? zeroth.dateTime;
  const capturedAt = stamp === undefined ? undefined : parseExifDate(stamp);

  return capturedAt === undefined
    ? { orientation: zeroth.orientation }
    : { orientation: zeroth.orientation, capturedAt };
};

/**
 * Reads the two EXIF fields this product actually uses.
 *
 * Deliberately not a general EXIF library. Orientation, without which every
 * portrait photo is measured sideways, and capture time, which drives the
 * recency hint — a reader for exactly those is short enough to bounds-check
 * completely, which a dependency parsing 300 tags is not.
 *
 * Every read is bounds-checked and every malformed structure yields the
 * default rather than throwing. A photo with corrupt metadata is still a photo
 * the user wants checked; refusing it over a bad tag would be absurd.
 */
export const readJpegExif = (bytes: Uint8Array): ExifData => {
  const tiffStart = findExifSegment(bytes);
  if (tiffStart === undefined) return { orientation: DEFAULT_ORIENTATION };

  return readTiff(bytes, tiffStart);
};
