import { AnalysisError } from './analysis-error.utils';
import type { Detector } from './analysis-protocol.types';

/**
 * Builds the detector the worker runs on.
 *
 * The real MediaPipe backend arrives in PR #17. Until then this returns a
 * detector that reports itself unavailable rather than throwing at module
 * load: a factory that threw would kill the worker on startup, and every
 * request would then surface as `worker-crashed` — the wrong diagnosis, and
 * one that would send the next person looking at the message plumbing instead
 * of at the missing model.
 *
 * This is the single seam PR #17 replaces.
 */
export const createDetector = (): Detector => {
  const unavailable = (): Promise<never> =>
    Promise.reject(
      new AnalysisError(
        'detector-unavailable',
        'The analysis models are not available in this build.',
      ),
    );

  return { detectLandmarks: unavailable, segment: unavailable };
};
