import type { PixelBuffer } from '@/testing/fixtures/synthetic-head.types';

/**
 * The swap point between mozjpeg and the deterministic fake.
 *
 * The same shape as the Detector interface, and for the same reason: the
 * encoder is a megabyte of WebAssembly that has no business being instantiated
 * in a unit test, and everything worth testing here — the search for a
 * quality that fits, the metadata rewriting, the ordering of the pipeline — is
 * logic around the encoder rather than inside it.
 *
 * Quality is mozjpeg's 1..100 scale. Higher is larger.
 */
export interface JpegEncoder {
  readonly encode: (image: PixelBuffer, quality: number) => Promise<Uint8Array>;
}
