import { describe, expect, it } from 'vitest';
import { MAX_JPEG_QUALITY, MIN_JPEG_QUALITY } from './encode.constants';
import { createFakeJpegEncoder, fakeEncodedSize } from './fake-jpeg-encoder';
import { readJfifDensity } from './jfif-density.utils';
import { scanJpegSegments } from './jpeg-segments.utils';
import { JFIF_UNITS_NONE } from './jpeg-marker.constants';
import type { PixelBuffer } from '@/testing/fixtures/synthetic-head.types';

const IMAGE: PixelBuffer = { width: 2, height: 2, data: new Uint8ClampedArray(16) };
const SIZES = { bytesAtMinQuality: 1_000, bytesAtMaxQuality: 200_000 };

describe('the deterministic encoder', () => {
  it('produces exactly the size it advertises', async () => {
    // Exactness is the whole point. A search asserted against a nearly-right
    // expectation is a search whose off-by-one bugs look like rounding.
    for (const quality of [MIN_JPEG_QUALITY, 55, 70, MAX_JPEG_QUALITY]) {
      const bytes = await createFakeJpegEncoder(SIZES).encode(IMAGE, quality);
      expect(bytes.length, `quality ${quality}`).toBe(fakeEncodedSize(quality, SIZES));
    }
  });

  it('shrinks as quality falls', async () => {
    const encoder = createFakeJpegEncoder(SIZES);
    const low = await encoder.encode(IMAGE, MIN_JPEG_QUALITY);
    const high = await encoder.encode(IMAGE, MAX_JPEG_QUALITY);

    expect(low.length).toBeLessThan(high.length);
  });

  it('produces a file the rest of the pipeline can parse', async () => {
    const bytes = await createFakeJpegEncoder(SIZES).encode(IMAGE, 70);

    expect(scanJpegSegments(bytes).ok).toBe(true);
  });

  it('reproduces the header libjpeg writes, including its useless density', async () => {
    // The fake has to carry the defect the real encoder has, or the module
    // that exists to correct it would be tested against a file that never
    // needed correcting.
    const bytes = await createFakeJpegEncoder(SIZES).encode(IMAGE, 70);

    expect(readJfifDensity(bytes)?.units).toBe(JFIF_UNITS_NONE);
  });

  it('can omit the header, for the path that has to insert one', async () => {
    const bytes = await createFakeJpegEncoder({ ...SIZES, withJfifSegment: false }).encode(IMAGE, 70);

    expect(readJfifDensity(bytes)).toBeUndefined();
  });

  it('spans multiple segments for a file larger than one can hold', async () => {
    // A JPEG segment's length field is sixteen bits. A 200KB file needs
    // several, and getting that wrong would produce a file the walker
    // rejects — which is exactly what the first assertion here checks.
    const bytes = await createFakeJpegEncoder(SIZES).encode(IMAGE, MAX_JPEG_QUALITY);
    const scan = scanJpegSegments(bytes);

    expect(scan.ok).toBe(true);
    if (!scan.ok) return;
    expect(scan.segments.length).toBeGreaterThan(3);
  });

  it('has defaults, so a test that does not care about size need not say', async () => {
    const bytes = await createFakeJpegEncoder().encode(IMAGE, 70);

    expect(bytes.length).toBe(fakeEncodedSize(70));
  });
});
