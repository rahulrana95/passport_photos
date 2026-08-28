import { CHANNELS_PER_PIXEL } from './heic-decoder.constants';
import type { HeifImage, LibheifModule } from './heic-decoder.types';

/**
 * A HEIC file's pixels, decoded in the browser and nowhere else.
 *
 * NO TRANSCODE. The obvious implementation converts HEIC to a JPEG and then
 * decodes that, and it costs a whole lossy generation before the photograph
 * has even been measured — on top of the one the export already spends. What
 * comes out of here is the raw RGBA libheif read out of the file, which is the
 * best fidelity available to us: exactly one lossy step, at the end, where it
 * is unavoidable because the authority wants a JPEG.
 */
export const decodeHeicToPixels = async (
  bytes: Uint8Array,
  libheif: LibheifModule,
): Promise<ImageData | undefined> => {
  const images = new libheif.HeifDecoder().decode(bytes);
  const image = primaryImage(images);

  if (image === undefined) return undefined;

  const width = image.get_width();
  const height = image.get_height();

  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    return freeAnd(images, undefined);
  }

  const sink = {
    width,
    height,
    data: new Uint8ClampedArray(width * height * CHANNELS_PER_PIXEL),
  };

  const filled = await new Promise<boolean>((resolve) => {
    // Callback-style rather than a promise, because libheif's binding is, and
    // it reports failure by passing nothing rather than by throwing.
    image.display(sink, (result) => { resolve(result !== undefined); });
  });

  return freeAnd(images, filled ? new ImageData(sink.data, width, height) : undefined);
};

/**
 * The largest image in the file, which is the photograph.
 *
 * A HEIC is a container and routinely holds more than one top-level image: a
 * thumbnail, the frames of a Live Photo, the exposures of a burst. Taking the
 * first would sooner or later hand somebody their own thumbnail, upscaled,
 * and every sharpness check would fail on a photograph that was never blurry.
 *
 * Largest wins and ties go to the earliest, which is the primary item in every
 * file where the sizes are equal.
 */
const primaryImage = (images: readonly HeifImage[]): HeifImage | undefined => {
  let best: HeifImage | undefined;
  let bestPixels = 0;

  for (const candidate of images) {
    const pixels = candidate.get_width() * candidate.get_height();
    if (pixels > bestPixels) {
      best = candidate;
      bestPixels = pixels;
    }
  }
  return best;
};

/**
 * Releases every image the container held, including the ones not chosen.
 *
 * libheif hands back WebAssembly heap allocations that the JavaScript
 * collector knows nothing about. A burst photo decoded and dropped leaks every
 * frame it contained, and the second upload in a session is the one that runs
 * out of memory.
 */
const freeAnd = <T>(images: readonly HeifImage[], result: T): T => {
  for (const image of images) image.free?.();
  return result;
};
