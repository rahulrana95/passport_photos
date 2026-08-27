/**
 * Why a camera could not be opened.
 *
 * Separated from the message the reader sees for the same reason ingestion
 * failures are: the words belong in the content module, and one code can need
 * two explanations depending on what the reader can actually do about it.
 *
 * Every one of these is recoverable by a different action, and a single
 * "camera unavailable" collapses them into an apology. Somebody who denied
 * permission by reflex needs to be told where the button is; somebody on a
 * desktop with no webcam needs to be told to use the file picker instead and
 * not to go hunting through settings.
 */
export const CAMERA_FAILURE_CODES = [
  'permission-denied',
  'no-camera',
  'camera-in-use',
  'insecure-context',
  'unsupported',
  'constraints-unsatisfiable',
  'dismissed',
  'unknown',
] as const;

export type CameraFailureCode = (typeof CAMERA_FAILURE_CODES)[number];

export interface CameraFailure {
  readonly code: CameraFailureCode;
  /**
   * The underlying DOMException name, when there was one.
   *
   * Kept for diagnosis only and never shown: browsers disagree about which
   * name they use for which condition, so this is the record of what we were
   * actually told rather than what we concluded.
   */
  readonly cause?: string;
}
