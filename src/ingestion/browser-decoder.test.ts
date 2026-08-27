import { describe, expect, it, vi } from 'vitest';
import { ANALYSIS_WORKING_EDGE_PX } from '@/constants/limits.constants';
import { EXIF_ORIENTATIONS } from './exif-orientation.constants';
import { JPEG_SIGNATURE } from './image-format.constants';
import { RecordingDecodeSurface, stubBitmap } from '@/testing/recording-decode-surface';
import { createBrowserDecoder } from './browser-decoder';
import type { BitmapLike, DecodeEnvironment } from './browser-decoder.types';
import type { ExifOrientation } from './exif-orientation.types';

const QUARTER_TURN = Math.PI / 2;
const HALF_TURN = Math.PI;
const THREE_QUARTER_TURN = (3 * Math.PI) / 2;

const jpegBytes = (): Uint8Array => {
  const bytes = new Uint8Array(64);
  bytes.set(JPEG_SIGNATURE, 0);
  return bytes;
};

interface Harness {
  readonly environment: DecodeEnvironment;
  readonly surfaces: RecordingDecodeSurface[];
  readonly bitmap: ReturnType<typeof stubBitmap>;
}

const harness = (
  options: {
    readonly width?: number;
    readonly height?: number;
    readonly rejectBitmap?: boolean;
    readonly noSurface?: boolean;
  } = {},
): Harness => {
  const bitmap = stubBitmap(options.width ?? 800, options.height ?? 600);
  const surfaces: RecordingDecodeSurface[] = [];

  return {
    bitmap,
    surfaces,
    environment: {
      createBitmap: async (): Promise<BitmapLike> => {
        if (options.rejectBitmap === true) throw new Error('not an image');
        return bitmap;
      },
      createSurface: (widthPx, heightPx) => {
        if (options.noSurface === true) return undefined;
        const surface = new RecordingDecodeSurface(widthPx, heightPx);
        surfaces.push(surface);
        return surface;
      },
    },
  };
};

const decodeWith = async (
  test: Harness,
  orientation: ExifOrientation = 1,
  maxEdgePx: number = ANALYSIS_WORKING_EDGE_PX,
) =>
  createBrowserDecoder(test.environment).decode({
    bytes: jpegBytes(),
    format: 'jpeg',
    orientation,
    maxEdgePx,
  });

describe('what it will attempt', () => {
  it('handles the formats every target browser decodes natively', () => {
    const decoder = createBrowserDecoder(harness().environment);

    expect(decoder.canDecode('jpeg')).toBe(true);
    expect(decoder.canDecode('png')).toBe(true);
    expect(decoder.canDecode('webp')).toBe(true);
  });

  it('declines HEIC, so the reader gets the Photos instructions instead', () => {
    // Refusing here is what routes an iPhone photograph to the remedy that
    // actually works, rather than to a decode that fails without advice.
    const decoder = createBrowserDecoder(harness().environment);

    expect(decoder.canDecode('heic')).toBe(false);
    expect(decoder.canDecode('tiff')).toBe(false);
  });
});

describe('sizing', () => {
  it('reports the source at full resolution, corrected for orientation', async () => {
    const decoded = await decodeWith(harness({ width: 4000, height: 3000 }), 6);

    // Orientation 6 exchanges the axes: the stored frame is landscape and the
    // photograph is portrait.
    expect(decoded?.source).toEqual({ widthPx: 3000, heightPx: 4000 });
  });

  it('leaves the axes alone for an upright photograph', async () => {
    const decoded = await decodeWith(harness({ width: 4000, height: 3000 }), 1);

    expect(decoded?.source).toEqual({ widthPx: 4000, heightPx: 3000 });
  });

  it('downscales the working copy to the requested edge', async () => {
    const test = harness({ width: 4000, height: 3000 });

    await decodeWith(test, 1, 800);

    expect(test.surfaces[0]?.size).toEqual({ widthPx: 800, heightPx: 600 });
  });

  it('never enlarges a photograph smaller than the budget', async () => {
    // Enlarging invents detail, and a landmark measured on invented detail is
    // a measurement of nothing.
    const test = harness({ width: 320, height: 240 });

    await decodeWith(test, 1, 1_600);

    expect(test.surfaces[0]?.size).toEqual({ widthPx: 320, heightPx: 240 });
  });

  it('returns a buffer the size of the surface it drew on', async () => {
    const decoded = await decodeWith(harness({ width: 4000, height: 3000 }), 1, 800);

    expect(decoded?.working.width).toBe(800);
    expect(decoded?.working.height).toBe(600);
  });
});

describe('orientation', () => {
  /**
   * The transform each orientation must produce, worked out from the EXIF
   * specification rather than from the implementation.
   *
   * 2, 4, 5 and 7 are the mirrored ones. They are the whole reason this table
   * is written out: rotating by the obvious angle gives a picture that looks
   * upright and is laterally flipped, which on a passport photograph puts
   * every asymmetry in the face on the wrong side and nobody can tell.
   */
  const EXPECTED: Readonly<
    Record<ExifOrientation, { readonly radians: number; readonly mirrored: boolean }>
  > = {
    1: { radians: 0, mirrored: false },
    2: { radians: 0, mirrored: true },
    3: { radians: HALF_TURN, mirrored: false },
    4: { radians: HALF_TURN, mirrored: true },
    5: { radians: QUARTER_TURN, mirrored: true },
    6: { radians: QUARTER_TURN, mirrored: false },
    7: { radians: THREE_QUARTER_TURN, mirrored: true },
    8: { radians: THREE_QUARTER_TURN, mirrored: false },
  };

  it.each(EXIF_ORIENTATIONS)('rotates orientation %i by the angle EXIF states', async (orientation) => {
    const test = harness();

    await decodeWith(test, orientation);

    const rotation = test.surfaces[0]?.operations.find((operation) => operation.kind === 'rotate');
    expect(rotation?.radians).toBeCloseTo(EXPECTED[orientation].radians, 6);
  });

  it.each(EXIF_ORIENTATIONS)('mirrors orientation %i only when EXIF says to', async (orientation) => {
    const test = harness();

    await decodeWith(test, orientation);

    const mirror = test.surfaces[0]?.operations.find((operation) => operation.kind === 'scale');
    expect(mirror !== undefined).toBe(EXPECTED[orientation].mirrored);
    if (mirror !== undefined) expect(mirror.x).toBe(-1);
  });

  it('sets the mirror up after the rotation, so it is applied before it', async () => {
    // Canvas transforms apply to the coordinate system, so the last one set up
    // is the first to affect what is drawn. Written the other way round this
    // produces a picture that is rotated correctly and flipped.
    const test = harness();

    await decodeWith(test, 5);

    const kinds = test.surfaces[0]?.operations.map((operation) => operation.kind);
    expect(kinds).toEqual(['translate', 'rotate', 'scale', 'draw']);
  });

  it('draws from the centre, which is what the rotation turns about', async () => {
    const test = harness({ width: 800, height: 600 });

    await decodeWith(test, 1, 800);

    expect(test.surfaces[0]?.operations[0]).toEqual({ kind: 'translate', x: 400, y: 300 });
    expect(test.surfaces[0]?.draw).toMatchObject({ dx: -400, dy: -300 });
  });

  it('exchanges the draw axes for a quarter turn', async () => {
    // The rotation has already exchanged them in the canvas, so the draw size
    // has to put them back or the photograph is squashed into the wrong shape.
    const test = harness({ width: 800, height: 600 });

    await decodeWith(test, 6, 800);

    // Surface is portrait 600x800; the frame is drawn at its own 800x600.
    expect(test.surfaces[0]?.size).toEqual({ widthPx: 600, heightPx: 800 });
    expect(test.surfaces[0]?.draw).toMatchObject({ dWidth: 800, dHeight: 600 });
  });

  it('leaves the draw axes alone for a half turn', async () => {
    const test = harness({ width: 800, height: 600 });

    await decodeWith(test, 3, 800);

    expect(test.surfaces[0]?.draw).toMatchObject({ dWidth: 800, dHeight: 600 });
  });
});

describe('animation', () => {
  it('reports a still as a still', async () => {
    const decoded = await decodeWith(harness());

    expect(decoded?.isAnimated).toBe(false);
  });

  it('reads the animation flag from the bytes, not from the decoded frame', async () => {
    // createImageBitmap hands back one frame from an animation without
    // complaint, so a decoder that trusted it would silently analyse frame one
    // of a GIF and report on a photograph the reader never chose.
    const test = harness();
    const gif = new Uint8Array([
      ...[...'GIF89a'].map((c) => c.charCodeAt(0)),
      1, 0, 1, 0, 0x00, 0, 0,
      0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0x00, 2, 1, 0x00, 0,
      0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0x00, 2, 1, 0x00, 0,
      0x3b,
    ]);

    const decoded = await createBrowserDecoder(test.environment).decode({
      bytes: gif,
      format: 'gif',
      orientation: 1,
      maxEdgePx: 800,
    });

    expect(decoded?.isAnimated).toBe(true);
  });
});

describe('when it cannot produce pixels', () => {
  it('returns nothing for a file the browser refuses to decode', async () => {
    // A damaged JPEG is an expected input, not an exceptional one.
    expect(await decodeWith(harness({ rejectBitmap: true }))).toBeUndefined();
  });

  it('returns nothing when no drawing surface can be had', async () => {
    expect(await decodeWith(harness({ noSurface: true }))).toBeUndefined();
  });

  it('returns nothing for a frame with no dimensions', async () => {
    expect(await decodeWith(harness({ width: 0, height: 0 }))).toBeUndefined();
  });

  it('frees the decoded frame even when it gives up', async () => {
    // Tens of megabytes on a phone photograph, and the collector has no reason
    // to hurry over it.
    const test = harness({ noSurface: true });

    await decodeWith(test);

    expect(test.bitmap.closed()).toBe(1);
  });

  it('frees the decoded frame on the way out of a successful decode', async () => {
    const test = harness();

    await decodeWith(test);

    expect(test.bitmap.closed()).toBe(1);
  });

  it('asks the browser not to apply the file’s own orientation', async () => {
    // The orientation is already on the request, read once from the file.
    // Letting the browser apply it as well rotates the photograph twice.
    const createBitmap = vi.fn(async () => stubBitmap(800, 600));

    await createBrowserDecoder({
      createBitmap,
      createSurface: (w, h) => new RecordingDecodeSurface(w, h),
    }).decode({ bytes: jpegBytes(), format: 'jpeg', orientation: 1, maxEdgePx: 800 });

    expect(createBitmap).toHaveBeenCalledWith(expect.any(Blob));
  });
});
