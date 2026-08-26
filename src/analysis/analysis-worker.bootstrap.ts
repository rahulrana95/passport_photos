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
export const startAnalysisWorker = (scope: WorkerScope, detector: Detector): void => {
  const handle = createRequestHandler(detector, (response) => {
    scope.postMessage(response);
  });

  scope.addEventListener('message', (event) => {
    void handle(event.data);
  });
};
