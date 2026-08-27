import { vi } from 'vitest';
import { CHANNELS_PER_PIXEL } from './fixtures/pixel-format.constants';
import type { FrameCanvas, FrameCanvasContext, VideoFrameSource } from '@/camera/frame-grabber.types';
import type { StillCanvas } from '@/camera/capture-still.types';

/**
 * A canvas that records what was drawn on it.
 *
 * jsdom implements no canvas at all, and the two things worth asserting here
 * are numbers passed to it: the size a frame was scaled to, and the size a
 * still was captured at. A stub that records them tests exactly that, where a
 * real canvas would test the browser's.
 */
export class StubCanvas implements FrameCanvas, StillCanvas {
  width = 0;
  height = 0;

  readonly drawn: { readonly width: number; readonly height: number }[] = [];
  readonly requested: { readonly width: number; readonly height: number }[] = [];

  constructor(private readonly context2d: FrameCanvasContext | null = null) {}

  getContext(): FrameCanvasContext | null {
    if (this.context2d !== null) return this.context2d;

    return {
      drawImage: (_source, _dx, _dy, dWidth, dHeight) => {
        this.drawn.push({ width: dWidth, height: dHeight });
      },
      getImageData: (_sx, _sy, sw, sh) => {
        this.requested.push({ width: sw, height: sh });
        return {
          width: sw,
          height: sh,
          data: new Uint8ClampedArray(sw * sh * CHANNELS_PER_PIXEL),
        } as ImageData;
      },
    };
  }

  toBlob = vi.fn((callback: (blob: Blob | null) => void) => {
    callback(new Blob([new Uint8Array(1)], { type: 'image/jpeg' }));
  });
}

/** A video element as far as these two modules are concerned. */
export const stubVideo = (
  overrides: Partial<VideoFrameSource> = {},
): VideoFrameSource & CanvasImageSource =>
  ({
    videoWidth: 1_920,
    videoHeight: 1_080,
    readyState: 2,
    ...overrides,
  }) as VideoFrameSource & CanvasImageSource;
