/**
 * The browser primitives a decode needs, narrowed to an interface.
 *
 * jsdom implements neither createImageBitmap nor a canvas, so without this
 * seam the whole decoder would be reachable only from a browser — and the
 * parts worth testing are the decisions around the decode, not the decode.
 * The same split the analysis worker uses for its models.
 */

export interface BitmapLike {
  readonly width: number;
  readonly height: number;
  /** Frees the decoded frame. A phone photograph is tens of megabytes of it. */
  close: () => void;
}

export interface DecodeCanvasContext {
  translate(x: number, y: number): void;
  rotate(angle: number): void;
  scale(x: number, y: number): void;
  drawImage(source: BitmapLike, dx: number, dy: number, dWidth: number, dHeight: number): void;
  getImageData(sx: number, sy: number, sw: number, sh: number): ImageData;
}

export interface DecodeEnvironment {
  /**
   * Decodes the bytes into a frame.
   *
   * `applyStoredOrientation` is false for every format whose orientation this
   * pipeline reads itself — the request already carries it, and letting the
   * browser apply it as well rotates the photograph twice.
   *
   * It is true for HEIC alone, whose rotation lives in container boxes this
   * pipeline does not parse rather than in the JPEG EXIF block it does. There
   * the browser is the only thing that knows which way up the picture goes,
   * and a photograph taken in portrait arrives on its side without it.
   */
  readonly createBitmap: (blob: Blob, applyStoredOrientation: boolean) => Promise<BitmapLike>;
  /**
   * Decodes a HEIC the browser itself refused, or returns undefined where no
   * fallback is available.
   *
   * Optional because it is: a decoder assembled without one still handles
   * every format a browser can open, and the tests that care about the
   * decisions around a decode should not have to provide a megabyte of
   * WebAssembly to make them.
   */
  readonly decodeHeic?: (bytes: Uint8Array) => Promise<BitmapLike | undefined>;
  /**
   * A drawing surface of exactly this size, or undefined where one cannot be
   * had — a browser with the canvas disabled, or a size it refuses.
   *
   * Returns the CONTEXT rather than the canvas. The decoder never needs the
   * element, and handing it one would mean narrowing an interface that a real
   * canvas does not structurally satisfy, which is a cast this codebase does
   * not allow itself.
   */
  readonly createSurface: (widthPx: number, heightPx: number) => DecodeCanvasContext | undefined;
}
