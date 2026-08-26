import { AnalysisError } from './analysis-error.utils';
import type { WorkerCapableScope, WorkerLike } from './analysis-client.types';

/**
 * Constructs the real analysis worker.
 *
 * The URL form is what lets the bundler emit the worker as its own chunk, so
 * the models and the analysis code stay out of the first-paint bundle. That is
 * a hard requirement rather than an optimisation: every country page carries
 * the search traffic this product lives on, and none of them run an analysis
 * until someone chooses a photo.
 */
export const createBrowserWorker = (
  scope: WorkerCapableScope = globalThis as WorkerCapableScope,
): WorkerLike => {
  const constructor = scope.Worker;

  if (constructor === undefined) {
    throw new AnalysisError(
      'worker-unavailable',
      'This browser blocked the analysis engine from starting. Checks cannot run here.',
    );
  }

  return new constructor(new URL('./analysis.worker.ts', import.meta.url), { type: 'module' });
};
