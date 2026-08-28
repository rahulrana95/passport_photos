import { DECODE_COLOUR_SPACE } from './browser-decoder.constants';
import { decodeHeicToPixels } from './heic/decode-heic';
import { loadLibheif } from './heic/libheif-module.loader';
import type {
  BitmapLike,
  DecodeCanvasContext,
  DecodeEnvironment,
} from './browser-decoder.types';

/**
 * The real browser, read at call time rather than at import.
 *
 * A module-level read would touch `OffscreenCanvas` while this file is being
 * evaluated, which on a server render is a crash at import — and this module
 * is reachable from a page that renders on the server before it ever reaches
 * a browser.
 *
 */
export const browserDecodeEnvironment = (): DecodeEnvironment => ({
  createBitmap: async (blob: Blob, applyStoredOrientation: boolean): Promise<BitmapLike> =>
    // 'none' switches OFF the browser's own EXIF handling. The orientation is
    // already on the request, read once from the file, and letting the browser
    // apply it as well rotates the photograph twice. HEIC is the exception:
    // see createBitmap on DecodeEnvironment.
    createImageBitmap(blob, {
      imageOrientation: applyStoredOrientation ? 'from-image' : 'none',
      colorSpaceConversion: 'default',
    }),

  createSurface: (widthPx: number, heightPx: number): DecodeCanvasContext | undefined =>
    context2d(widthPx, heightPx),

  decodeHeic: heicBitmap,
});

/**
 * libheif, loaded once per page and only if a HEIC ever reaches this.
 *
 * The promise is cached rather than the module, so two photographs chosen in
 * quick succession share one instantiation instead of racing to build two
 * megabyte-sized runtimes.
 */
let libheifPromise: ReturnType<typeof loadLibheif> | undefined;

/**
 * A HEIC the browser refused, decoded by libheif and handed back as a frame.
 *
 * The pixels go through createImageBitmap so that everything downstream — the
 * orientation transform, the working-size plan, the paint — is the identical
 * code path a JPEG takes. A second path for HEIC would be a second place for
 * the mirrored-orientation bug to live.
 */
const heicBitmap = async (bytes: Uint8Array): Promise<BitmapLike | undefined> => {
  if (typeof createImageBitmap === 'undefined') return undefined;

  libheifPromise ??= loadLibheif();
  const pixels = await decodeHeicToPixels(bytes, await libheifPromise);

  return pixels === undefined ? undefined : createImageBitmap(pixels);
};

/**
 * A 2D context, from OffscreenCanvas where there is one.
 *
 * Offscreen is preferred because it touches no DOM at all: a decode neither
 * needs a document nor should keep one alive, and it lets this run unchanged
 * inside a worker later.
 *
 * The two branches each call getContext on a concrete receiver rather than on
 * a union of the two canvas types. On the union the overloads collapse and the
 * result includes a bitmap-rendering context, which would have to be cast
 * away — and a cast here would be hiding the one thing worth checking.
 */
const context2d = (
  widthPx: number,
  heightPx: number,
): DecodeCanvasContext | undefined => {
  // Typed, not inferred: an inferred literal drops getContext onto its
  // catch-all overload, whose return type includes a bitmap-rendering context.
  const settings: CanvasRenderingContext2DSettings = { colorSpace: DECODE_COLOUR_SPACE };

  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(widthPx, heightPx).getContext('2d', settings) ?? undefined;
  }

  if (typeof document === 'undefined') return undefined;

  const canvas = document.createElement('canvas');
  canvas.width = widthPx;
  canvas.height = heightPx;
  return canvas.getContext('2d', settings) ?? undefined;
};