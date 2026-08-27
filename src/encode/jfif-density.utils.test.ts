import { describe, expect, it } from 'vitest';
import { buildJpegWithExif, buildJpegWithoutExif } from '@/testing/fixtures/jpeg-exif.builder';
import { createFakeJpegEncoder } from './fake-jpeg-encoder';
import { JFIF_UNITS_NONE, JFIF_UNITS_PER_INCH } from './jpeg-marker.constants';
import { readJfifDensity, setJfifDensity } from './jfif-density.utils';
import { scanJpegSegments } from './jpeg-segments.utils';
import { NOMINAL_HEAD_SPEC } from '@/testing/fixtures/synthetic-head.constants';

const PRINT_DPI = 300;

const encodedFile = async (withJfifSegment: boolean): Promise<Uint8Array> =>
  createFakeJpegEncoder({ withJfifSegment, bytesAtMinQuality: 500, bytesAtMaxQuality: 900 }).encode(
    { width: NOMINAL_HEAD_SPEC.widthPx, height: NOMINAL_HEAD_SPEC.heightPx, data: new Uint8ClampedArray(0) },
    50,
  );

describe('what an encoder leaves behind', () => {
  it('declares no physical size at all', async () => {
    // This is the default libjpeg writes, and it is the reason this module
    // exists: units 0 means the two density numbers are an aspect ratio. A
    // 600 by 600 file with units 0 prints at whatever size the receiving
    // software guesses.
    expect(readJfifDensity(await encodedFile(true))?.units).toBe(JFIF_UNITS_NONE);
  });
});

describe('writing the print resolution', () => {
  it('sets the units to dots per inch', async () => {
    const bytes = setJfifDensity(await encodedFile(true), PRINT_DPI);

    expect(readJfifDensity(bytes)?.units).toBe(JFIF_UNITS_PER_INCH);
  });

  it('writes the same resolution on both axes', async () => {
    // A file whose horizontal and vertical densities differ prints as a
    // stretched person, which is a rejection reason that looks like a camera
    // fault.
    const bytes = setJfifDensity(await encodedFile(true), PRINT_DPI);

    expect(readJfifDensity(bytes)).toEqual({ units: JFIF_UNITS_PER_INCH, x: 300, y: 300 });
  });

  it('does not change the file length when it patches in place', async () => {
    const original = await encodedFile(true);

    expect(setJfifDensity(original, PRINT_DPI).length).toBe(original.length);
  });

  it('inserts a header into a file that has none', async () => {
    // Some encoders write an Exif header and no JFIF one. There is nowhere to
    // patch, so a segment has to go in — immediately after the start-of-image
    // marker, which is where the specification puts it.
    const original = await encodedFile(false);
    const bytes = setJfifDensity(original, PRINT_DPI);

    expect(readJfifDensity(original)).toBeUndefined();
    expect(readJfifDensity(bytes)).toEqual({ units: JFIF_UNITS_PER_INCH, x: 300, y: 300 });
  });

  it('inserts it in the right place, and leaves the file valid', async () => {
    const bytes = setJfifDensity(await encodedFile(false), PRINT_DPI);
    const scan = scanJpegSegments(bytes);

    expect(scan.ok).toBe(true);
    if (!scan.ok) return;
    expect(scan.segments[0]?.start).toBe(2);
  });

  it('keeps whatever else the file carried', async () => {
    const original = await encodedFile(false);
    const bytes = setJfifDensity(original, PRINT_DPI);

    expect(bytes.length).toBeGreaterThan(original.length);
    expect(bytes.at(-1)).toBe(original.at(-1));
  });

  it('writes a resolution that is not the default, so a test cannot pass by luck', () => {
    const bytes = setJfifDensity(buildJpegWithExif({ withJfifSegment: true }), 72);

    expect(readJfifDensity(bytes)?.x).toBe(72);
  });
});

describe('files it will not touch', () => {
  it('leaves one it cannot parse alone', () => {
    const nonsense = Uint8Array.from([0x89, 0x50, 0x4e, 0x47]);

    expect(setJfifDensity(nonsense, PRINT_DPI)).toBe(nonsense);
    expect(readJfifDensity(nonsense)).toBeUndefined();
  });

  it('reports no density for a file carrying no JFIF header', () => {
    expect(readJfifDensity(buildJpegWithoutExif())).toBeUndefined();
  });
});
