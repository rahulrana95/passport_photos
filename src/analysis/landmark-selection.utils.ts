import type { LandmarkPoint } from './analysis-protocol.types';

/**
 * Minimum share of the frame's height a face must span to be measured.
 *
 * Below this the landmarks are a handful of pixels apart, and a one-pixel
 * error becomes several millimetres of head height — larger than the tolerance
 * any specification allows. Reporting a confident answer from that data would
 * be the worst thing this product could do.
 */
export const MIN_FACE_HEIGHT_RATIO = 0.15;

/**
 * How close to the frame edge a face may sit before its extent is in doubt.
 *
 * A face touching the edge is usually a face partly outside it, and the
 * landmarks on that side are extrapolated rather than observed.
 */
export const FRAME_EDGE_MARGIN_RATIO = 0.01;

/**
 * Pose beyond which landmark depth is unreliable.
 *
 * Every specification requires a full-face view, so these are generous: the
 * point is to stop measuring, not to enforce the rule, which the rule engine
 * does with its own thresholds and its own wording.
 */
export const MAX_RELIABLE_YAW_DEGREES = 35;
export const MAX_RELIABLE_ROLL_DEGREES = 35;

export interface FaceCandidate {
  readonly points: readonly LandmarkPoint[];
  readonly confidence: number;
  readonly yawDegrees: number;
  readonly rollDegrees: number;
  readonly pitchDegrees: number;
}

export const FACE_REJECTION_REASONS = [
  'no-face',
  'too-small',
  'touches-frame-edge',
  'pose-unreliable',
] as const;

export type FaceRejectionReason = (typeof FACE_REJECTION_REASONS)[number];

export type FaceSelection =
  | {
      readonly ok: true;
      readonly face: FaceCandidate;
      /** True when other faces were present and this one was chosen by size. */
      readonly hadOtherFaces: boolean;
    }
  | { readonly ok: false; readonly reason: FaceRejectionReason };

const boundsOf = (
  points: readonly LandmarkPoint[],
): { minX: number; maxX: number; minY: number; maxY: number } => {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
};

/** Normalised area of a candidate's bounding box, used only to rank faces. */
export const faceArea = (candidate: FaceCandidate): number => {
  if (candidate.points.length === 0) return 0;

  const bounds = boundsOf(candidate.points);
  return (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY);
};

/**
 * Chooses which face to measure, or declines to measure at all.
 *
 * The largest face wins when there are several, and the caller is told that
 * happened so it can say so. Silently measuring one of two faces is the
 * failure mode that produces a confident, wrong answer about the wrong person
 * — the user sees a green tick and finds out at the passport office.
 */
export const selectFace = (candidates: readonly FaceCandidate[]): FaceSelection => {
  const usable = candidates.filter((candidate) => candidate.points.length > 0);
  if (usable.length === 0) return { ok: false, reason: 'no-face' };

  const [largest, ...rest] = [...usable].sort((a, b) => faceArea(b) - faceArea(a)) as [
    FaceCandidate,
    ...FaceCandidate[],
  ];

  const bounds = boundsOf(largest.points);

  if (bounds.maxY - bounds.minY < MIN_FACE_HEIGHT_RATIO) {
    return { ok: false, reason: 'too-small' };
  }

  const margin = FRAME_EDGE_MARGIN_RATIO;
  if (
    bounds.minX <= margin ||
    bounds.minY <= margin ||
    bounds.maxX >= 1 - margin ||
    bounds.maxY >= 1 - margin
  ) {
    return { ok: false, reason: 'touches-frame-edge' };
  }

  if (
    Math.abs(largest.yawDegrees) > MAX_RELIABLE_YAW_DEGREES ||
    Math.abs(largest.rollDegrees) > MAX_RELIABLE_ROLL_DEGREES
  ) {
    return { ok: false, reason: 'pose-unreliable' };
  }

  return { ok: true, face: largest, hadOtherFaces: rest.length > 0 };
};
