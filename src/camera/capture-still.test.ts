import { describe, expect, it, vi } from 'vitest';
import { captureStill } from './capture-still';
import { HAVE_CURRENT_DATA } from './frame-grabber';
import { StubCanvas, stubVideo } from '@/testing/frame-canvas.stub';

const options = (canvas: StubCanvas, video = stubVideo()) => ({
  video,
  canvas,
  mimeType: 'image/jpeg',
  quality: 0.92,
});

describe('captureStill', () => {
  it('captures at the sensor size, not the preview size', async () => {
    // The preview is a few hundred CSS pixels on a phone and the stream behind
    // it is 1920x1080. Capturing what is on screen hands somebody a passport
    // photograph with a tenth of the detail their camera actually took.
    const canvas = new StubCanvas();

    await captureStill(options(canvas));

    expect({ width: canvas.width, height: canvas.height }).toEqual({
      width: 1_920,
      height: 1_080,
    });
  });

  it('draws the frame at full size', async () => {
    const canvas = new StubCanvas();

    await captureStill(options(canvas));

    expect(canvas.drawn).toEqual([{ width: 1_920, height: 1_080 }]);
  });

  it('never un-mirrors the capture', async () => {
    // The front-camera preview is flipped by a CSS transform on the element;
    // drawImage reads the stream, which was never flipped. A capture that
    // applied a transform here would put the parting on the wrong side, and
    // that is not a thing the reader can see is wrong.
    const context = {
      drawImage: vi.fn(),
      getImageData: vi.fn(),
    };
    const canvas = new StubCanvas(context);

    await captureStill(options(canvas));

    // Four arguments after the source: a destination rectangle and nothing
    // else. No scale, no translate, no negative width.
    expect(context.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1_920, 1_080);
  });

  it('honours the requested type and quality', async () => {
    const canvas = new StubCanvas();

    await captureStill(options(canvas));

    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.92);
  });

  it('returns the encoded photograph', async () => {
    expect(await captureStill(options(new StubCanvas()))).toBeInstanceOf(Blob);
  });

  it('returns nothing when the browser could not encode one', async () => {
    const canvas = new StubCanvas();
    canvas.toBlob = vi.fn((callback: (blob: Blob | null) => void) => {
      callback(null);
    });

    expect(await captureStill(options(canvas))).toBeUndefined();
  });

  it('refuses to capture when there is no element at all', async () => {
    // The caller has one branch instead of four: no element, no frame, no
    // dimensions and no context all mean the same thing to it.
    expect(await captureStill({ ...options(new StubCanvas()), video: null })).toBeUndefined();
  });

  it('refuses to capture before there is a frame', async () => {
    expect(
      await captureStill(options(new StubCanvas(), stubVideo({ readyState: HAVE_CURRENT_DATA - 1 }))),
    ).toBeUndefined();
  });

  it('refuses to capture a stream with no dimensions yet', async () => {
    expect(
      await captureStill(options(new StubCanvas(), stubVideo({ videoWidth: 0 }))),
    ).toBeUndefined();
  });

  it('gives up quietly when no 2D context can be had', async () => {
    const canvas = new StubCanvas();
    canvas.getContext = () => null;

    expect(await captureStill(options(canvas))).toBeUndefined();
  });
});
