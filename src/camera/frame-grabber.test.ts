import { describe, expect, it } from 'vitest';
import { grabFrame, HAVE_CURRENT_DATA } from './frame-grabber';
import { StubCanvas, stubVideo } from '@/testing/frame-canvas.stub';

const MAX_EDGE_PX = 640;

describe('grabFrame', () => {
  it('returns a buffer at the analysis size, not the sensor size', () => {
    // The detector runs every few hundred milliseconds on a phone that is also
    // encoding video. Handing it 1920x1080 spends the whole budget on pixels
    // the landmark model discards immediately.
    const frame = grabFrame({ video: stubVideo(), canvas: new StubCanvas(), maxEdgePx: MAX_EDGE_PX });

    expect(frame).toMatchObject({ width: 640, height: 360 });
  });

  it('sizes the canvas to match, so no border is sampled', () => {
    const canvas = new StubCanvas();

    grabFrame({ video: stubVideo(), canvas, maxEdgePx: MAX_EDGE_PX });

    expect({ width: canvas.width, height: canvas.height }).toEqual({ width: 640, height: 360 });
  });

  it('reads the whole canvas back', () => {
    const canvas = new StubCanvas();

    grabFrame({ video: stubVideo(), canvas, maxEdgePx: MAX_EDGE_PX });

    expect(canvas.requested).toEqual([{ width: 640, height: 360 }]);
  });

  it('measures the stream, not the element it is displayed in', () => {
    // A preview laid out at 360 CSS pixels still carries 1920x1080 of picture.
    const canvas = new StubCanvas();

    grabFrame({ video: stubVideo({ videoWidth: 1_280, videoHeight: 720 }), canvas, maxEdgePx: 1_600 });

    expect(canvas.drawn).toEqual([{ width: 1_280, height: 720 }]);
  });

  it('waits rather than drawing a frame that does not exist yet', () => {
    const frame = grabFrame({
      video: stubVideo({ readyState: HAVE_CURRENT_DATA - 1 }),
      canvas: new StubCanvas(),
      maxEdgePx: MAX_EDGE_PX,
    });

    expect(frame).toBeUndefined();
  });

  it('waits while the stream still reports no dimensions', () => {
    // A video element is 0x0 until metadata arrives, and getImageData on a
    // zero-sized canvas throws in every browser.
    expect(
      grabFrame({
        video: stubVideo({ videoWidth: 0, videoHeight: 0 }),
        canvas: new StubCanvas(),
        maxEdgePx: MAX_EDGE_PX,
      }),
    ).toBeUndefined();
  });

  it('gives up quietly when no 2D context can be had', () => {
    const canvas = { width: 0, height: 0, getContext: () => null };

    expect(
      grabFrame({ video: stubVideo(), canvas, maxEdgePx: MAX_EDGE_PX }),
    ).toBeUndefined();
  });
});
