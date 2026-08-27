import { MM_PER_INCH } from '@/constants/measurement.constants';
import { millimetresToPixels } from '@/measurement/format-measurement.utils';
import { DEFAULT_JPEG_QUALITY } from './encode.constants';
import { resampleArea } from './resample-area.utils';
import { searchQualityForBytes } from './quality-search';
import { setJfifDensity } from './jfif-density.utils';
import { stripExifSegments } from './strip-metadata.utils';
import type { CropRect } from '@/geometry/geometry.types';
import type { EncodePhotoResult } from './encode-photo.types';
import type { JpegEncoder } from './jpeg-encoder.types';
import type { PixelBuffer } from '@/testing/fixtures/synthetic-head.types';
import type { ResolvedPhotoSpec } from '@/photo-spec/photo-spec.types';

/**
 * How large the exported file should be, in pixels.
 *
 * Three constraints, and they do not always agree. The print size at the
 * stated resolution is the starting point; a digital minimum edge can demand
 * more pixels than that; a digital maximum edge can allow fewer. Several
 * authorities publish all three and only some of them are consistent.
 *
 * Scaled as a whole rather than per-axis, so the shape is always the printed
 * shape. Fitting a non-square print into a square pixel bound by stretching
 * would satisfy the numbers and produce a photograph of a differently shaped
 * person.
 */
const targetSize = (spec: ResolvedPhotoSpec): { widthPx: number; heightPx: number } => {
  const printWidth = millimetresToPixels(spec.print.widthMm, spec.print.dpi);
  const printHeight = millimetresToPixels(spec.print.heightMm, spec.print.dpi);
  const shortest = Math.min(printWidth, printHeight);
  const longest = Math.max(printWidth, printHeight);

  const growth = Math.max(1, spec.digital.minEdgePx / shortest);
  const ceiling =
    spec.digital.maxEdgePx === undefined ? growth : Math.min(growth, spec.digital.maxEdgePx / longest);

  return {
    widthPx: Math.round(printWidth * ceiling),
    heightPx: Math.round(printHeight * ceiling),
  };
};

/**
 * The resolution to declare, derived rather than copied.
 *
 * The specification's DPI describes the print size at the print pixel count.
 * Once a digital bound has changed the pixel count, that number is no longer
 * the one that makes the file print at the right physical size — and the
 * physical size is the requirement. So it is recomputed from what was actually
 * produced: these pixels, across that many millimetres.
 */
const densityFor = (widthPx: number, widthMm: number): number =>
  Math.round(widthPx / (widthMm / MM_PER_INCH));

/**
 * Produces the file the reader submits.
 *
 * The order is not arbitrary. Cropping and resampling happen first and at full
 * source resolution, so the compressor is given the image that will actually
 * be printed rather than one it has to re-compress. The metadata is written
 * last, after the size search has settled, because both operations change the
 * file's length: writing the density before the search would have the search
 * fitting a file that is about to grow, and stripping metadata after it would
 * have it fitting one that is about to shrink. Neither is wrong by much, and
 * both are wrong at exactly the boundary the ceiling exists to police.
 *
 * NOTHING IS EVER UPSCALED. A crop with fewer pixels than the output needs is
 * refused rather than enlarged: enlarging invents detail, a printer renders
 * the invention as softness, and softness is itself a rejection reason. The
 * reader is better served by being told their original is too small.
 */
export const encodePhoto = async (
  encoder: JpegEncoder,
  source: PixelBuffer,
  crop: CropRect,
  spec: ResolvedPhotoSpec,
): Promise<EncodePhotoResult> => {
  const target = targetSize(spec);

  if (crop.widthPx < target.widthPx || crop.heightPx < target.heightPx) {
    return { ok: false, reason: 'source-resolution-too-low' };
  }

  const image = resampleArea(source, crop, target);
  const dpi = densityFor(target.widthPx, spec.print.widthMm);

  const encoded =
    spec.digital.maxBytes === undefined
      ? {
          ok: true as const,
          quality: DEFAULT_JPEG_QUALITY,
          bytes: await encoder.encode(image, DEFAULT_JPEG_QUALITY),
        }
      : await searchQualityForBytes(encoder, image, spec.digital.maxBytes);

  const bytes = setJfifDensity(stripExifSegments(encoded.bytes), dpi);
  const maxBytes = spec.digital.maxBytes;

  return {
    ok: true,
    photo: {
      bytes,
      quality: encoded.quality,
      widthPx: target.widthPx,
      heightPx: target.heightPx,
      dpi,
      // Recomputed against the finished file rather than taken from the
      // search's verdict. Writing the density adds bytes, and a file that
      // fitted by a hair before the header went in does not fit after it.
      overBudget:
        maxBytes === undefined || bytes.length <= maxBytes
          ? undefined
          : { bytes: bytes.length, maxBytes },
    },
  };
};
