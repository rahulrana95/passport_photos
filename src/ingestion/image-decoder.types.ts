import type { PixelBuffer } from '@/testing/fixtures/synthetic-head.types';
import type { ExifOrientation } from './exif-orientation.types';
import type { ImageFormat } from './image-format.constants';
import type { Dimensions, WorkingSize } from './downscale.utils';

export interface DecodeRequest {
  readonly bytes: Uint8Array;
  readonly format: ImageFormat;
  /** Already read from the file; the decoder applies it, never re-reads it. */
  readonly orientation: ExifOrientation;
  /** Longest edge of the working copy. The decoder must never exceed it. */
  readonly maxEdgePx: number;
}

export interface DecodedImage {
  /** The corrected source, at full resolution. Never the stored dimensions. */
  readonly source: Dimensions;
  /** The downscaled copy the analysis runs on, orientation already applied. */
  readonly working: PixelBuffer;
  /** True for a GIF or WebP carrying more than one frame. */
  readonly isAnimated: boolean;
}

/**
 * The seam between ingestion and the browser.
 *
 * Decoding needs createImageBitmap and a canvas, neither of which exists in
 * jsdom, so every decision around the decode is testable and only the decode
 * itself is not — the same split the analysis worker uses for its models.
 *
 * Returns undefined for a file it cannot read. A damaged JPEG is an expected
 * input, not an exceptional one: people upload photos that stopped halfway
 * through a transfer every day.
 */
export interface ImageDecoder {
  readonly decode: (request: DecodeRequest) => Promise<DecodedImage | undefined>;
  /** Whether this decoder can handle the format at all, before it is given one. */
  readonly canDecode: (format: ImageFormat) => boolean;
}

export interface IngestedImage {
  readonly format: ImageFormat;
  readonly orientation: ExifOrientation;
  readonly source: Dimensions;
  readonly working: PixelBuffer;
  readonly workingSize: WorkingSize;
  readonly capturedAt?: Date;
}
