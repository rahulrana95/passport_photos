import { fitWithin } from './fit-within.utils';
import type { GrabFrameOptions, GrabbedFrame } from './frame-grabber.types';

/**
 * HTMLMediaElement.HAVE_CURRENT_DATA — there is a frame to draw.
 *
 * Written out rather than read off the constructor because this module is
 * given a narrowed interface, not an element, and because the same number has
 * to hold in a test where there is no HTMLMediaElement at all.
 */
export const HAVE_CURRENT_DATA = 2;

/**
 * Takes one frame off the camera, at a size worth analysing.
 *
 * Downscaled on the way out, and not as an optimisation: the detector runs
 * every few hundred milliseconds on a phone that is also encoding video, and
 * handing it the full 1920x1080 would spend the whole budget on pixels the
 * landmark model immediately discards. The still pipeline made the same
 * decision for the same reason.
 *
 * Returns undefined rather than an empty buffer when there is nothing to draw.
 * A video element reports 0x0 until metadata arrives, and a zero-sized
 * getImageData throws in every browser — so the loop has to be able to ask
 * before the camera is ready and be told "not yet".
 */
export const grabFrame = (options: GrabFrameOptions): GrabbedFrame | undefined => {
  const { video, canvas, maxEdgePx } = options;

  if (video.readyState < HAVE_CURRENT_DATA) return undefined;
  if (video.videoWidth <= 0 || video.videoHeight <= 0) return undefined;

  const size = fitWithin(video.videoWidth, video.videoHeight, maxEdgePx);

  canvas.width = size.width;
  canvas.height = size.height;

  const context = canvas.getContext('2d');
  if (context === null) return undefined;

  context.drawImage(video, 0, 0, size.width, size.height);
  const image = context.getImageData(0, 0, size.width, size.height);

  return {
    width: image.width,
    height: image.height,
    data: image.data as Uint8ClampedArray<ArrayBuffer>,
  };
};
