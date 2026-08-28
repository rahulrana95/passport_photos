import type { LibheifModule } from './heic-decoder.types';

/**
 * The dynamic import of libheif, and nothing else.
 *
 * Its own file for the same reason the mozjpeg loader is: this is the line
 * that pulls in a megabyte of WebAssembly, and keeping it alone means every
 * other module in this directory can be imported by a test, a page or the
 * worker without paying for a decoder nobody asked for.
 *
 * Nothing here runs until somebody uploads a HEIC on a browser that cannot
 * open one. Everyone else — every JPEG, every PNG, every iPhone user on
 * Safari, which decodes HEIC natively — downloads none of it.
 */
export const loadLibheif = async (): Promise<LibheifModule> => {
  const bundle = await import('libheif-js/libheif-wasm/libheif-bundle.mjs');
  const factory = bundle.default as unknown as () => Promise<LibheifModule>;

  return factory();
};
