import type { BitmapLike, DecodeCanvasContext } from '@/ingestion/browser-decoder.types';
import { CHANNELS_PER_PIXEL } from './fixtures/pixel-format.constants';

export interface RecordedDraw {
  readonly dx: number;
  readonly dy: number;
  readonly dWidth: number;
  readonly dHeight: number;
}

export type RecordedOperation =
  | { readonly kind: 'translate'; readonly x: number; readonly y: number }
  | { readonly kind: 'rotate'; readonly radians: number }
  | { readonly kind: 'scale'; readonly x: number; readonly y: number }
  | ({ readonly kind: 'draw' } & RecordedDraw);

/**
 * A drawing surface that records what was asked of it.
 *
 * The decoder's correctness is entirely in the numbers it passes to a canvas:
 * the order the transforms are set up in, the sign of the mirror, and whether
 * the draw size has its axes exchanged. Asserting that from pixels means
 * asserting it from a real browser, which the unit suite has none of — and
 * the mirrored orientations, where a wrong answer looks completely plausible,
 * are exactly the ones worth pinning here.
 *
 * The pixels are left to the browser suite, which is what pixels are for.
 */
export class RecordingDecodeSurface implements DecodeCanvasContext {
  readonly operations: RecordedOperation[] = [];

  constructor(
    private readonly widthPx: number,
    private readonly heightPx: number,
  ) {}

  translate(x: number, y: number): void {
    this.operations.push({ kind: 'translate', x, y });
  }

  rotate(radians: number): void {
    this.operations.push({ kind: 'rotate', radians });
  }

  scale(x: number, y: number): void {
    this.operations.push({ kind: 'scale', x, y });
  }

  drawImage(_source: BitmapLike, dx: number, dy: number, dWidth: number, dHeight: number): void {
    this.operations.push({ kind: 'draw', dx, dy, dWidth, dHeight });
  }

  getImageData(_sx: number, _sy: number, sw: number, sh: number): ImageData {
    return {
      width: sw,
      height: sh,
      data: new Uint8ClampedArray(sw * sh * CHANNELS_PER_PIXEL),
    } as ImageData;
  }

  /** The single draw the decoder makes, for a test that only cares about it. */
  get draw(): RecordedDraw | undefined {
    return this.operations.find((operation) => operation.kind === 'draw');
  }

  get size(): { readonly widthPx: number; readonly heightPx: number } {
    return { widthPx: this.widthPx, heightPx: this.heightPx };
  }
}

/** A decoded frame of a stated size, which is all the decoder reads off one. */
export const stubBitmap = (width: number, height: number): BitmapLike & { closed: () => number } => {
  let closes = 0;

  return {
    width,
    height,
    close: (): void => {
      closes += 1;
    },
    closed: (): number => closes,
  };
};
