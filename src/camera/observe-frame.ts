import {
  CHIN_POINT_INDEX,
  LEFT_EYE_POINT_INDEX,
  REQUIRED_LANDMARK_POINTS,
  RIGHT_EYE_POINT_INDEX,
} from '@/analysis/landmark-points.constants';
import { estimateCrown } from '@/analysis/crown-detection.utils';
import { evaluateBackground } from '@/quality/background.utils';
import { summariseTones } from '@/quality/luminance.utils';
import { HALF } from '@/measurement/angle.constants';
import type { AnalysisResult } from '@/analysis/analysis-protocol.types';
import type { PixelBuffer } from '@/testing/fixtures/synthetic-head.types';
import type { ResolvedPhotoSpec } from '@/photo-spec/photo-spec.types';
import type { SourcePoint, SubjectGeometry } from '@/geometry/geometry.types';
import type { LiveObservation } from './guidance/derive-guidance';

/** A mask value at or above this counts as subject rather than background. */
const SUBJECT_THRESHOLD = 128;

export interface ObserveFrameOptions {
  readonly result: AnalysisResult;
  readonly frame: PixelBuffer;
  /**
   * Carries the crown definition too. It used to be a separate option, which
   * meant a caller could pair one authority's specification with another's
   * idea of where the top of the head is — a mismatch of several millimetres
   * on anyone with volume, and most of the tolerance on a head-height rule.
   */
  readonly spec: ResolvedPhotoSpec;
}

/**
 * Turns one analysed frame into the handful of numbers guidance reads.
 *
 * The seam between "what the models said" and "what to tell the reader". It
 * exists so the guidance engine never sees a mask or a blendshape: guidance is
 * a decision about a person, and a decision that took a Uint8ClampedArray as
 * an argument could not be tested without generating one.
 *
 * Every measurement is optional-by-construction rather than defaulted. A
 * segmentation that has not arrived yet reports an unjudged background, not a
 * plain one — the difference being that the first says nothing and the second
 * flashes "stand against a plain wall" at somebody who already is.
 */
/**
 * Whether the wall behind the subject is plain, when that can be established.
 *
 * The mask is indexed by FRAME pixel, so a mask of a different size than the
 * frame cannot be read this way at all — index n would name a different pixel
 * in each. That is not a hypothetical: a detector free to segment at its own
 * working resolution would produce exactly that, and the result would be a
 * background verdict computed from a scrambled selection of pixels, delivered
 * with complete confidence.
 *
 * So a mismatch reports "not judged" rather than a number. Saying nothing is
 * always available and always honest.
 */
const judgeBackground = (
  frame: PixelBuffer,
  segmentation: AnalysisResult['segmentation'],
  spec: ResolvedPhotoSpec,
): boolean | undefined => {
  if (segmentation === undefined) return undefined;
  if (segmentation.width !== frame.width || segmentation.height !== frame.height) return undefined;

  return evaluateBackground(
    frame,
    (index) => Number(segmentation.mask[index]) < SUBJECT_THRESHOLD,
    spec.background,
  ).isUniform;
};

export const observeFrame = (options: ObserveFrameOptions): LiveObservation => {
  const { result, frame, spec } = options;

  const meanLuminance = summariseTones(frame, () => true).mean;
  const { landmarks, segmentation } = result;

  if (landmarks === undefined || landmarks.points.length < REQUIRED_LANDMARK_POINTS) {
    return {
      subject: undefined,
      faceConfidence: 0,
      faceCount: 0,
      yawDegrees: 0,
      meanLuminance,
      backgroundUniform: undefined,
    };
  }

  const toFrame = (index: number): SourcePoint => {
    // Read through Number rather than defaulted: the length was checked above,
    // and a `?? 0` here would be a branch no input can reach.
    const point = landmarks.points[index] as { readonly x: number; readonly y: number };
    return { x: point.x * frame.width, y: point.y * frame.height };
  };

  const chin = toFrame(CHIN_POINT_INDEX);
  const leftEye = toFrame(LEFT_EYE_POINT_INDEX);
  const rightEye = toFrame(RIGHT_EYE_POINT_INDEX);

  // The inter-ocular distance stands in for head width, which is what the
  // crown estimator needs to know how wide a component to accept. Landmarks
  // stop at the hairline and never describe the outline of the hair.
  const interOcularPx = Math.abs(rightEye.x - leftEye.x);
  const crown =
    segmentation === undefined
      ? undefined
      : estimateCrown(
          {
            width: segmentation.width,
            height: segmentation.height,
            data: segmentation.mask,
          },
          {
            faceCentreX: (leftEye.x + rightEye.x) / HALF,
            faceCentreY: (leftEye.y + rightEye.y) / HALF,
            definition: spec.crownDefinition,
            headWidthPx: interOcularPx * HALF,
          },
        );

  const subject: SubjectGeometry = {
    chin,
    leftEye,
    rightEye,
    crownY: crown?.ok === true ? crown.crownY : undefined,
    sourceWidthPx: frame.width,
    sourceHeightPx: frame.height,
  };

  return {
    subject,
    faceConfidence: landmarks.confidence,
    faceCount: 1,
    yawDegrees: landmarks.yawDegrees,
    meanLuminance,
    backgroundUniform: judgeBackground(frame, segmentation, spec),
  };
};
