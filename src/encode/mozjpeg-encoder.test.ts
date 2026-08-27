import { describe, expect, it, vi } from 'vitest';
import { createMozjpegEncoder } from './mozjpeg-encoder';
import type { PixelBuffer } from '@/testing/fixtures/synthetic-head.types';

const IMAGE: PixelBuffer = { width: 3, height: 2, data: new Uint8ClampedArray(24).fill(120) };

describe('wrapping mozjpeg', () => {
  it('hands it the pixels and the quality it was asked for', async () => {
    const encode = vi.fn(async () => new ArrayBuffer(8));
    await createMozjpegEncoder(encode).encode(IMAGE, 72);

    expect(encode).toHaveBeenCalledWith(
      { data: IMAGE.data, width: 3, height: 2 },
      { quality: 72 },
    );
  });

  it('returns the encoded bytes as a view rather than a buffer', async () => {
    // The pipeline measures lengths and rewrites headers; an ArrayBuffer
    // supports neither without being wrapped at every call site.
    const encode = vi.fn(async () => new ArrayBuffer(8));
    const bytes = await createMozjpegEncoder(encode).encode(IMAGE, 72);

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(8);
  });
});
