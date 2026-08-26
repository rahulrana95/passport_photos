import { ANALYSIS_WORKING_EDGE_PX } from '@/constants/limits.constants';

export interface Dimensions {
  readonly widthPx: number;
  readonly heightPx: number;
}

/**
 * The size analysis runs at, and the factor needed to map a result back.
 *
 * Two things are always true of the result and both matter. It never upscales:
 * enlarging a small photo invents detail, and a landmark measured on invented
 * detail is a measurement of nothing. And `scaleToSource` is exact, so a
 * landmark found on the working copy maps back onto the original the user
 * downloads — the crop is always computed against full resolution.
 */
export interface WorkingSize extends Dimensions {
  /** Multiply a working-copy coordinate by this to reach the source. */
  readonly scaleToSource: number;
  readonly isDownscaled: boolean;
}

/**
 * Fits dimensions inside a square of `maxEdgePx` without distorting them.
 *
 * Rounds each axis rather than flooring both. Flooring a 4032x3024 image to a
 * 1600 edge loses most of a pixel on the short axis, which shifts the aspect
 * ratio by enough to move a borderline head-height measurement across a band
 * edge — the one thing the measurement layer is built not to do.
 */
export const fitWithin = (source: Dimensions, maxEdgePx: number): Dimensions => {
  const longestEdge = Math.max(source.widthPx, source.heightPx);
  if (longestEdge <= maxEdgePx) return source;

  const factor = maxEdgePx / longestEdge;

  return {
    widthPx: Math.max(1, Math.round(source.widthPx * factor)),
    heightPx: Math.max(1, Math.round(source.heightPx * factor)),
  };
};

export const planWorkingSize = (
  source: Dimensions,
  maxEdgePx: number = ANALYSIS_WORKING_EDGE_PX,
): WorkingSize => {
  const fitted = fitWithin(source, maxEdgePx);
  const isDownscaled = fitted.widthPx !== source.widthPx || fitted.heightPx !== source.heightPx;

  return {
    ...fitted,
    // Taken from the longest edge, the axis the fit was computed on. Deriving
    // it from the short axis would compound that axis's rounding error into
    // every coordinate mapped back to the source.
    scaleToSource: isDownscaled
      ? Math.max(source.widthPx, source.heightPx) / Math.max(fitted.widthPx, fitted.heightPx)
      : 1,
    isDownscaled,
  };
};

/** Maps a coordinate measured on the working copy back onto the source. */
export const toSourceCoordinate = (value: number, working: WorkingSize): number =>
  value * working.scaleToSource;
