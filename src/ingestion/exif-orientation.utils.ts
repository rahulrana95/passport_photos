import {
  EXIF_ORIENTATIONS,
  HALF_TURN_DEGREES,
  NO_ROTATION,
  QUARTER_TURN_DEGREES,
  THREE_QUARTER_TURN_DEGREES,
} from './exif-orientation.constants';
import type { ExifOrientation, OrientationTransform } from './exif-orientation.types';

/**
 * The correction each stored orientation requires.
 *
 * Written out rather than derived. The mapping is genuinely not a formula —
 * 5 and 7 differ only in rotation direction after the same mirror — and a
 * clever derivation here would be a subtle, silent, face-flipping bug.
 */
const TRANSFORMS: Readonly<Record<ExifOrientation, OrientationTransform>> = {
  1: { rotateDegrees: NO_ROTATION, mirrorHorizontally: false, swapsAxes: false },
  2: { rotateDegrees: NO_ROTATION, mirrorHorizontally: true, swapsAxes: false },
  3: { rotateDegrees: HALF_TURN_DEGREES, mirrorHorizontally: false, swapsAxes: false },
  4: { rotateDegrees: HALF_TURN_DEGREES, mirrorHorizontally: true, swapsAxes: false },
  5: { rotateDegrees: QUARTER_TURN_DEGREES, mirrorHorizontally: true, swapsAxes: true },
  6: { rotateDegrees: QUARTER_TURN_DEGREES, mirrorHorizontally: false, swapsAxes: true },
  7: { rotateDegrees: THREE_QUARTER_TURN_DEGREES, mirrorHorizontally: true, swapsAxes: true },
  8: { rotateDegrees: THREE_QUARTER_TURN_DEGREES, mirrorHorizontally: false, swapsAxes: true },
};

export const isExifOrientation = (value: number): value is ExifOrientation =>
  (EXIF_ORIENTATIONS as readonly number[]).includes(value);

/** Orientation 1 — upright and unmirrored — is what an absent tag means. */
export const DEFAULT_ORIENTATION: ExifOrientation = 1;

export const transformForOrientation = (orientation: ExifOrientation): OrientationTransform =>
  TRANSFORMS[orientation];

/** Dimensions after correction. Half the orientations exchange the two axes. */
export const orientedDimensions = (
  widthPx: number,
  heightPx: number,
  orientation: ExifOrientation,
): { readonly widthPx: number; readonly heightPx: number } =>
  TRANSFORMS[orientation].swapsAxes
    ? { widthPx: heightPx, heightPx: widthPx }
    : { widthPx, heightPx };
