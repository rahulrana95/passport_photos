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
   * Decodes the bytes into a frame, WITHOUT applying the file's own
   * orientation tag — the request already carries it, read once by the
   * ingestion pipeline, and letting the browser apply it as well rotates the
   * photograph twice.
   */
  readonly createBitmap: (blob: Blob) => Promise<BitmapLike>;
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
