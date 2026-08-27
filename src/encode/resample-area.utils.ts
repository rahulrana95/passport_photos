import {
  ALPHA_OPAQUE,
  CHANNEL_OFFSET_ALPHA,
  CHANNEL_OFFSET_BLUE,
  CHANNEL_OFFSET_GREEN,
  CHANNEL_OFFSET_RED,
  CHANNELS_PER_PIXEL,
} from '@/testing/fixtures/pixel-format.constants';
import type { CropRect } from '@/geometry/geometry.types';
import type { PixelBuffer } from '@/testing/fixtures/synthetic-head.types';

export interface TargetSize {
  readonly widthPx: number;
  readonly heightPx: number;
}

/**
 * Crops and resizes in one pass, by averaging the source area each output
 * pixel covers.
 *
 * AREA AVERAGING RATHER THAN SAMPLING, and this is the whole reason the
 * function exists. Reducing a 4000-pixel photograph to 600 means each output
 * pixel stands for roughly forty source pixels; taking one of the forty and
 * discarding the rest is what produces the stair-stepped hairline and the
 * shimmering fabric that read, to a human and to a compliance officer, as a
 * photograph that has been messed with. Averaging them is both the correct
 * answer and the one that compresses smaller afterwards, because the noise
 * that costs the most bytes averages away.
 *
 * Written here rather than delegated to a canvas because the output is a
 * measurement: the same photograph must produce the same file on every device,
 * and drawImage smoothing is quality-hinted, browser-specific and untestable
 * outside a browser. It is also why this is straightforward to prove correct —
 * a flat region averages to itself, and a two-to-one reduction of a known
 * pattern has an answer you can work out on paper.
 *
 * UPSCALING IS NOT HANDLED WELL, deliberately. Where the target is larger than
 * the crop each output pixel covers less than one input pixel and this
 * degrades to nearest-neighbour. The geometry engine refuses to plan a crop
 * that would need upscaling — inventing detail is itself a rejection reason —
 * so the case cannot arise from a real photograph, and building a bicubic path
 * for it would be building the good version of something we have decided not
 * to do.
 */
export const resampleArea = (
  source: PixelBuffer,
  crop: CropRect,
  target: TargetSize,
): PixelBuffer => {
  const data = new Uint8ClampedArray(target.widthPx * target.heightPx * CHANNELS_PER_PIXEL);
  const scaleX = crop.widthPx / target.widthPx;
  const scaleY = crop.heightPx / target.heightPx;

  for (let y = 0; y < target.heightPx; y += 1) {
    const fromY = Math.max(0, Math.floor(crop.y + y * scaleY));
    const toY = Math.min(source.height, Math.max(fromY + 1, Math.ceil(crop.y + (y + 1) * scaleY)));

    for (let x = 0; x < target.widthPx; x += 1) {
      const fromX = Math.max(0, Math.floor(crop.x + x * scaleX));
      const toX = Math.min(
        source.width,
        Math.max(fromX + 1, Math.ceil(crop.x + (x + 1) * scaleX)),
      );

      let red = 0;
      let green = 0;
      let blue = 0;
      let samples = 0;

      for (let sourceY = fromY; sourceY < toY; sourceY += 1) {
        for (let sourceX = fromX; sourceX < toX; sourceX += 1) {
          const offset = (sourceY * source.width + sourceX) * CHANNELS_PER_PIXEL;
          red += Number(source.data[offset + CHANNEL_OFFSET_RED]);
          green += Number(source.data[offset + CHANNEL_OFFSET_GREEN]);
          blue += Number(source.data[offset + CHANNEL_OFFSET_BLUE]);
          samples += 1;
        }
      }

      // No zero guard on samples. Both spans are forced to at least one pixel
      // above, and both are clamped inside the source, so a span is empty only
      // when the crop begins past the end of the image — which planCrop
      // rejects as crop-outside-source before anything reaches here.
      const offset = (y * target.widthPx + x) * CHANNELS_PER_PIXEL;
      data[offset + CHANNEL_OFFSET_RED] = red / samples;
      data[offset + CHANNEL_OFFSET_GREEN] = green / samples;
      data[offset + CHANNEL_OFFSET_BLUE] = blue / samples;
      data[offset + CHANNEL_OFFSET_ALPHA] = ALPHA_OPAQUE;
    }
  }

  return { width: target.widthPx, height: target.heightPx, data };
};
