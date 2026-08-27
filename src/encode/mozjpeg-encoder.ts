import type { JpegEncoder } from './jpeg-encoder.types';
import type { PixelBuffer } from '@/testing/fixtures/synthetic-head.types';

/**
 * The shape of mozjpeg's encode entry point, taken as a parameter.
 *
 * Injected rather than imported at module scope, exactly as the MediaPipe
 * modules are: importing it here would pull a megabyte of WebAssembly into
 * whichever chunk touches this file, and into every unit test that so much as
 * mentions encoding.
 */
export type MozjpegEncode = (
  image: { data: Uint8ClampedArray; width: number; height: number },
  options: { quality: number },
) => Promise<ArrayBuffer>;

/**
 * Wraps mozjpeg in the encoder interface the pipeline is written against.
 *
 * mozjpeg rather than the browser's own JPEG encoder, and the difference is
 * not academic. Several authorities set a byte ceiling — the US allows 240KB —
 * and at the same visual quality mozjpeg produces a file roughly a fifth
 * smaller than canvas.toBlob does. That fifth is the difference between
 * submitting at quality 85 and submitting at quality 70, on a photograph whose
 * compression artefacts are themselves grounds for rejection.
 */
export const createMozjpegEncoder = (encode: MozjpegEncode): JpegEncoder => ({
  encode: async (image: PixelBuffer, quality: number): Promise<Uint8Array> =>
    new Uint8Array(
      await encode({ data: image.data, width: image.width, height: image.height }, { quality }),
    ),
});
