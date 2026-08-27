import {
  MIN_CROWN_CONFIDENCE_RATIO,
  MIN_FACE_DETECTION_CONFIDENCE_RATIO,
  MIN_SEGMENTATION_CONFIDENCE_RATIO,
} from '@/constants/analysis.constants';
import type { EvidenceSource } from './rule-id.constants';

/**
 * Thresholds the rules compare against, gathered so tuning is one diff.
 *
 * Values that a specification already states — head height, eye line,
 * background colour — are NOT here. Those come from the spec registry, because
 * they differ by country and a constant would quietly override the authority
 * we are supposed to be reporting.
 */

/**
 * Fewest pixels permitted between the eye centres in the exported photo.
 *
 * The long-standing recommendation for machine-readable travel document
 * portraits. Below it the face carries too little detail for the border
 * system that will eventually read it, whatever the print size says.
 */
export const MIN_INTER_OCULAR_PX = 90;

/**
 * How far the face midline may sit from the centre of the crop, as a share of
 * the crop's width.
 *
 * Only ever non-zero for a photo that was already cropped when it reached us —
 * a crop we plan is centred by construction.
 */
export const MAX_HORIZONTAL_OFFSET_RATIO = 0.05;

/**
 * Below this confidence a rule stops reporting a verdict and asks the reader
 * to check for themselves.
 *
 * Per evidence source, because the sources fail differently. A landmark model
 * that is unsure has usually found something face-shaped that is not a face; a
 * crown estimate that is unsure has usually found a head covering it cannot
 * see through. 'pixels' has no floor at all — arithmetic over an image is not
 * a thing that can be unconfident — and 'none' is a rule that never had
 * evidence to be confident about.
 */
export const CONFIDENCE_FLOOR_BY_EVIDENCE: Readonly<Record<EvidenceSource, number | undefined>> = {
  landmarks: MIN_FACE_DETECTION_CONFIDENCE_RATIO,
  crown: MIN_CROWN_CONFIDENCE_RATIO,
  segmentation: MIN_SEGMENTATION_CONFIDENCE_RATIO,
  pixels: undefined,
  none: undefined,
};

/**
 * Blendshape names read for each expression rule.
 *
 * Lists rather than single names, and the highest score wins: MediaPipe splits
 * several of these left and right, and a person can perfectly well have one
 * eye closed. Taking the maximum means half a blink is still a blink.
 */
export const BLINK_BLENDSHAPES = ['eyeBlinkLeft', 'eyeBlinkRight'] as const;
export const MOUTH_OPEN_BLENDSHAPES = ['jawOpen', 'mouthOpen'] as const;
export const SMILE_BLENDSHAPES = ['mouthSmile', 'mouthSmileLeft', 'mouthSmileRight'] as const;
