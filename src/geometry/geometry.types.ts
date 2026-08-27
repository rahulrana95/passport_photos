import type { BandEvaluation } from '@/measurement/band.types';

/** A point in source-image pixels, after orientation has been applied. */
export interface SourcePoint {
  readonly x: number;
  readonly y: number;
}

/**
 * Everything the geometry engine needs about the subject, in source pixels.
 *
 * Source pixels, not the working copy's. The crop this produces is applied to
 * the full-resolution original the user downloads, so a coordinate measured on
 * a 1600px working copy and used unscaled would crop the wrong part of a 4032px
 * photograph.
 */
export interface SubjectGeometry {
  /** Bottom of the chin. */
  readonly chin: SourcePoint;
  readonly leftEye: SourcePoint;
  readonly rightEye: SourcePoint;
  /** Row of the top of the head, when segmentation could measure one. */
  readonly crownY: number | undefined;
  readonly sourceWidthPx: number;
  readonly sourceHeightPx: number;
}

export interface CropRect {
  readonly x: number;
  readonly y: number;
  readonly widthPx: number;
  readonly heightPx: number;
}

export const CROP_FAILURE_REASONS = [
  'crown-unmeasured',
  'head-not-in-frame',
  'crop-outside-source',
  'source-resolution-too-low',
  'degenerate-geometry',
] as const;

export type CropFailureReason = (typeof CROP_FAILURE_REASONS)[number];

/**
 * What the engine measured, in the units a specification is written in.
 *
 * Every value is raw. Rounding happens at the point of display and nowhere
 * else, so a measurement cannot be nudged across a band edge by being formatted
 * on the way through.
 */
export interface GeometryMeasurements {
  /** Crown to chin, in millimetres once printed at the spec's size. */
  readonly headHeightMm: number;
  readonly headHeight: BandEvaluation;
  /** Eye line above the bottom of the printed photo, in millimetres. */
  readonly eyeLineFromBottomMm: number | undefined;
  readonly eyeLine: BandEvaluation | undefined;
  /**
   * How far the face midline sits from the crop's centre, as a share of the
   * crop's width. Signed: negative is left of centre.
   */
  readonly horizontalOffsetRatio: number;
  /** Roll from the inter-ocular line, in degrees. Signed. */
  readonly rollDegrees: number;
}

export type GeometryResult =
  | {
      readonly ok: true;
      readonly crop: CropRect;
      readonly measurements: GeometryMeasurements;
    }
  | { readonly ok: false; readonly reason: CropFailureReason };
