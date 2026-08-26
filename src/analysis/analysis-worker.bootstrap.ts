import { createRequestHandler } from './analysis-worker.handlers';
import type { Detector } from './analysis-protocol.types';
import type { WorkerScope } from './analysis-client.types';

/**
 * Wires a detector to a worker scope.
 *
 * Separated from the worker entry file so it can be tested in jsdom, where no
 * worker global exists. The entry file is then a single call, which is the
 * only part of this that a unit test cannot reach.
 */
const awaitedDetector = (source: Detector | Promise<Detector>): Detector => ({
  detectLandmarks: async (buffer) => (await source).detectLandmarks(buffer),
  segment: async (buffer) => (await source).segment(buffer),
});

export const startAnalysisWorker = (
  scope: WorkerScope,
  detector: Detector | Promise<Detector>,
): void => {
  // The listener is attached synchronously and the detector awaited per
  // request. Awaiting it first would drop any message posted during the model
  // load — which is precisely when the first one arrives, because the load
  // only starts because someone chose a photo.
  const handle = createRequestHandler(awaitedDetector(detector), (response) => {
    scope.postMessage(response);
  });

  scope.addEventListener('message', (event) => {
    void handle(event.data);
  });
};
