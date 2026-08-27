import { describe, expect, it, vi } from 'vitest';
import { MAX_JPEG_QUALITY, MIN_JPEG_QUALITY } from './encode.constants';
import { createFakeJpegEncoder, fakeEncodedSize } from './fake-jpeg-encoder';
import { searchQualityForBytes } from './quality-search';
import type { JpegEncoder } from './jpeg-encoder.types';
import type { PixelBuffer } from '@/testing/fixtures/synthetic-head.types';

const IMAGE: PixelBuffer = { width: 4, height: 4, data: new Uint8ClampedArray(64) };

const SIZES = { bytesAtMinQuality: 40_000, bytesAtMaxQuality: 400_000 };

const counting = (encoder: JpegEncoder): { encoder: JpegEncoder; qualities: number[] } => {
  const qualities: number[] = [];
  return {
    qualities,
    encoder: {
      encode: (image, quality) => {
        qualities.push(quality);
        return encoder.encode(image, quality);
      },
    },
  };
};

describe('finding the best quality that fits', () => {
  it('returns the highest quality under the ceiling', async () => {
    const encoder = createFakeJpegEncoder(SIZES);
    const ceiling = fakeEncodedSize(70, SIZES);

    const result = await searchQualityForBytes(encoder, IMAGE, ceiling);

    expect(result.ok).toBe(true);
    expect(result.quality).toBe(70);
  });

  it('returns a file that actually fits', async () => {
    const ceiling = fakeEncodedSize(70, SIZES);
    const result = await searchQualityForBytes(createFakeJpegEncoder(SIZES), IMAGE, ceiling);

    expect(result.bytes.length).toBeLessThanOrEqual(ceiling);
  });

  it('takes the top of the range when everything fits', async () => {
    const result = await searchQualityForBytes(createFakeJpegEncoder(SIZES), IMAGE, 10_000_000);

    expect(result.quality).toBe(MAX_JPEG_QUALITY);
  });

  it('never goes above the top of the range', async () => {
    const { encoder, qualities } = counting(createFakeJpegEncoder(SIZES));
    await searchQualityForBytes(encoder, IMAGE, 10_000_000);

    expect(Math.max(...qualities)).toBeLessThanOrEqual(MAX_JPEG_QUALITY);
    expect(Math.min(...qualities)).toBeGreaterThanOrEqual(MIN_JPEG_QUALITY);
  });
});

describe('termination', () => {
  it('costs no more encodes than a bisection of the range', async () => {
    // The plan called for an iteration cap. A cap nothing can reach is a
    // branch no test can take, and a cap something can reach silently returns
    // a worse answer than the search had already found. The bound is asserted
    // here instead, where it stays honest: a search that stopped converging
    // fails this rather than quietly costing eight seconds of a phone battery.
    const span = MAX_JPEG_QUALITY - MIN_JPEG_QUALITY;
    const bound = Math.ceil(Math.log2(span + 1)) + 1;

    const { encoder, qualities } = counting(createFakeJpegEncoder(SIZES));
    await searchQualityForBytes(encoder, IMAGE, fakeEncodedSize(63, SIZES));

    expect(qualities.length).toBeLessThanOrEqual(bound);
  });

  it('reports how many encodes it took', async () => {
    const result = await searchQualityForBytes(createFakeJpegEncoder(SIZES), IMAGE, 10_000_000);

    expect(result.attempts).toBeGreaterThan(1);
  });

  it('asks the cheapest question first', async () => {
    // The floor is tried before anything else, so the impossible case is known
    // after one encode rather than eight.
    const { encoder, qualities } = counting(createFakeJpegEncoder(SIZES));
    await searchQualityForBytes(encoder, IMAGE, 10_000_000);

    expect(qualities[0]).toBe(MIN_JPEG_QUALITY);
  });
});

describe('a ceiling that cannot be met', () => {
  const impossible = { bytesAtMinQuality: 300_000, bytesAtMaxQuality: 900_000 };

  it('says so rather than failing', async () => {
    // Explain, do not fail. A reader whose photograph cannot be squeezed under
    // an authority's limit needs to know that, and needs the photograph.
    const result = await searchQualityForBytes(
      createFakeJpegEncoder(impossible),
      IMAGE,
      100_000,
    );

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe('ceiling-unreachable');
  });

  it('hands back the smallest file it is willing to produce', async () => {
    const result = await searchQualityForBytes(
      createFakeJpegEncoder(impossible),
      IMAGE,
      100_000,
    );

    expect(result.quality).toBe(MIN_JPEG_QUALITY);
    expect(result.bytes.length).toBe(fakeEncodedSize(MIN_JPEG_QUALITY, impossible));
  });

  it('works it out in a single encode', async () => {
    const encode = vi.fn(createFakeJpegEncoder(impossible).encode);
    await searchQualityForBytes({ encode }, IMAGE, 100_000);

    expect(encode).toHaveBeenCalledOnce();
  });
});

describe('an encoder that is not perfectly monotonic', () => {
  it('keeps the best result it saw rather than the last one', async () => {
    // Real encoders are very nearly monotonic and not exactly. A search that
    // trusted its last attempt could return a larger file than one it had
    // already produced and discarded.
    const sizes = new Map([
      [MIN_JPEG_QUALITY, 1_000],
      [67, 1_500],
      [81, 4_000],
      [74, 4_000],
      [70, 1_400],
      [71, 1_450],
      [72, 1_460],
      [73, 1_470],
    ]);
    const encoder: JpegEncoder = {
      encode: (_image, quality) =>
        Promise.resolve(new Uint8Array(sizes.get(quality) ?? 9_000)),
    };

    const result = await searchQualityForBytes(encoder, IMAGE, 1_500);

    expect(result.ok).toBe(true);
    expect(result.bytes.length).toBeLessThanOrEqual(1_500);
  });
});
