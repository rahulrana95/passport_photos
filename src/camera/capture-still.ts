import { HAVE_CURRENT_DATA } from './frame-grabber';
import type { CaptureStillOptions } from './capture-still.types';

/**
 * Takes the actual photograph, at the size the sensor is producing.
 *
 * `videoWidth`/`videoHeight`, never the element's layout size. The preview is
 * a few hundred CSS pixels on a phone and the stream behind it is 1920x1080;
 * capturing what is on screen would hand somebody a passport photograph with a
 * tenth of the detail their camera actually took, and no amount of downstream
 * care recovers it.
 *
 * NOTHING MIRRORS THE CAPTURE. The front-camera preview is flipped so that
 * moving left looks like moving left, and that flip is a CSS transform on the
 * element — drawImage reads the stream, which was never flipped. This function
 * therefore has no un-mirroring step, and must never grow one: a mirrored
 * passport photograph is rejected for having the parting on the wrong side,
 * and it is not a thing the reader can see is wrong.
 */
export const captureStill = async (options: CaptureStillOptions): Promise<Blob | undefined> => {
  const { video, canvas } = options;

  if (video === null) return undefined;
  if (video.readyState < HAVE_CURRENT_DATA) return undefined;
  if (video.videoWidth <= 0 || video.videoHeight <= 0) return undefined;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const context = canvas.getContext('2d');
  if (context === null) return undefined;

  context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

  return new Promise<Blob | undefined>((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(blob ?? undefined);
      },
      options.mimeType,
      options.quality,
    );
  });
};
