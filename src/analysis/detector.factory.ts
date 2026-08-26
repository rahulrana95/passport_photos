import { AnalysisError } from './analysis-error.utils';
import { importMediaPipe } from './mediapipe-module.loader';
import { createMediaPipeDetector } from './mediapipe-detector';
import type { Detector } from './analysis-protocol.types';
import type { MediaPipeModules } from './mediapipe-detector';

/**
 * Loads the MediaPipe bundle only when a detector is actually built.
 *
 * A dynamic import, and that is the whole point: a static one would pull the
 * bundle into whatever chunk imports this file, and the 15 MB behind it would
 * then sit on the critical path of every country page carrying our search
 * traffic. Nothing here loads until someone chooses a photo.
 */
export type LoadMediaPipe = () => Promise<MediaPipeModules>;

/**
 * A detector that reports itself unavailable on every call.
 *
 * Returned rather than thrown when the runtime cannot start, so the failure
 * arrives through the normal protocol path. Throwing here would take the
 * worker down with it and every request would surface as `worker-crashed` —
 * the wrong diagnosis, and one that sends the next person to read the message
 * plumbing instead of find the missing model.
 */
export const createUnavailableDetector = (message: string): Detector => {
  const unavailable = (): Promise<never> =>
    Promise.reject(new AnalysisError('detector-unavailable', message));

  return { detectLandmarks: unavailable, segment: unavailable };
};

export const createDetector = async (load: LoadMediaPipe = importMediaPipe): Promise<Detector> => {
  try {
    return await createMediaPipeDetector(await load());
  } catch {
    return createUnavailableDetector(
      'The face-detection engine could not start in this browser. Checks cannot run here.',
    );
  }
};
