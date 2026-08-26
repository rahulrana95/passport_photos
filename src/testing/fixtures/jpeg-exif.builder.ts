/**
 * Builds minimal JPEG files carrying exactly the EXIF a test needs.
 *
 * Synthesised rather than committed as binary fixtures, for the same reason
 * the head fixtures are generated: the input is described in the test, in
 * words, so a failure says which property broke rather than sending someone to
 * open a .jpg in a hex editor. It also means both byte orders and every
 * orientation come free, and mirrored orientations — the ones real corpora
 * almost never contain — are as easy to produce as upright ones.
 *
 * These are structurally valid JPEG containers with valid EXIF. They hold no
 * image data, which is all the metadata reader needs and nothing more.
 */

const MARKER_PREFIX = 0xff;
const SOI_MARKER = 0xd8;
const EOI_MARKER = 0xd9;
const APP1_MARKER = 0xe1;
const APP0_MARKER = 0xe0;
/** Length field plus 14 bytes of JFIF payload. */
const JFIF_SEGMENT_BYTES = 16;

const BYTE_MASK = 0xff;
const BYTE_SHIFT = 8;
const WORD_SHIFT = 16;
const TRIPLE_SHIFT = 24;

const TIFF_LITTLE_ENDIAN_MARK = 0x4949;
const TIFF_BIG_ENDIAN_MARK = 0x4d4d;
const TIFF_MAGIC = 42;

const TAG_ORIENTATION = 0x0112;
const TAG_DATE_TIME = 0x0132;
const TAG_EXIF_IFD_POINTER = 0x8769;
const TAG_DATE_TIME_ORIGINAL = 0x9003;

const TYPE_SHORT = 3;
const TYPE_ASCII = 2;
const TYPE_LONG = 4;

const IFD_ENTRY_BYTES = 12;
const TIFF_HEADER_BYTES = 8;
const IFD_COUNT_BYTES = 2;
const NEXT_IFD_BYTES = 4;
const EXIF_IDENTIFIER = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00];
const SEGMENT_LENGTH_BYTES = 2;

/** "YYYY:MM:DD HH:MM:SS" plus the terminating NUL. */
const DATE_FIELD_BYTES = 20;

export interface JpegExifOptions {
  readonly orientation?: number;
  /**
   * Emits a JFIF APP0 segment before the Exif one, as most cameras do.
   *
   * The reader must walk past segments it does not care about. A reader that
   * only checks the first segment finds nothing in the majority of real files.
   */
  readonly withJfifSegment?: boolean;
  /** Written to IFD0 as DateTime — the file's last-modified stamp. */
  readonly dateTime?: string;
  /**
   * Overrides the declared type of the DateTime entry.
   *
   * Real files do this when written by broken software. A reader that trusts
   * the tag without checking the type reads whatever the value field happens
   * to contain as if it were text.
   */
  readonly dateTimeType?: number;
  /** Written to the Exif sub-IFD as DateTimeOriginal — when the shutter fired. */
  readonly dateTimeOriginal?: string;
  readonly bigEndian?: boolean;
}

const uint16 = (value: number, bigEndian: boolean): number[] =>
  bigEndian
    ? [(value >> BYTE_SHIFT) & BYTE_MASK, value & BYTE_MASK]
    : [value & BYTE_MASK, (value >> BYTE_SHIFT) & BYTE_MASK];

const uint32 = (value: number, bigEndian: boolean): number[] => {
  const bytes = [
    (value >> TRIPLE_SHIFT) & BYTE_MASK,
    (value >> WORD_SHIFT) & BYTE_MASK,
    (value >> BYTE_SHIFT) & BYTE_MASK,
    value & BYTE_MASK,
  ];
  return bigEndian ? bytes : bytes.reverse();
};

const asciiBytes = (text: string, length: number): number[] => {
  const bytes = Array.from({ length }, () => 0);
  for (let index = 0; index < Math.min(text.length, length - 1); index += 1) {
    bytes[index] = text.charCodeAt(index);
  }
  return bytes;
};

interface Entry {
  readonly tag: number;
  readonly type: number;
  readonly count: number;
  /** Four bytes: an inline value, or an offset from the TIFF header. */
  readonly payload: number[];
}

const entryBytes = (entry: Entry, bigEndian: boolean): number[] => [
  ...uint16(entry.tag, bigEndian),
  ...uint16(entry.type, bigEndian),
  ...uint32(entry.count, bigEndian),
  ...entry.payload,
];

/**
 * A SHORT occupies the first two of the value field's four bytes, in the
 * file's byte order, with the remainder zero. Getting this wrong is the
 * classic EXIF bug: a big-endian orientation read as little-endian becomes
 * 0x0600 rather than 6, and every portrait photo lands sideways.
 */
const shortPayload = (value: number, bigEndian: boolean): number[] => [
  ...uint16(value, bigEndian),
  0,
  0,
];

export const buildJpegWithExif = (options: JpegExifOptions = {}): Uint8Array => {
  const bigEndian = options.bigEndian === true;
  const hasOriginal = options.dateTimeOriginal !== undefined;

  const zerothEntries: Entry[] = [];
  if (options.orientation !== undefined) {
    zerothEntries.push({
      tag: TAG_ORIENTATION,
      type: TYPE_SHORT,
      count: 1,
      payload: shortPayload(options.orientation, bigEndian),
    });
  }

  // Layout is fixed before any offset is written: IFD0, then the Exif sub-IFD
  // when there is one, then the variable-length ASCII values after both.
  const zerothCount = zerothEntries.length + (options.dateTime === undefined ? 0 : 1) + (hasOriginal ? 1 : 0);
  const zerothStart = TIFF_HEADER_BYTES;
  const zerothBytes = IFD_COUNT_BYTES + zerothCount * IFD_ENTRY_BYTES + NEXT_IFD_BYTES;
  const exifIfdStart = zerothStart + zerothBytes;
  const exifIfdBytes = hasOriginal ? IFD_COUNT_BYTES + IFD_ENTRY_BYTES + NEXT_IFD_BYTES : 0;
  let valueCursor = exifIfdStart + exifIfdBytes;

  if (options.dateTime !== undefined) {
    zerothEntries.push({
      tag: TAG_DATE_TIME,
      type: options.dateTimeType ?? TYPE_ASCII,
      count: DATE_FIELD_BYTES,
      payload: uint32(valueCursor, bigEndian),
    });
    valueCursor += DATE_FIELD_BYTES;
  }

  if (hasOriginal) {
    zerothEntries.push({
      tag: TAG_EXIF_IFD_POINTER,
      type: TYPE_LONG,
      count: 1,
      payload: uint32(exifIfdStart, bigEndian),
    });
  }

  const tiff: number[] = [
    ...uint16(bigEndian ? TIFF_BIG_ENDIAN_MARK : TIFF_LITTLE_ENDIAN_MARK, true),
    ...uint16(TIFF_MAGIC, bigEndian),
    ...uint32(zerothStart, bigEndian),
    ...uint16(zerothEntries.length, bigEndian),
    ...zerothEntries.flatMap((entry) => entryBytes(entry, bigEndian)),
    ...uint32(0, bigEndian),
  ];

  if (hasOriginal) {
    tiff.push(
      ...uint16(1, bigEndian),
      ...entryBytes(
        {
          tag: TAG_DATE_TIME_ORIGINAL,
          type: TYPE_ASCII,
          count: DATE_FIELD_BYTES,
          payload: uint32(valueCursor, bigEndian),
        },
        bigEndian,
      ),
      ...uint32(0, bigEndian),
    );
  }

  if (options.dateTime !== undefined) tiff.push(...asciiBytes(options.dateTime, DATE_FIELD_BYTES));
  if (options.dateTimeOriginal !== undefined) {
    tiff.push(...asciiBytes(options.dateTimeOriginal, DATE_FIELD_BYTES));
  }

  const app1Payload = [...EXIF_IDENTIFIER, ...tiff];
  const app1Length = app1Payload.length + SEGMENT_LENGTH_BYTES;

  // A minimal but structurally valid JFIF APP0: length, identifier, version,
  // density units and a zero-sized thumbnail.
  const jfif =
    options.withJfifSegment === true
      ? [
          MARKER_PREFIX,
          APP0_MARKER,
          ...uint16(JFIF_SEGMENT_BYTES, true),
          0x4a,
          0x46,
          0x49,
          0x46,
          0x00,
          0x01,
          0x02,
          0x00,
          0,
          1,
          0,
          1,
          0,
          0,
        ]
      : [];

  return Uint8Array.from([
    MARKER_PREFIX,
    SOI_MARKER,
    ...jfif,
    MARKER_PREFIX,
    APP1_MARKER,
    ...uint16(app1Length, true),
    ...app1Payload,
    MARKER_PREFIX,
    EOI_MARKER,
  ]);
};

/** A structurally valid JPEG carrying no APP1 segment at all. */
export const buildJpegWithoutExif = (): Uint8Array =>
  Uint8Array.from([MARKER_PREFIX, SOI_MARKER, MARKER_PREFIX, EOI_MARKER]);
