import type { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { selectFace } from './landmark-selection.utils';
import {
  FACE_LANDMARKER_MODEL_PATH,
  WASM_BASE_PATH,
} from './model-source.constants';
import type { PixelBuffer } from '@/testing/fixtures/synthetic-head.types';
import type { Detector, LandmarkResult, SegmentationResult } from './analysis-protocol.types';
import type { FaceCandidate } from './landmark-selection.utils';

/**
 * The MediaPipe modules, injected rather than imported directly.
 *
 * Importing @mediapipe/tasks-vision at module scope pulls its bundle into
 * whatever chunk touches this file. Taking it as a parameter keeps the import
 * inside the caller's dynamic import, which is what holds the 15 MB out of
 * everything except an analysis that is actually running.
 */
export interface MediaPipeModules {
  readonly FilesetResolver: typeof FilesetResolver;
  readonly FaceLandmarker: typeof FaceLandmarker;
}

/**
 * Two faces, not one.
 *
 * Asking for one would make the model pick, and it picks by confidence rather
 * than by size — so a sharply-focused bystander can beat the subject. Asking
 * for two lets selectFace choose the largest and, just as importantly, say
 * that there was someone else in the frame.
 */
const MAX_FACES_TO_DETECT = 2;

/** Landmarks are the whole point; blendshapes drive the expression rules. */
const LANDMARKER_OPTIONS = {
  runningMode: 'IMAGE',
  numFaces: MAX_FACES_TO_DETECT,
  outputFaceBlendshapes: true,
  outputFacialTransformationMatrixes: true,
} as const;

const HALF_TURN_DEGREES = 180;
const DEGREES_PER_RADIAN = HALF_TURN_DEGREES / Math.PI;
const MATRIX_STRIDE = 4;
/** Row and column indices, named so the reads say which axis they are about. */
const ROW_X = 0;
const ROW_Y = 1;
const ROW_Z = 2;
const COLUMN_X = 0;
const COLUMN_Z = 2;
const NO_ANGLE = 0;
/** An element outside the matrix reads as zero, so a short matrix is no rotation. */
const MISSING_ELEMENT = 0;
const DEFAULT_CONFIDENCE = 0.9;

/**
 * Element (row, column) of a column-major 4x4.
 *
 * Written as a function rather than as four named index constants, because
 * the constants are where this went wrong the first time: in a column-major
 * array element (0,1) is at index 4 and element (2,0) is at index 2, and the
 * row-major intuition puts them at 1 and 8. Both are plausible numbers, and
 * both produce a matrix that still looks like a rotation — the error surfaces
 * only as a head reported as tilted when it is turned.
 */
const at = (matrix: readonly number[], row: number, column: number): number =>
  matrix[column * MATRIX_STRIDE + row] ?? MISSING_ELEMENT;

/**
 * Collapses negative zero, which atan2 produces for a perfectly straight head.
 *
 * Arithmetically identical to zero and not identical on screen: these angles
 * are formatted into the guidance the user reads, and "tilted -0°" reads as a
 * broken tool rather than a straight head.
 */
const withoutNegativeZero = (angle: number): number => (angle === 0 ? NO_ANGLE : angle);

/**
 * Recovers roll and yaw from the 4x4 facial transformation matrix.
 *
 * MediaPipe reports the pose as a matrix; the rules that matter — head
 * tilted, head turned — are written in degrees, and signed, because "turned
 * left" and "turned right" are different failures and the user needs to be
 * told which way to move.
 */
export const poseFromMatrix = (
  matrix: readonly number[],
): { rollDegrees: number; yawDegrees: number } => {
  // No length guard. A missing element reads as zero, and an absent or short
  // matrix therefore falls out as no rotation at all — which is the answer a
  // separate guard would have returned anyway, through one mechanism instead
  // of two.
  const xAxisX = at(matrix, ROW_X, COLUMN_X);
  const xAxisY = at(matrix, ROW_Y, COLUMN_X);
  const xAxisZ = at(matrix, ROW_Z, COLUMN_X);
  const zAxisZ = at(matrix, ROW_Z, COLUMN_Z);

  return {
    rollDegrees: withoutNegativeZero(Math.atan2(xAxisY, xAxisX) * DEGREES_PER_RADIAN),
    yawDegrees: withoutNegativeZero(Math.atan2(-xAxisZ, zAxisZ) * DEGREES_PER_RADIAN),
  };
};

const toImageData = (buffer: PixelBuffer): ImageData =>
  new ImageData(buffer.data, buffer.width, buffer.height);

/**
 * Builds the real detector.
 *
 * GPU first, CPU second, and the fallback is not optional: WebGL is disabled
 * outright in some hardened and enterprise browsers, and an analysis that
 * simply never completes there is indistinguishable from a broken product.
 * The CPU path is slower and produces identical numbers.
 */
export const createMediaPipeDetector = async (
  modules: MediaPipeModules,
): Promise<Detector> => {
  const fileset = await modules.FilesetResolver.forVisionTasks(WASM_BASE_PATH);

  const build = async (delegate: 'GPU' | 'CPU'): Promise<FaceLandmarker> =>
    modules.FaceLandmarker.createFromOptions(fileset, {
      ...LANDMARKER_OPTIONS,
      baseOptions: { modelAssetPath: FACE_LANDMARKER_MODEL_PATH, delegate },
    });

  const landmarker = await build('GPU').catch(async () => build('CPU'));

  return {
    detectLandmarks: (buffer: PixelBuffer): Promise<LandmarkResult | undefined> => {
      const result = landmarker.detect(toImageData(buffer));

      const candidates: FaceCandidate[] = result.faceLandmarks.map((points, index) => ({
        points: points.map((point) => ({ x: point.x, y: point.y })),
        confidence: DEFAULT_CONFIDENCE,
        ...poseFromMatrix(result.facialTransformationMatrixes[index]?.data ?? []),
      }));

      const selection = selectFace(candidates);
      if (!selection.ok) return Promise.resolve(undefined);

      const blendshapes = Object.fromEntries(
        (result.faceBlendshapes[0]?.categories ?? []).map((category) => [
          category.categoryName,
          category.score,
        ]),
      );

      return Promise.resolve({
        points: selection.face.points,
        confidence: selection.face.confidence,
        rollDegrees: selection.face.rollDegrees,
        yawDegrees: selection.face.yawDegrees,
        blendshapes,
      });
    },

    segment: (): Promise<SegmentationResult | undefined> =>
      // Person segmentation is its own model and its own PR (#18). Reporting
      // nothing is honest; the geometry that depends only on landmarks still
      // works, and crown height degrades to unmeasurable rather than wrong.
      Promise.resolve(undefined),
  };
};
