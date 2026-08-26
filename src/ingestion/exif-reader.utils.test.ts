import { describe, expect, it } from 'vitest';
import {
  buildJpegWithExif,
  buildJpegWithoutExif,
} from '@/testing/fixtures/jpeg-exif.builder';
import { parseExifDate, readJpegExif } from './exif-reader.utils';
import { EXIF_ORIENTATIONS } from './exif-orientation.constants';

describe('orientation is read for every value, in both byte orders', () => {
  // Little-endian is what phones write and what everyone tests. Big-endian is
  // what several DSLRs write, and reading a big-endian SHORT as little-endian
  // turns orientation 6 into 0x0600 — so every portrait photo from that camera
  // lands sideways, silently.
  for (const bigEndian of [false, true]) {
    for (const orientation of EXIF_ORIENTATIONS) {
      it(`${bigEndian ? 'big' : 'little'}-endian orientation ${orientation}`, () => {
        const bytes = buildJpegWithExif({ orientation, bigEndian });

        expect(readJpegExif(bytes).orientation).toBe(orientation);
      });
    }
  }
});

describe('files without usable EXIF fall back rather than fail', () => {
  it('treats a JPEG with no APP1 segment as upright', () => {
    // Screenshots, exports and anything stripped by a messaging app.
    expect(readJpegExif(buildJpegWithoutExif())).toEqual({ orientation: 1 });
  });

  it('treats EXIF with no orientation tag as upright', () => {
    expect(readJpegExif(buildJpegWithExif({ dateTime: '2026:01:02 03:04:05' })).orientation).toBe(1);
  });

  it('returns upright for bytes that are not a JPEG at all', () => {
    expect(readJpegExif(Uint8Array.from([0x89, 0x50, 0x4e, 0x47])).orientation).toBe(1);
  });

  it('returns upright for an empty buffer', () => {
    expect(readJpegExif(new Uint8Array(0)).orientation).toBe(1);
  });

  it('returns upright for a truncated file rather than throwing', () => {
    // A transfer that stopped partway. Every read is bounds-checked precisely
    // so this is a fallback and not a crash.
    const full = buildJpegWithExif({ orientation: 6 });

    for (let length = 0; length < full.length; length += 1) {
      expect(() => readJpegExif(full.slice(0, length))).not.toThrow();
    }
  });

  it('ignores an orientation value outside the defined range', () => {
    // Nine is not an orientation. Trusting it would index a transform table
    // with a value that has no entry.
    expect(readJpegExif(buildJpegWithExif({ orientation: 9 })).orientation).toBe(1);
  });

  it('ignores a corrupt TIFF header', () => {
    const bytes = buildJpegWithExif({ orientation: 6 });
    // The TIFF magic number sits just past the Exif identifier.
    const magicOffset = 4 + 2 + 6 + 2;
    bytes[magicOffset] = 0xff;
    bytes[magicOffset + 1] = 0xff;

    expect(readJpegExif(bytes).orientation).toBe(1);
  });
});

describe('walking the segment chain', () => {
  it('finds Exif past a JFIF segment, which most cameras write first', () => {
    // A reader that only inspects the first segment finds nothing in the
    // majority of real files.
    const bytes = buildJpegWithExif({ orientation: 6, withJfifSegment: true });

    expect(readJpegExif(bytes).orientation).toBe(6);
  });

  it('finds Exif past a JFIF segment in big-endian files too', () => {
    const bytes = buildJpegWithExif({ orientation: 3, withJfifSegment: true, bigEndian: true });

    expect(readJpegExif(bytes).orientation).toBe(3);
  });

  it('stops at a segment claiming an impossible length', () => {
    // A length below the two bytes the field itself occupies would step the
    // cursor backwards and loop forever.
    const bytes = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x00, 0xff, 0xd9]);

    expect(readJpegExif(bytes).orientation).toBe(1);
  });

  it('stops when a segment does not begin with a marker', () => {
    const bytes = Uint8Array.from([0xff, 0xd8, 0x00, 0x00, 0x00, 0x10, 0xff, 0xd9]);

    expect(readJpegExif(bytes).orientation).toBe(1);
  });

  it('stops at the start of scan rather than reading image data as metadata', () => {
    const bytes = Uint8Array.from([0xff, 0xd8, 0xff, 0xda, 0x00, 0x08, 0, 0, 0, 0, 0xff, 0xd9]);

    expect(readJpegExif(bytes).orientation).toBe(1);
  });
});

describe('capture time', () => {
  it('prefers DateTimeOriginal over DateTime', () => {
    // DateTime is when the file was last written, which any edit or export
    // rewrites. DateTimeOriginal is when the shutter fired, which is what the
    // recency hint is actually about.
    const bytes = buildJpegWithExif({
      dateTime: '2026:08:01 12:00:00',
      dateTimeOriginal: '2026:03:14 09:26:53',
    });

    expect(readJpegExif(bytes).capturedAt?.getMonth()).toBe(2);
    expect(readJpegExif(bytes).capturedAt?.getDate()).toBe(14);
  });

  it('falls back to DateTime when there is no original', () => {
    const bytes = buildJpegWithExif({ dateTime: '2026:08:01 12:00:00' });

    expect(readJpegExif(bytes).capturedAt?.getFullYear()).toBe(2026);
  });

  it('reports no capture time when the date value is cut off the end', () => {
    // The IFD entry survives while the ASCII it points at does not — what a
    // transfer interrupted near the end of the file actually looks like.
    // Orientation still reads, because it is stored inline in the entry.
    const full = buildJpegWithExif({ orientation: 6, dateTime: '2026:08:01 12:00:00' });
    const truncated = full.slice(0, full.length - 24);

    expect(readJpegExif(truncated).capturedAt).toBeUndefined();
    expect(readJpegExif(truncated).orientation).toBe(6);
  });

  it('ignores a date entry that does not declare itself as text', () => {
    // Broken software writes DateTime with the wrong type. Trusting the tag
    // without checking the type reads whatever the value field holds as text.
    const bytes = buildJpegWithExif({
      orientation: 3,
      dateTime: '2026:08:01 12:00:00',
      dateTimeType: 3,
    });

    expect(readJpegExif(bytes).capturedAt).toBeUndefined();
    expect(readJpegExif(bytes).orientation).toBe(3);
  });

  it('reports no capture time when the file carries none', () => {
    expect(readJpegExif(buildJpegWithExif({ orientation: 1 })).capturedAt).toBeUndefined();
  });

  it('reads orientation and capture time from the same file', () => {
    const data = readJpegExif(
      buildJpegWithExif({ orientation: 8, dateTimeOriginal: '2025:12:31 23:59:59', bigEndian: true }),
    );

    expect(data.orientation).toBe(8);
    expect(data.capturedAt?.getFullYear()).toBe(2025);
  });
});

describe('parseExifDate', () => {
  it('reads the EXIF format as local time', () => {
    // No zone is stored, so local is what the person holding the camera would
    // say the time was. Reading it as UTC moves a morning photo into yesterday
    // for everyone west of Greenwich.
    const date = parseExifDate('2026:03:14 09:26:53');

    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(2);
    expect(date?.getHours()).toBe(9);
    expect(date?.getSeconds()).toBe(53);
  });

  it('tolerates the trailing NUL a real file carries', () => {
    // The field is fixed-width and NUL-padded, and String.trim does not treat
    // NUL as whitespace — trimming alone leaves the terminator attached.
    expect(parseExifDate('2026:03:14 09:26:53\u0000')).toBeDefined();
  });

  it('rejects the all-zero stamp a dead camera clock writes', () => {
    expect(parseExifDate('0000:00:00 00:00:00')).toBeUndefined();
  });

  it('rejects a day that does not exist', () => {
    // Date would roll 31 February forward to March and report success.
    expect(parseExifDate('2026:02:31 12:00:00')).toBeUndefined();
  });

  it('rejects a month that does not exist', () => {
    expect(parseExifDate('2026:13:01 12:00:00')).toBeUndefined();
  });

  it('rejects anything not in the EXIF shape', () => {
    expect(parseExifDate('2026-03-14T09:26:53Z')).toBeUndefined();
    expect(parseExifDate('')).toBeUndefined();
  });
});
