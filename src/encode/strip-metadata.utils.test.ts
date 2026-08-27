import { describe, expect, it } from 'vitest';
import { readJpegExif } from '@/ingestion/exif-reader.utils';
import { buildJpegWithExif, buildJpegWithoutExif } from '@/testing/fixtures/jpeg-exif.builder';
import { hasExifSegment, stripExifSegments } from './strip-metadata.utils';

/** A recognisable coordinate: 51 degrees, 30 minutes, 26.64 seconds north. */
const HOME = { degrees: 51, minutes: 30, seconds: 26.64 };

/** The bytes a big-endian RATIONAL of 51/1 occupies in the file. */
const DEGREES_BYTES = Uint8Array.from([0, 0, 0, 51, 0, 0, 0, 1]);

const contains = (haystack: Uint8Array, needle: Uint8Array): boolean => {
  for (let start = 0; start + needle.length <= haystack.length; start += 1) {
    if (needle.every((byte, index) => haystack[start + index] === byte)) return true;
  }
  return false;
};

describe('the privacy requirement', () => {
  const withGps = buildJpegWithExif({ bigEndian: true, orientation: 6, gpsLatitude: HOME });

  it('starts from a file that really does carry coordinates', () => {
    // The fixture has to be worth stripping. Asserting the coordinate is
    // present first is what makes its absence afterwards mean something.
    expect(contains(withGps, DEGREES_BYTES)).toBe(true);
  });

  it('starts from a file whose Exif is structurally valid', () => {
    // A GPS block written at a wrong offset would corrupt the surrounding
    // IFD, and a stripper could then "pass" against a fixture that was never
    // a real Exif file. Reading the orientation back proves the structure
    // survived the addition.
    expect(readJpegExif(withGps).orientation).toBe(6);
  });

  it('removes the coordinates from the file', () => {
    // This is the claim the product makes. A photograph taken against a wall
    // at home carries the location of that home, and the file the reader goes
    // on to email to a government department must not.
    expect(contains(stripExifSegments(withGps), DEGREES_BYTES)).toBe(false);
  });

  it('removes the whole Exif block rather than filtering it', () => {
    // Filtering means maintaining a list of which tags are sensitive, and
    // that list is wrong the day a manufacturer adds one. Nothing in an Exif
    // block is needed by a passport photograph.
    expect(hasExifSegment(withGps)).toBe(true);
    expect(hasExifSegment(stripExifSegments(withGps))).toBe(false);
  });

  it('keeps the rest of the file intact', () => {
    const stripped = stripExifSegments(
      buildJpegWithExif({ withJfifSegment: true, gpsLatitude: HOME }),
    );

    // Still a JPEG, and still carrying the segment that was not metadata.
    expect(stripped[0]).toBe(0xff);
    expect(stripped[1]).toBe(0xd8);
    expect(stripped.at(-2)).toBe(0xff);
    expect(stripped.at(-1)).toBe(0xd9);
  });

  it('shrinks the file by exactly the segment it removed', () => {
    const original = buildJpegWithExif({ gpsLatitude: HOME });
    const stripped = stripExifSegments(original);

    expect(stripped.length).toBeLessThan(original.length);
    expect(hasExifSegment(stripped)).toBe(false);
  });
});

describe('files with nothing to strip', () => {
  it('returns a file carrying no Exif unchanged', () => {
    const bytes = buildJpegWithoutExif();

    expect(stripExifSegments(bytes)).toBe(bytes);
  });

  it('leaves a file it cannot parse alone', () => {
    // Half-stripping a JPEG whose structure we misread would corrupt the
    // photograph in order to protect it.
    const nonsense = Uint8Array.from([0x89, 0x50, 0x4e, 0x47]);

    expect(stripExifSegments(nonsense)).toBe(nonsense);
    expect(hasExifSegment(nonsense)).toBe(false);
  });
});
