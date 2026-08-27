import type { PixelBuffer } from '@/testing/fixtures/synthetic-head.types';

export interface FrameLoopOptions {
  /**
   * Shortest gap between the END of one analysis and the START of the next.
   *
   * Measured from the end deliberately — see the note on backpressure in
   * createFrameLoop. A fixed-rate timer would queue work a phone cannot keep
   * up with.
   */
  readonly intervalMs: number;
  /** Returns the current frame, or undefined while the camera is not ready. */
  readonly grab: () => PixelBuffer | undefined;
  readonly onFrame: (frame: PixelBuffer) => Promise<void>;
  /**
   * Reported rather than thrown. One bad frame — a detector that timed out, a
   * canvas that went away mid-tear-down — must not stop the loop, or the
   * preview freezes with the last instruction still on screen and the reader
   * follows advice about a picture from ten seconds ago.
   */
  readonly onError?: ((error: unknown) => void) | undefined;
  readonly setTimeoutFn?: typeof setTimeout;
  readonly clearTimeoutFn?: typeof clearTimeout;
}

export interface FrameLoop {
  readonly start: () => void;
  readonly stop: () => void;
  readonly isRunning: () => boolean;
}
