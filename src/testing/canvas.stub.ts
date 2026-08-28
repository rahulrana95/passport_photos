import { JPEG_SIGNATURE } from '@/ingestion/image-format.constants';
import { CHANNELS_PER_PIXEL } from './fixtures/pixel-format.constants';

/** What the stub encodes a still as, matching the real capture. */
const STUB_CAPTURE_TYPE = 'image/jpeg';
const STUB_CAPTURE_BYTES = 64;

/**
 * Real JPEG bytes, not a placeholder.
 *
 * A still that leaves this canvas goes through the same ingestion as an
 * uploaded file, and ingestion reads the leading bytes rather than trusting
 * the type. A blob of zeros is refused as "not an image file" — which would
 * make every test of the capture route assert a refusal it did not mean.
 */
const jpegBody = (): ArrayBuffer => {
  const buffer = new ArrayBuffer(STUB_CAPTURE_BYTES);
  new Uint8Array(buffer).set(JPEG_SIGNATURE, 0);
  return buffer;
};

/**
 * Gives jsdom just enough canvas to run a frame grab and a capture through.
 *
 * jsdom implements no canvas at all, so without this every path downstream of
 * `getContext` bails on its first line — which is the guidance loop and the
 * capture itself, the two things most worth testing about a camera. The
 * project's default stub returns null on purpose, so this restores it
 * afterwards: a test that wants to prove the null path is handled still gets
 * a null-returning canvas.
 *
 * Shared rather than copied because two suites need it — the camera component
 * and the panel that mounts it — and a second copy would drift the moment one
 * of them needed a new method.
 */
export const withWorkingCanvas = (): (() => void) => {
  const realGetContext = window.HTMLCanvasElement.prototype.getContext;
  const realToBlob = window.HTMLCanvasElement.prototype.toBlob;

  window.HTMLCanvasElement.prototype.getContext = (() => ({
    drawImage: () => undefined,
    getImageData: (_sx: number, _sy: number, sw: number, sh: number) => ({
      width: sw,
      height: sh,
      data: new Uint8ClampedArray(sw * sh * CHANNELS_PER_PIXEL),
    }),
  })) as unknown as HTMLCanvasElement['getContext'];

  window.HTMLCanvasElement.prototype.toBlob = function toBlob(callback: BlobCallback): void {
    callback(new Blob([jpegBody()], { type: STUB_CAPTURE_TYPE }));
  };

  return () => {
    window.HTMLCanvasElement.prototype.getContext = realGetContext;
    window.HTMLCanvasElement.prototype.toBlob = realToBlob;
  };
};
