import {
  MAX_HEAD_ROLL_DEGREES,
  MAX_HEAD_YAW_DEGREES,
} from '@/constants/measurement.constants';
import { MIN_FACE_DETECTION_CONFIDENCE_RATIO } from '@/constants/analysis.constants';
import { millimetresToPixels } from '@/measurement/format-measurement.utils';
import { planRawCrop } from '@/geometry/crop-geometry.utils';
import { rollFromEyes } from '@/geometry/roll.utils';
import type { ResolvedPhotoSpec } from '@/photo-spec/photo-spec.types';
import type { SubjectGeometry } from '@/geometry/geometry.types';
import {
  LIVE_RESOLUTION_MARGIN,
  MAX_CROP_FRAME_OCCUPANCY,
  MIN_GUIDANCE_LUMINANCE,
} from './guidance.constants';
import type { GuidanceId, LiveGuidance } from './guidance.types';
import { exportDpi } from '@/photo-spec/photo-spec.utils';

export interface LiveObservation {
  /** Undefined when this frame contained no face the detector would vouch for. */
  readonly subject: SubjectGeometry | undefined;
  readonly faceConfidence: number;
  readonly faceCount: number;
  readonly yawDegrees: number;
  /** Mean luminance of the frame, 0–255. */
  readonly meanLuminance: number;
  /** Undefined until segmentation has produced a mask to judge the wall by. */
  readonly backgroundUniform: boolean | undefined;
}

/**
 * A frame, turned into the one thing to say about it.
 *
 * Every threshold here is imported, not chosen. The still pipeline already
 * decides what counts as level, as confident, as enough pixels — and guidance
 * that used its own numbers would walk somebody into a photograph the analyser
 * then rejects, having told them it was fine.
 *
 * WHERE THE CROP GOES IS NOT RE-DERIVED EITHER. planRawCrop is the same call
 * the still pipeline makes, so "hold there" means the crop the analyser will
 * plan is the crop being previewed.
 *
 * Directions are relative to the reader's body, not to the picture. Both
 * cameras face the subject, so somebody's left is always the image's right —
 * which means the mapping does not depend on which camera is open, and does
 * not depend on whether the preview is mirrored. The preview is mirrored for
 * legibility and that changes nothing here: on a mirrored preview a step to
 * your left moves your image to the left of the screen, which is exactly what
 * "move left" should look like.
 *
 * Vertical corrections name the camera instead. Nobody crouches to frame a
 * selfie; they move the phone, and "raise the camera" is a thing a person can
 * do without working out which way that pushes their head in the frame.
 */
export const deriveGuidance = (
  observation: LiveObservation,
  spec: ResolvedPhotoSpec,
): LiveGuidance => {
  const unmet: GuidanceId[] = [];

  const add = (id: GuidanceId): void => {
    unmet.push(id);
  };

  // Light first, and before anything is read off the detector. A landmark
  // model in a dark room returns points and a confidence, both wrong.
  if (observation.meanLuminance < MIN_GUIDANCE_LUMINANCE) add('too-dark');

  if (observation.faceCount > 1) add('many-faces');

  const { subject } = observation;
  if (subject === undefined || observation.faceConfidence < MIN_FACE_DETECTION_CONFIDENCE_RATIO) {
    return finish([...unmet, 'no-face'], undefined);
  }

  const headFrameRatio =
    subject.crownY === undefined
      ? undefined
      : (subject.chin.y - subject.crownY) / subject.sourceHeightPx;

  const attempt = planRawCrop(subject, spec);

  if (!attempt.ok) {
    // 'degenerate-geometry' means the crown and chin came back a handful of
    // pixels apart, which is not a small head — it is a bad frame. Saying
    // "move closer" would be a guess dressed as an instruction.
    add(
      attempt.reason === 'crown-unmeasured'
        ? 'crown-hidden'
        : attempt.reason === 'head-not-in-frame'
          ? 'head-cut-off'
          : 'no-face',
    );
    return finish(unmet, headFrameRatio);
  }

  const { crop } = attempt.plan;
  const frameWidthPx = subject.sourceWidthPx;
  const frameHeightPx = subject.sourceHeightPx;

  // Distance before position. Somebody at the wrong distance who is told to
  // move left will move left and still be at the wrong distance, and will have
  // to be corrected twice.
  const tooBig =
    crop.heightPx > frameHeightPx * MAX_CROP_FRAME_OCCUPANCY ||
    crop.widthPx > frameWidthPx * MAX_CROP_FRAME_OCCUPANCY;

  const requiredHeightPx = millimetresToPixels(spec.print.heightMm, exportDpi(spec.print));
  const tooSmall = crop.heightPx < requiredHeightPx * LIVE_RESOLUTION_MARGIN;

  if (tooBig) add('move-back');
  else if (tooSmall) add('move-closer');
  else {
    // Only once the crop is the right SIZE does its position mean anything: a
    // crop larger than the frame overflows on every side at once, and picking
    // a direction from that would send somebody sideways when they should
    // step back.
    if (crop.x < 0) add('move-left');
    else if (crop.x + crop.widthPx > frameWidthPx) add('move-right');

    if (crop.y < 0) add('raise-camera');
    else if (crop.y + crop.heightPx > frameHeightPx) add('lower-camera');
  }

  if (Math.abs(rollFromEyes(subject.leftEye, subject.rightEye)) > MAX_HEAD_ROLL_DEGREES) {
    add('level-head');
  }

  if (Math.abs(observation.yawDegrees) > MAX_HEAD_YAW_DEGREES) add('face-camera');

  if (observation.backgroundUniform === false) add('plain-background');

  return finish(unmet, headFrameRatio);
};

/**
 * Picks the instruction and reports the rest.
 *
 * Separated only so every early return goes through one place — an exit that
 * forgot to compute `ready` would render a green tick over a frame with a
 * chin missing from it.
 */
const finish = (
  unmet: readonly GuidanceId[],
  headFrameRatio: number | undefined,
): LiveGuidance => ({
  primary: unmet[0] ?? 'ready',
  unmet,
  ready: unmet.length === 0,
  headFrameRatio,
});
