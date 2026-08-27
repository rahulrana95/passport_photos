import type { FrameCanvasContext, VideoFrameSource } from './frame-grabber.types';

export interface StillCanvas {
  width: number;
  height: number;
  getContext(contextId: '2d'): FrameCanvasContext | null;
  toBlob(callback: (blob: Blob | null) => void, type?: string, quality?: number): void;
}

export interface CaptureStillOptions {
  /**
   * Null is a first-class answer, not a defensive check.
   *
   * "Is there anything to capture?" has several answers — no element yet, no
   * frame yet, no dimensions yet — and they all mean the same thing to the
   * caller. Keeping them together here means the caller has one branch
   * instead of four, and this is the one place any of them is testable.
   */
  readonly video: (VideoFrameSource & CanvasImageSource) | null;
  readonly canvas: StillCanvas;
  readonly mimeType: string;
  readonly quality: number;
}
