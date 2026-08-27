import { DEGREES_PER_RADIAN, HALF } from '@/measurement/angle.constants';
import { FORMAT_MIME_TYPES, NATIVELY_DECODABLE_FORMATS } from './image-format.constants';
import { isAnimatedSource } from './animated-source.utils';
import { orientedDimensions, transformForOrientation } from './exif-orientation.utils';
import { planWorkingSize } from './downscale.utils';
import type { Dimensions } from './downscale.utils';
import type {
  BitmapLike,
  DecodeCanvasContext,
  DecodeEnvironment,
} from './browser-decoder.types';
import type { DecodeRequest, DecodedImage, ImageDecoder } from './image-decoder.types';
import type { ImageFormat } from './image-format.constants';
import type { OrientationTransform } from './exif-orientation.types';

/**
 * Turns whatever the reader chose into pixels, upright and the right way round.
 *
 * The orientation is APPLIED HERE and read nowhere. It arrives on the request,
 * having been read once from the file's EXIF, and the bitmap is decoded with
 * the browser's own orientation handling switched off — otherwise a photograph
 * from a phone held sideways is rotated twice and ends up on its other side.
 *
 * The mirrored orientations, 2, 4, 5 and 7, are the ones that matter most and
 * the ones every naive implementation drops: rotating by the obvious angle
 * produces a picture that looks upright and is laterally flipped. On a
 * passport photograph that puts every asymmetry in the face on the wrong side,
 * and nobody looking at it can tell.
 */
export const createBrowserDecoder = (environment: DecodeEnvironment): ImageDecoder => {
  const canDecode = (format: ImageFormat): boolean =>
    NATIVELY_DECODABLE_FORMATS.includes(format);

  const decode = async (request: DecodeRequest): Promise<DecodedImage | undefined> => {
    const { bytes, format, orientation, maxEdgePx } = request;

    // A damaged JPEG is an expected input, not an exceptional one. People
    // upload photographs that stopped halfway through a transfer every day.
    const bitmap = await environment
      .createBitmap(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: FORMAT_MIME_TYPES[format] }))
      .catch(() => undefined);

    if (bitmap === undefined) return undefined;

    try {
      const source = orientedDimensions(bitmap.width, bitmap.height, orientation);
      if (source.widthPx <= 0 || source.heightPx <= 0) return undefined;

      const working = planWorkingSize(source, maxEdgePx);
      const context = environment.createSurface(working.widthPx, working.heightPx);
      if (context === undefined) return undefined;

      paint(context, bitmap, working, transformForOrientation(orientation));

      const image = context.getImageData(0, 0, working.widthPx, working.heightPx);

      return {
        source,
        working: {
          width: image.width,
          height: image.height,
          data: image.data as Uint8ClampedArray<ArrayBuffer>,
        },
        isAnimated: isAnimatedSource(bytes, format),
      };
    } finally {
      // Always, including on the paths that return undefined. A frame left
      // open is tens of megabytes the collector has no reason to hurry over.
      bitmap.close();
    }
  };

  return { decode, canDecode };
};

/**
 * Draws the stored frame into the working canvas, upright.
 *
 * The order is the whole of it. Canvas transforms apply to the coordinate
 * system, so the LAST one set up is the FIRST to affect what is drawn — which
 * means "mirror, then rotate" is written as rotate, then scale, then draw.
 * Written the other way round it produces a picture that is rotated correctly
 * and flipped, which looks entirely plausible and puts the parting on the
 * wrong side.
 */
const paint = (
  context: DecodeCanvasContext,
  bitmap: BitmapLike,
  working: Dimensions,
  transform: OrientationTransform,
): void => {
  context.translate(working.widthPx / HALF, working.heightPx / HALF);
  context.rotate(transform.rotateDegrees / DEGREES_PER_RADIAN);
  if (transform.mirrorHorizontally) context.scale(-1, 1);

  // The size to draw at is the working size with the axes put back, because
  // the rotation above has already exchanged them in the canvas.
  const drawn = transform.swapsAxes
    ? { widthPx: working.heightPx, heightPx: working.widthPx }
    : working;

  context.drawImage(
    bitmap,
    -drawn.widthPx / HALF,
    -drawn.heightPx / HALF,
    drawn.widthPx,
    drawn.heightPx,
  );
};
