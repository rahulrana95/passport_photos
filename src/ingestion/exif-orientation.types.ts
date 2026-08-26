import type {
  EXIF_ORIENTATIONS,
  HALF_TURN_DEGREES,
  NO_ROTATION,
  QUARTER_TURN_DEGREES,
  THREE_QUARTER_TURN_DEGREES,
} from './exif-orientation.constants';

/**
 * One of the eight EXIF orientation values.
 *
 * Values 2, 4, 5 and 7 are mirrored. They are rare and they are the ones every
 * naive implementation drops, because rotating by the "obvious" angle produces
 * a picture that looks upright and is laterally flipped — which for a passport
 * photo means every asymmetry in the face is on the wrong side.
 */
export type ExifOrientation = (typeof EXIF_ORIENTATIONS)[number];

/** The transform that returns an image to upright, unmirrored. */
export interface OrientationTransform {
  /** Clockwise, in degrees. */
  readonly rotateDegrees:
    | typeof NO_ROTATION
    | typeof QUARTER_TURN_DEGREES
    | typeof HALF_TURN_DEGREES
    | typeof THREE_QUARTER_TURN_DEGREES;
  /** Applied before the rotation. */
  readonly mirrorHorizontally: boolean;
  /** True when the transform exchanges width and height. */
  readonly swapsAxes: boolean;
}
