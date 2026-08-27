import {
  REQUESTED_CAPTURE_HEIGHT_PX,
  REQUESTED_CAPTURE_WIDTH_PX,
} from './camera-facing.constants';
import type { CameraFacing } from './camera-facing.constants';

export interface ConstraintRequest {
  readonly facing?: CameraFacing;
  readonly deviceId?: string;
}

/**
 * Builds the constraints a camera is opened with.
 *
 * Everything is `ideal`, never `exact`. An exact facingMode is the single most
 * common way a camera fails to open on a laptop: there is one webcam, it
 * reports no facing mode at all, and asking exactly for 'user' throws
 * OverconstrainedError on a device that would have worked perfectly.
 *
 * A pinned deviceId does use `exact`, and that is the one case where it is
 * right: the reader chose that camera from a list of cameras that exist, so
 * silently opening a different one would be worse than failing.
 *
 * Audio is off. Asking for a microphone to take a photograph would put a
 * recording indicator on the reader's screen for no reason, on a product whose
 * entire claim is that it is not watching them.
 */
export const buildCameraConstraints = (request: ConstraintRequest): MediaStreamConstraints => {
  const video: MediaTrackConstraints = {
    width: { ideal: REQUESTED_CAPTURE_WIDTH_PX },
    height: { ideal: REQUESTED_CAPTURE_HEIGHT_PX },
    ...(request.deviceId === undefined
      ? { facingMode: { ideal: request.facing ?? 'user' } }
      : { deviceId: { exact: request.deviceId } }),
  };

  return { video, audio: false };
};
