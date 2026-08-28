import { describe, expect, it, vi } from 'vitest';
import { CHANNELS_PER_PIXEL } from './heic-decoder.constants';
import { decodeHeicToPixels } from './decode-heic';
import type { HeifImage, HeifPixelSink, LibheifModule } from './heic-decoder.types';

/**
 * A HEIC container, without libheif.
 *
 * The megabyte of WebAssembly is not what is worth testing here — libheif can
 * decode HEIC, that is its whole job. What is worth testing is which image
 * this code picks out of a container that holds several, and whether the ones
 * it does not pick are released.
 */
const fakeImage = (
  width: number,
  height: number,
  options: { readonly fills?: boolean; readonly free?: () => void } = {},
): HeifImage => ({
  get_width: () => width,
  get_height: () => height,
  display: (sink: HeifPixelSink, done): void => {
    if (options.fills === false) {
      done(undefined);
      return;
    }
    sink.data.fill(1);
    done(sink);
  },
  ...(options.free === undefined ? {} : { free: options.free }),
});

const libheifOf = (...images: readonly HeifImage[]): LibheifModule => ({
  HeifDecoder: class {
    decode(): readonly HeifImage[] {
      return images;
    }
  },
});

describe('decoding a HEIC', () => {
  it('returns the pixels at the image’s own size', async () => {
    const decoded = await decodeHeicToPixels(new Uint8Array(), libheifOf(fakeImage(4, 3)));

    expect(decoded?.width).toBe(4);
    expect(decoded?.height).toBe(3);
    expect(decoded?.data).toHaveLength(4 * 3 * CHANNELS_PER_PIXEL);
  });

  it('picks the photograph, not the thumbnail beside it', async () => {
    // A HEIC is a container and routinely holds more than one image. Taking
    // the first would hand somebody their own thumbnail, upscaled, and every
    // sharpness check would fail on a photo that was never blurry.
    const decoded = await decodeHeicToPixels(
      new Uint8Array(),
      libheifOf(fakeImage(160, 120), fakeImage(4032, 3024)),
    );

    expect(decoded?.width).toBe(4032);
  });

  it('keeps the earliest when two images are the same size', async () => {
    // The frames of a burst or a Live Photo. The primary item comes first.
    const first = fakeImage(100, 100);
    const second = fakeImage(100, 100);
    const spy = vi.spyOn(first, 'display');

    await decodeHeicToPixels(new Uint8Array(), libheifOf(first, second));

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('frees every image, including the ones it did not choose', async () => {
    // libheif allocates on the WebAssembly heap, which the JavaScript
    // collector knows nothing about. A burst decoded and dropped leaks every
    // frame, and the second upload of a session is the one that runs out.
    const freedSmall = vi.fn();
    const freedLarge = vi.fn();

    await decodeHeicToPixels(
      new Uint8Array(),
      libheifOf(
        fakeImage(160, 120, { free: freedSmall }),
        fakeImage(4032, 3024, { free: freedLarge }),
      ),
    );

    expect(freedSmall).toHaveBeenCalledTimes(1);
    expect(freedLarge).toHaveBeenCalledTimes(1);
  });

  it('frees them even when the decode fails', async () => {
    const freed = vi.fn();

    const decoded = await decodeHeicToPixels(
      new Uint8Array(),
      libheifOf(fakeImage(4, 3, { fills: false, free: freed })),
    );

    expect(decoded).toBeUndefined();
    expect(freed).toHaveBeenCalledTimes(1);
  });

  it('survives an image that offers no way to free itself', async () => {
    const decoded = await decodeHeicToPixels(new Uint8Array(), libheifOf(fakeImage(4, 3)));

    expect(decoded).toBeDefined();
  });

  it('gives up on an empty container', async () => {
    expect(await decodeHeicToPixels(new Uint8Array(), libheifOf())).toBeUndefined();
  });

  it('gives up on a nonsense size rather than allocating for it', async () => {
    // A width of NaN or a negative height reaches new Uint8ClampedArray as a
    // throw, and a corrupt file is an expected input rather than a crash.
    for (const image of [fakeImage(Number.NaN, 10), fakeImage(-4, 10), fakeImage(0, 10), fakeImage(1.5, 10)]) {
      expect(await decodeHeicToPixels(new Uint8Array(), libheifOf(image))).toBeUndefined();
    }
  });
});
