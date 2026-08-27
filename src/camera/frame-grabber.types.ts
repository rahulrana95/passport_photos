import type { PixelBuffer } from '@/testing/fixtures/synthetic-head.types';

/**
 * The part of a <video> this reads.
 *
 * `videoWidth`/`videoHeight` are the SENSOR's dimensions, not the element's.
 * That distinction is the whole reason this interface is narrowed by hand: a
 * preview laid out at 360 CSS pixels is still carrying 1920x1080 of picture,
 * and measuring the element instead of the stream is how guidance ends up
 * computed on a tenth of the detail that is actually there.
 */
export interface VideoFrameSource {
  readonly videoWidth: number;
  readonly videoHeight: number;
  readonly readyState: number;
}

/** The 2D context operations a frame grab needs, and no others. */
export interface FrameCanvasContext {
  drawImage(
    source: CanvasImageSource,
    dx: number,
    dy: number,
    dWidth: number,
    dHeight: number,
  ): void;
  getImageData(sx: number, sy: number, sw: number, sh: number): ImageData;
}

export interface FrameCanvas {
  width: number;
  height: number;
  getContext(contextId: '2d'): FrameCanvasContext | null;
}

export interface GrabFrameOptions {
  readonly video: VideoFrameSource & CanvasImageSource;
  readonly canvas: FrameCanvas;
  /** Longest edge of the buffer handed to the detector. */
  readonly maxEdgePx: number;
}

export type GrabbedFrame = PixelBuffer;
