import type { MozjpegEncode } from './mozjpeg-encoder';

/**
 * The dynamic import of the mozjpeg bundle, and nothing else.
 *
 * Its own file for the same reason the MediaPipe loader is: this is the line
 * that pulls in the WebAssembly, and keeping it alone means every other module
 * in this directory can be imported — by a test, by a page, by the worker —
 * without instantiating a compressor.
 */
export const loadMozjpegEncode = async (): Promise<MozjpegEncode> => {
  const mozjpeg = await import('@jsquash/jpeg/encode');
  return mozjpeg.default as unknown as MozjpegEncode;
};
