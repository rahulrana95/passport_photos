/**
 * The part of libheif this product actually uses, as an interface.
 *
 * Written out rather than imported from the package for the reason every other
 * seam here exists: the module is a megabyte of WebAssembly that only loads in
 * a browser, and a test that wants to check which image gets chosen should not
 * have to instantiate a decoder to do it.
 *
 * It is also the honest surface. libheif exposes hundreds of functions; four
 * of them are ours, and naming only those makes an upgrade that breaks one
 * of them a type error rather than a runtime surprise in front of a user.
 */

/** The destination libheif fills, structurally an ImageData. */
export interface HeifPixelSink {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

export interface HeifImage {
  get_width: () => number;
  get_height: () => number;
  /**
   * Fills the sink with RGBA, calling back with the sink on success and with a
   * falsy value on failure. Callback-style because libheif's own binding is.
   */
  display: (sink: HeifPixelSink, done: (result: HeifPixelSink | undefined) => void) => void;
  free?: () => void;
}

export interface HeifDecoderLike {
  /** Every top-level image in the file, not only the one meant for display. */
  decode: (bytes: Uint8Array) => readonly HeifImage[];
}

export interface LibheifModule {
  readonly HeifDecoder: new () => HeifDecoderLike;
}
