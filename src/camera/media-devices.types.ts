import type { CameraFailure } from './camera-failure.types';
import type { CameraFacing } from './camera-facing.constants';

/**
 * The slice of the media API this product uses.
 *
 * Narrowed to an interface so tests inject a fake. jsdom implements none of
 * getUserMedia, and a suite that reaches for a real camera is a suite that
 * cannot run on CI, cannot run on a laptop with the lid shut, and asks the
 * person running it for permission.
 */
export interface MediaDevicesLike {
  getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream>;
}

/**
 * Everything about the host that decides whether a camera can open at all.
 *
 * `isSecureContext` is separate from the absence of `mediaDevices` because the
 * two are the same symptom with opposite remedies. Safari does not expose the
 * API over plain http at all, so a developer on http://192.168.x.x sees
 * precisely what a reader with no camera sees — and telling them to buy a
 * webcam would be wrong.
 */
export interface CameraEnvironment {
  readonly mediaDevices: MediaDevicesLike | undefined;
  readonly isSecureContext: boolean;
}

export interface OpenCameraOptions {
  readonly environment: CameraEnvironment;
  readonly facing?: CameraFacing;
  /** Pins a specific camera, from enumerateDevices. Overrides `facing`. */
  readonly deviceId?: string;
}

export type OpenCameraResult =
  | { readonly ok: true; readonly stream: MediaStream }
  | { readonly ok: false; readonly failure: CameraFailure };
