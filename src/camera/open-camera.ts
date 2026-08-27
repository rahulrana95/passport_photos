import { cameraFailure, cameraFailureFrom } from './camera-failure.utils';
import { buildCameraConstraints } from './camera-constraints.utils';
import type { OpenCameraOptions, OpenCameraResult } from './media-devices.types';

/**
 * Opens a camera, or explains why it could not.
 *
 * Never throws. A camera is the one part of this product that depends on
 * hardware, permission and protocol all at once, and every one of those fails
 * routinely and for reasons the reader can act on. Turning that into a rejected
 * promise would push the same five-way decision onto every caller.
 *
 * The two checks before getUserMedia are not defensive padding. Reaching for
 * `navigator.mediaDevices` when it is absent throws a TypeError, which carries
 * no name worth mapping, and the reader would be told "something went wrong"
 * when the truthful answer is either "this page is not on https" or "this
 * browser cannot do it".
 */
export const openCamera = async (options: OpenCameraOptions): Promise<OpenCameraResult> => {
  const { environment } = options;

  if (environment.mediaDevices === undefined) {
    // Order matters. Safari withholds the whole API over plain http, so an
    // insecure context looks exactly like an unsupported browser — and the
    // remedies could not be further apart.
    return {
      ok: false,
      failure: cameraFailure(environment.isSecureContext ? 'unsupported' : 'insecure-context'),
    };
  }

  try {
    const stream = await environment.mediaDevices.getUserMedia(
      buildCameraConstraints({
        ...(options.facing === undefined ? {} : { facing: options.facing }),
        ...(options.deviceId === undefined ? {} : { deviceId: options.deviceId }),
      }),
    );

    return { ok: true, stream };
  } catch (error) {
    return { ok: false, failure: cameraFailureFrom(error) };
  }
};

/**
 * Stops every track on a stream.
 *
 * This is not tidiness. A track left running keeps the camera indicator lit
 * after the reader has moved on, and on a product that promises the photograph
 * never leaves the device, a light that stays on IS the accusation. It is also
 * why this takes a stream rather than living inside a component: it has to be
 * callable from an unmount path that may run after everything else is gone.
 */
export const stopStream = (stream: MediaStream | undefined): void => {
  if (stream === undefined) return;

  for (const track of stream.getTracks()) track.stop();
};
